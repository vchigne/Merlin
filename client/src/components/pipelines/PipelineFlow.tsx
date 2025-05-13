import { useEffect, useState } from "react";
import { convertToFlowCoordinates } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { 
  GitBranch, 
  Database, 
  FileUp, 
  FileDown, 
  Archive, 
  FileOutput, 
  Code, 
  Terminal, 
  AlertCircle 
} from "lucide-react";

interface PipelineFlowProps {
  pipelineUnits: any[];
  pipelineJobs?: any[];
  isLoading: boolean;
}

export default function PipelineFlow({ pipelineUnits, pipelineJobs, isLoading }: PipelineFlowProps) {
  const [flowElements, setFlowElements] = useState<{ nodes: any[]; edges: any[] }>({ nodes: [], edges: [] });

  useEffect(() => {
    if (pipelineUnits && pipelineUnits.length > 0) {
      setFlowElements(convertToFlowCoordinates(pipelineUnits));
    }
  }, [pipelineUnits]);

  // Get appropriate icon for unit type
  const getUnitIcon = (type: string) => {
    switch (type) {
      case 'command':
        return <Terminal className="h-4 w-4 text-purple-500" />;
      case 'query':
        return <Database className="h-4 w-4 text-blue-500" />;
      case 'sftp_download':
        return <FileDown className="h-4 w-4 text-green-500" />;
      case 'sftp_upload':
        return <FileUp className="h-4 w-4 text-orange-500" />;
      case 'zip':
        return <Archive className="h-4 w-4 text-amber-500" />;
      case 'unzip':
        return <FileOutput className="h-4 w-4 text-indigo-500" />;
      case 'pipeline':
        return <GitBranch className="h-4 w-4 text-pink-500" />;
      default:
        return <Code className="h-4 w-4 text-slate-500" />;
    }
  };

  // Get unit status from job data (if available)
  const getUnitStatus = (unitId: string) => {
    if (!pipelineJobs || pipelineJobs.length === 0) return 'pending';
    
    // Find the most recent job
    const recentJob = pipelineJobs[0];
    
    // Find log entry for this unit
    const logEntry = recentJob.PipelineJobLogs?.find((log: any) => log.pipeline_unit_id === unitId);
    
    if (!logEntry) return 'pending';
    
    if (logEntry.errors) return 'error';
    if (recentJob.completed) return 'completed';
    if (recentJob.running) return 'running';
    
    return 'pending';
  };

  // Loading state
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pipeline Flow</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="h-[400px] w-full flex items-center justify-center">
            <Skeleton className="h-full w-full rounded-lg" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Empty state
  if (!pipelineUnits || pipelineUnits.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pipeline Flow</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="h-[300px] w-full flex flex-col items-center justify-center text-slate-500 dark:text-slate-400">
            <AlertCircle className="h-16 w-16 mb-4 text-slate-300 dark:text-slate-600" />
            <p>No pipeline units defined</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pipeline Flow</CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="relative h-[500px] w-full overflow-auto bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4">
          {/* Draw nodes */}
          {flowElements.nodes.map((node) => {
            const unitType = node.data.type;
            const status = getUnitStatus(node.id);
            
            return (
              <div 
                key={node.id}
                className={`absolute w-48 pipeline-node ${status}`}
                style={{ top: `${node.position.y}px`, left: `${node.position.x}px` }}
              >
                <div className="flex items-center space-x-2">
                  {getUnitIcon(unitType)}
                  <div className="text-sm font-medium dark:text-white truncate">
                    {node.data.label || unitType.charAt(0).toUpperCase() + unitType.slice(1)}
                  </div>
                </div>
                <div className="flex mt-2">
                  <Badge variant="outline" className={`text-xs ${
                    status === 'completed' ? 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400' :
                    status === 'running' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 animate-pulse' :
                    status === 'error' ? 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400' :
                    'bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                  }`}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </Badge>
                </div>
              </div>
            );
          })}
          
          {/* Draw edges */}
          {flowElements.edges.map((edge) => {
            const sourceNode = flowElements.nodes.find(n => n.id === edge.source);
            const targetNode = flowElements.nodes.find(n => n.id === edge.target);
            
            if (!sourceNode || !targetNode) return null;
            
            const sourceStatus = getUnitStatus(sourceNode.id);
            const targetStatus = getUnitStatus(targetNode.id);
            
            // Calculate line coordinates
            const sourceX = sourceNode.position.x + 24;
            const sourceY = sourceNode.position.y + 24;
            const targetX = targetNode.position.x + 24;
            const targetY = targetNode.position.y + 24;
            
            // Calculate distance and angle
            const dx = targetX - sourceX;
            const dy = targetY - sourceY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const angle = Math.atan2(dy, dx) * 180 / Math.PI;
            
            // Determine active state for styling
            const isActive = sourceStatus === 'completed' && 
                            (targetStatus === 'running' || targetStatus === 'completed');
            
            return (
              <svg 
                key={edge.id}
                className="absolute top-0 left-0 w-full h-full pointer-events-none"
                style={{ zIndex: -1 }}
              >
                <defs>
                  <marker
                    id={`arrowhead-${edge.id}`}
                    markerWidth="10"
                    markerHeight="7"
                    refX="0"
                    refY="3.5"
                    orient="auto"
                  >
                    <polygon 
                      points="0 0, 10 3.5, 0 7" 
                      className={isActive ? "fill-blue-500 dark:fill-blue-400" : "fill-slate-400 dark:fill-slate-600"} 
                    />
                  </marker>
                </defs>
                <line
                  x1={sourceX}
                  y1={sourceY}
                  x2={targetX}
                  y2={targetY}
                  className={`stroke-2 ${isActive ? "stroke-blue-500 dark:stroke-blue-400" : "stroke-slate-400 dark:stroke-slate-600"}`}
                  strokeDasharray={targetStatus === 'pending' ? "4 2" : ""}
                  markerEnd={`url(#arrowhead-${edge.id})`}
                />
              </svg>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
