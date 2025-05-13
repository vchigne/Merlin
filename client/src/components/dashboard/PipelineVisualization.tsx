import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { executeQuery } from "@/lib/hasura-client";
import { PIPELINE_QUERY, PIPELINE_UNITS_QUERY, COMMAND_QUERY, QUERY_QUEUE_QUERY, SFTP_DOWNLOADER_QUERY, SFTP_UPLOADER_QUERY, ZIP_QUERY, UNZIP_QUERY } from "@shared/queries";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { convertToFlowCoordinates } from "@/lib/utils";

export default function PipelineVisualization() {
  const [selectedPipeline, setSelectedPipeline] = useState<string | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<any>(null);
  const [unitDetails, setUnitDetails] = useState<any>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  
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
  
  // Función para obtener los detalles de una unidad específica
  const fetchUnitDetails = async (unit: any) => {
    if (!unit) return;
    
    setSelectedUnit(unit);
    setDialogOpen(true);
    
    try {
      let query = '';
      let variables = {};
      
      // Determinar qué tipo de unidad es y obtener los detalles correspondientes
      if (unit.command_id) {
        query = COMMAND_QUERY;
        variables = { id: unit.command_id };
      } else if (unit.query_queue_id) {
        query = QUERY_QUEUE_QUERY;
        variables = { id: unit.query_queue_id };
      } else if (unit.sftp_downloader_id) {
        query = SFTP_DOWNLOADER_QUERY;
        variables = { id: unit.sftp_downloader_id };
      } else if (unit.sftp_uploader_id) {
        query = SFTP_UPLOADER_QUERY;
        variables = { id: unit.sftp_uploader_id };
      } else if (unit.zip_id) {
        query = ZIP_QUERY;
        variables = { id: unit.zip_id };
      } else if (unit.unzip_id) {
        query = UNZIP_QUERY;
        variables = { id: unit.unzip_id };
      } else if (unit.call_pipeline) {
        // En caso de llamada a otro pipeline
        const result = await executeQuery(PIPELINE_QUERY, { id: unit.call_pipeline });
        if (result.data && !result.errors) {
          setUnitDetails({
            type: 'Call Pipeline',
            name: result.data.merlin_agent_Pipeline[0]?.name || 'Pipeline',
            description: result.data.merlin_agent_Pipeline[0]?.description || 'Llamada a otro pipeline',
            details: result.data.merlin_agent_Pipeline[0]
          });
        }
        return;
      }
      
      if (query) {
        const result = await executeQuery(query, variables);
        if (result.data && !result.errors) {
          // Determinar el tipo para mostrar en la interfaz
          const type = getUnitType(unit);
          
          // Obtener los datos relevantes según el tipo
          let data;
          if (unit.command_id) {
            data = result.data.merlin_agent_Command[0];
          } else if (unit.query_queue_id) {
            data = result.data.merlin_agent_QueryQueue[0];
          } else if (unit.sftp_downloader_id) {
            data = result.data.merlin_agent_SFTPDownloader[0];
          } else if (unit.sftp_uploader_id) {
            data = result.data.merlin_agent_SFTPUploader[0];
          } else if (unit.zip_id) {
            data = result.data.merlin_agent_Zip[0];
          } else if (unit.unzip_id) {
            data = result.data.merlin_agent_UnZip[0];
          }
          
          setUnitDetails({
            type,
            name: data?.name || type,
            description: data?.description || '',
            details: data
          });
        }
      }
    } catch (error) {
      console.error("Error fetching unit details:", error);
      setUnitDetails({
        type: getUnitType(unit),
        name: 'Error',
        description: 'No se pudieron cargar los detalles',
        details: null
      });
    }
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
      <CardContent className="p-3 sm:p-6">
        <div className="relative w-full h-[300px] overflow-x-auto overflow-y-auto pb-4">
          {isUnitsLoading ? (
            <div className="flex items-center justify-center h-full">
              <Skeleton className="h-full w-full rounded-lg" />
            </div>
          ) : !pipelineUnits || pipelineUnits.length === 0 ? (
            <div className="flex items-center justify-center h-full text-slate-500 dark:text-slate-400">
              No units defined for this pipeline
            </div>
          ) : (
            <div className="relative w-full min-w-[800px] h-full">
              {/* A simplified representation of pipeline flow */}
              {pipelineUnits.map((unit: any, index: number) => {
                const unitType = getUnitType(unit);
                const status = getUnitStatus(unit, index);
                const xPos = unit.posx ? unit.posx * 180 + 10 : index * 180 + 10;
                const yPos = unit.posy ? unit.posy * 100 + 10 : Math.floor(index / 4) * 100 + 10;
                
                return (
                  <div 
                    key={unit.id}
                    className={`absolute w-36 sm:w-40 h-16 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg p-2 sm:p-3 shadow-sm ${status === 'pending' ? 'opacity-50' : ''} cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors`}
                    style={{ top: `${yPos}px`, left: `${xPos}px` }}
                    onClick={() => fetchUnitDetails(unit)}
                    title="Click para ver detalles"
                  >
                    <div className="text-xs sm:text-sm font-medium dark:text-white truncate">
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
        <div className="text-xs text-center text-slate-500 mt-2 italic">Desliza para ver el flujo completo</div>
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-md sm:max-w-2xl">
            {unitDetails ? (
              <>
                <DialogHeader>
                  <DialogTitle className="flex justify-between items-center">
                    <span>{unitDetails.name}</span>
                    <span className="text-xs px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-full">
                      {unitDetails.type}
                    </span>
                  </DialogTitle>
                  {unitDetails.description && (
                    <DialogDescription>
                      {unitDetails.description}
                    </DialogDescription>
                  )}
                </DialogHeader>
                
                <div className="space-y-4 my-2">
                  {unitDetails.details && (
                    <Card className="overflow-hidden">
                      <CardHeader className="bg-slate-50 dark:bg-slate-800 p-4">
                        <CardTitle className="text-base">Detalles de la tarea</CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 space-y-3 max-h-[300px] overflow-y-auto">
                        {/* Mostrar detalles específicos según el tipo de unidad */}
                        {unitDetails.type === 'SQL Query' && (
                          <>
                            <div>
                              <p className="text-sm font-medium mb-1">ID de la cola de consultas:</p>
                              <p className="text-sm bg-slate-100 dark:bg-slate-700 p-2 rounded">{unitDetails.details.id}</p>
                            </div>
                            {unitDetails.details.Queries && unitDetails.details.Queries.length > 0 && (
                              <div>
                                <p className="text-sm font-medium mb-1">Consultas ({unitDetails.details.Queries.length}):</p>
                                <div className="space-y-2">
                                  {unitDetails.details.Queries.map((query: any, index: number) => (
                                    <div key={query.id} className="bg-slate-100 dark:bg-slate-700 p-2 rounded">
                                      <p className="text-xs font-medium mb-1">Consulta {index + 1}: {query.name}</p>
                                      <div className="bg-slate-50 dark:bg-slate-800 p-2 rounded text-xs font-mono">
                                        {query.query_string}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </>
                        )}
                        
                        {unitDetails.type === 'Command' && (
                          <>
                            <div>
                              <p className="text-sm font-medium mb-1">Comando:</p>
                              <div className="bg-slate-100 dark:bg-slate-700 p-2 rounded font-mono text-xs">
                                {unitDetails.details.target} {unitDetails.details.args}
                              </div>
                            </div>
                            {unitDetails.details.working_directory && (
                              <div>
                                <p className="text-sm font-medium mb-1">Directorio de trabajo:</p>
                                <p className="text-sm bg-slate-100 dark:bg-slate-700 p-2 rounded">{unitDetails.details.working_directory}</p>
                              </div>
                            )}
                            {unitDetails.details.raw_script && (
                              <div>
                                <p className="text-sm font-medium mb-1">Script:</p>
                                <div className="bg-slate-100 dark:bg-slate-700 p-2 rounded font-mono text-xs">
                                  {unitDetails.details.raw_script}
                                </div>
                              </div>
                            )}
                          </>
                        )}
                        
                        {(unitDetails.type === 'SFTP Download' || unitDetails.type === 'SFTP Upload') && (
                          <>
                            <div>
                              <p className="text-sm font-medium mb-1">{unitDetails.type === 'SFTP Download' ? 'Directorio de salida:' : 'Archivo de entrada:'}</p>
                              <p className="text-sm bg-slate-100 dark:bg-slate-700 p-2 rounded">
                                {unitDetails.type === 'SFTP Download' ? unitDetails.details.output : unitDetails.details.input}
                              </p>
                            </div>
                            {unitDetails.details.SFTPLink && (
                              <div>
                                <p className="text-sm font-medium mb-1">Conexión SFTP:</p>
                                <div className="bg-slate-100 dark:bg-slate-700 p-2 rounded">
                                  <p className="text-sm">{unitDetails.details.SFTPLink.name}</p>
                                  <p className="text-xs mt-1">Servidor: {unitDetails.details.SFTPLink.host}:{unitDetails.details.SFTPLink.port}</p>
                                  <p className="text-xs">Usuario: {unitDetails.details.SFTPLink.username}</p>
                                </div>
                              </div>
                            )}
                          </>
                        )}
                        
                        {unitDetails.type === 'Zip Files' && (
                          <div>
                            <p className="text-sm font-medium mb-1">Archivo de salida:</p>
                            <p className="text-sm bg-slate-100 dark:bg-slate-700 p-2 rounded">{unitDetails.details.output}</p>
                          </div>
                        )}
                        
                        {unitDetails.type === 'Unzip Files' && (
                          <>
                            <div>
                              <p className="text-sm font-medium mb-1">Archivo de entrada:</p>
                              <p className="text-sm bg-slate-100 dark:bg-slate-700 p-2 rounded">{unitDetails.details.input}</p>
                            </div>
                            <div>
                              <p className="text-sm font-medium mb-1">Directorio de salida:</p>
                              <p className="text-sm bg-slate-100 dark:bg-slate-700 p-2 rounded">{unitDetails.details.output}</p>
                            </div>
                          </>
                        )}
                        
                        {unitDetails.type === 'Call Pipeline' && (
                          <div>
                            <p className="text-sm font-medium mb-1">Pipeline:</p>
                            <div className="bg-slate-100 dark:bg-slate-700 p-2 rounded">
                              <p className="text-sm">{unitDetails.details.name}</p>
                              <p className="text-xs mt-1">ID: {unitDetails.details.id}</p>
                              {unitDetails.details.description && (
                                <p className="text-xs mt-1">{unitDetails.details.description}</p>
                              )}
                            </div>
                          </div>
                        )}
                        
                        {/* Si no hay detalles específicos, mostrar un mensaje */}
                        {!unitDetails.details && (
                          <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">
                            No hay detalles adicionales disponibles para este tipo de tarea.
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </div>
                
                <DialogFooter className="flex justify-end">
                  <Button onClick={() => setDialogOpen(false)}>Cerrar</Button>
                </DialogFooter>
              </>
            ) : (
              <div className="py-8 text-center">
                <Skeleton className="h-8 w-48 mx-auto mb-4" />
                <Skeleton className="h-4 w-64 mx-auto mb-2" />
                <Skeleton className="h-4 w-56 mx-auto" />
              </div>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
