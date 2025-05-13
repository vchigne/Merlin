import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { executeQuery } from "@/lib/hasura-client";
import { PIPELINE_QUERY, PIPELINE_UNITS_QUERY } from "@shared/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { convertToFlowCoordinates } from "@/lib/utils";

export default function PipelineVisualization() {
  const [selectedPipeline, setSelectedPipeline] = useState<string | null>(null);
  
  // Fetch pipelines
  const { data: pipelinesData, isLoading: isPipelinesLoading } = useQuery({
    queryKey: ['/api/pipelines'],
    queryFn: async () => {
      const result = await executeQuery(PIPELINE_QUERY);
      if (result.errors) {
        throw new Error(result.errors[0].message);
      }
      return result.data.merlin_agent_Pipeline;
    },
  });
  
  // Set first pipeline as default when data loads
  useEffect(() => {
    if (pipelinesData && pipelinesData.length > 0 && !selectedPipeline) {
      setSelectedPipeline(pipelinesData[0].id);
    }
  }, [pipelinesData, selectedPipeline]);
  
  // Fetch pipeline units for the selected pipeline
  const { data: pipelineUnits, isLoading: isUnitsLoading } = useQuery({
    queryKey: ['/api/pipelines/units', selectedPipeline],
    queryFn: async () => {
      if (!selectedPipeline) return null;
      
      const result = await executeQuery(PIPELINE_UNITS_QUERY, { 
        pipelineId: selectedPipeline 
      });
      
      if (result.errors) {
        throw new Error(result.errors[0].message);
      }
      
      return result.data.merlin_agent_PipelineUnit;
    },
    enabled: !!selectedPipeline,
    staleTime: 30000,
  });
  
  const handlePipelineChange = (value: string) => {
    setSelectedPipeline(value);
  };
  
  // Determine node types for visualization
  const getUnitType = (unit: any) => {
    if (unit.command_id) return 'Command';
    if (unit.query_queue_id) return 'SQL Query';
    if (unit.sftp_downloader_id) return 'SFTP Download';
    if (unit.sftp_uploader_id) return 'SFTP Upload';
    if (unit.zip_id) return 'Zip Files';
    if (unit.unzip_id) return 'Unzip Files';
    if (unit.call_pipeline) return 'Call Pipeline';
    return 'Unit';
  };
  
  // Get status for visualization (mocked as we don't have real execution data)
  const getUnitStatus = (unit: any, index: number) => {
    // This is a placeholder. In a real app, you would determine status from the job execution data
    if (index === 0) return 'completed';
    if (index === 1) return 'completed';
    if (index === 2) return 'running';
    return 'pending';
  };
  
  // Loading state
  if (isPipelinesLoading) {
    return (
      <Card>
        <CardHeader className="border-b border-slate-200 dark:border-slate-700">
          <div className="flex justify-between items-center">
            <CardTitle>Active Pipeline Visualization</CardTitle>
            <Skeleton className="h-10 w-40" />
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="h-[300px] w-full flex items-center justify-center">
            <Skeleton className="h-full w-full rounded-lg" />
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // No pipelines state
  if (!pipelinesData || pipelinesData.length === 0) {
    return (
      <Card>
        <CardHeader className="border-b border-slate-200 dark:border-slate-700">
          <CardTitle>Active Pipeline Visualization</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="h-[300px] w-full flex items-center justify-center text-slate-500 dark:text-slate-400">
            No pipelines available
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader className="border-b border-slate-200 dark:border-slate-700">
        <div className="flex justify-between items-center">
          <CardTitle>Active Pipeline Visualization</CardTitle>
          <Select value={selectedPipeline || undefined} onValueChange={handlePipelineChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select pipeline" />
            </SelectTrigger>
            <SelectContent>
              {pipelinesData.map((pipeline: any) => (
                <SelectItem key={pipeline.id} value={pipeline.id}>
                  {pipeline.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="relative w-full h-[300px]">
          {isUnitsLoading ? (
            <div className="flex items-center justify-center h-full">
              <Skeleton className="h-full w-full rounded-lg" />
            </div>
          ) : !pipelineUnits || pipelineUnits.length === 0 ? (
            <div className="flex items-center justify-center h-full text-slate-500 dark:text-slate-400">
              No units defined for this pipeline
            </div>
          ) : (
            <div className="relative w-full h-full">
              {/* A simplified representation of pipeline flow */}
              {pipelineUnits.map((unit: any, index: number) => {
                const unitType = getUnitType(unit);
                const status = getUnitStatus(unit, index);
                const xPos = unit.posx ? unit.posx * 180 + 10 : index * 180 + 10;
                const yPos = unit.posy ? unit.posy * 100 + 10 : Math.floor(index / 4) * 100 + 10;
                
                return (
                  <div 
                    key={unit.id}
                    className={`absolute w-40 h-16 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg p-3 shadow-sm ${status === 'pending' ? 'opacity-50' : ''}`}
                    style={{ top: `${yPos}px`, left: `${xPos}px` }}
                  >
                    <div className="text-sm font-medium dark:text-white truncate">
                      {unitType}
                    </div>
                    <div className="flex mt-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        status === 'completed' ? 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400' :
                        status === 'running' ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400' :
                        'bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-300'
                      }`}>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </span>
                    </div>
                  </div>
                );
              })}
              
              {/* Draw connection lines between units */}
              {pipelineUnits.map((unit: any) => {
                if (!unit.pipeline_unit_id) return null;
                
                const parentUnit = pipelineUnits.find((u: any) => u.id === unit.pipeline_unit_id);
                if (!parentUnit) return null;
                
                const parentX = parentUnit.posx ? parentUnit.posx * 180 + 50 : 0;
                const parentY = parentUnit.posy ? parentUnit.posy * 100 + 50 : 0;
                const childX = unit.posx ? unit.posx * 180 + 50 : 0;
                const childY = unit.posy ? unit.posy * 100 + 50 : 0;
                
                // Simple horizontal or vertical line
                const isHorizontal = Math.abs(childY - parentY) < Math.abs(childX - parentX);
                
                return isHorizontal ? (
                  <svg 
                    key={`edge-${unit.id}`}
                    className="absolute" 
                    style={{ 
                      top: `${Math.min(parentY, childY) + 8}px`, 
                      left: `${Math.min(parentX, childX)}px`,
                      height: '2px',
                      width: `${Math.abs(childX - parentX)}px`
                    }}
                  >
                    <line 
                      x1={parentX < childX ? 0 : Math.abs(childX - parentX)} 
                      y1="1" 
                      x2={parentX < childX ? Math.abs(childX - parentX) : 0} 
                      y2="1" 
                      stroke="#6B7280" 
                      strokeWidth="2" 
                      strokeDasharray={getUnitStatus(unit, 0) === 'pending' ? "4 2" : ""}
                    />
                    <polygon 
                      points={parentX < childX ? 
                        `${Math.abs(childX - parentX)},1 ${Math.abs(childX - parentX) - 5},-4 ${Math.abs(childX - parentX) - 5},6` : 
                        `0,1 5,-4 5,6`} 
                      fill="#6B7280" 
                    />
                  </svg>
                ) : (
                  <svg 
                    key={`edge-${unit.id}`}
                    className="absolute" 
                    style={{ 
                      top: `${Math.min(parentY, childY)}px`, 
                      left: `${Math.min(parentX, childX) + 8}px`,
                      height: `${Math.abs(childY - parentY)}px`,
                      width: '2px'
                    }}
                  >
                    <line 
                      x1="1" 
                      y1={parentY < childY ? 0 : Math.abs(childY - parentY)} 
                      x2="1" 
                      y2={parentY < childY ? Math.abs(childY - parentY) : 0} 
                      stroke="#6B7280" 
                      strokeWidth="2" 
                      strokeDasharray={getUnitStatus(unit, 0) === 'pending' ? "4 2" : ""}
                    />
                    <polygon 
                      points={parentY < childY ? 
                        `1,${Math.abs(childY - parentY)} -4,${Math.abs(childY - parentY) - 5} 6,${Math.abs(childY - parentY) - 5}` : 
                        `1,0 -4,5 6,5`} 
                      fill="#6B7280" 
                    />
                  </svg>
                );
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
