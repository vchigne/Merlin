import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { executeQuery } from "@/lib/hasura-client";
import { PIPELINE_QUERY, PIPELINE_UNITS_QUERY, COMMAND_QUERY, QUERY_QUEUE_QUERY, QUERY_DETAILS_QUERY, SFTP_DOWNLOADER_QUERY, SFTP_UPLOADER_QUERY, ZIP_QUERY, UNZIP_QUERY } from "@shared/queries";
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
        // Para las colas de consulta, obtenemos primero la metadata de la cola
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
            
            if (data) {
              // Realizamos una segunda consulta para obtener las consultas SQL detalladas
              try {
                const queriesResult = await executeQuery(QUERY_DETAILS_QUERY, { id: unit.query_queue_id });
                if (queriesResult.data && queriesResult.data.merlin_agent_Query) {
                  // Agregamos las consultas al objeto de datos 
                  data.Queries = queriesResult.data.merlin_agent_Query.sort((a: any, b: any) => a.order - b.order);
                }
              } catch (error) {
                console.error("Error fetching SQL queries:", error);
              }
            }
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
                            
                            {/* Primero intentamos mostrar las consultas relacionadas */}
                            {unitDetails.details.Queries && unitDetails.details.Queries.length > 0 ? (
                              <div>
                                <p className="text-sm font-medium mb-1">Consultas ({unitDetails.details.Queries.length}):</p>
                                <div className="space-y-3">
                                  {unitDetails.details.Queries.map((query: any, index: number) => (
                                    <div key={query.id} className="bg-slate-100 dark:bg-slate-700 p-3 rounded-md">
                                      <div className="flex justify-between items-center mb-2">
                                        <p className="text-sm font-medium">Consulta {index + 1}: {query.name}</p>
                                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                                          {query.sqlconn_id ? 'SQL Connection' : 'Query'}
                                        </span>
                                      </div>
                                      
                                      {/* SQL query string */}
                                      <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-md border border-slate-200 dark:border-slate-700 text-xs font-mono mb-2 overflow-auto max-h-32 whitespace-pre">
                                        {query.query_string}
                                      </div>
                                      
                                      {/* Query metadata */}
                                      <div className="grid grid-cols-2 gap-2 text-xs mt-2">
                                        {query.path && (
                                          <div className="col-span-2">
                                            <span className="font-medium">Path de salida:</span> {query.path}
                                          </div>
                                        )}
                                        {query.date_format && (
                                          <div>
                                            <span className="font-medium">Formato de fecha:</span> {query.date_format}
                                          </div>
                                        )}
                                        {query.separator && (
                                          <div>
                                            <span className="font-medium">Separador:</span> {query.separator}
                                          </div>
                                        )}
                                        {query.timeout && (
                                          <div>
                                            <span className="font-medium">Timeout:</span> {query.timeout}ms
                                          </div>
                                        )}
                                        {query.retry_count > 0 && (
                                          <div>
                                            <span className="font-medium">Reintentos:</span> {query.retry_count}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              // Si no hay consultas relacionadas, mostramos el meta-query
                              <div>
                                <p className="text-sm font-medium mb-1">Detalles de la cola:</p>
                                <div className="bg-slate-100 dark:bg-slate-700 p-3 rounded-md">
                                  <p className="text-sm mb-2">{unitDetails.details.name || 'Sin nombre'}</p>
                                  {unitDetails.details.description && (
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">{unitDetails.details.description}</p>
                                  )}
                                  <div className="text-xs mt-2">
                                    <p>Creado: {new Date(unitDetails.details.created_at).toLocaleString()}</p>
                                    <p>Actualizado: {new Date(unitDetails.details.updated_at).toLocaleString()}</p>
                                  </div>
                                </div>
                              </div>
                            )}
                            
                            <div className="mt-3 text-center">
                              <p className="text-xs text-slate-400 dark:text-slate-500 italic">
                                Las consultas SQL son ejecutadas por el agente para extraer datos.
                              </p>
                            </div>
                          </>
                        )}
                        
                        {unitDetails.type === 'Command' && (
                          <>
                            <div className="bg-slate-100 dark:bg-slate-700 p-3 rounded-md">
                              <div className="flex justify-between items-center mb-2">
                                <p className="text-sm font-medium">{unitDetails.details.name || 'Comando'}</p>
                                <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400">
                                  {unitDetails.details.instant ? 'Ejecución Instantánea' : 'Ejecución Estándar'}
                                </span>
                              </div>
                              
                              {/* Command details */}
                              <div className="space-y-3">
                                <div>
                                  <p className="text-xs font-medium mb-1">Comando a ejecutar:</p>
                                  <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-md border border-slate-200 dark:border-slate-700 font-mono text-xs flex items-center">
                                    <span className="text-green-600 dark:text-green-400 font-bold mr-1">$</span>
                                    <span>{unitDetails.details.target} {unitDetails.details.args}</span>
                                  </div>
                                </div>
                                
                                {unitDetails.details.working_directory && (
                                  <div>
                                    <p className="text-xs font-medium mb-1">Directorio de trabajo:</p>
                                    <div className="bg-slate-50 dark:bg-slate-800 p-2 rounded-md text-xs border border-slate-200 dark:border-slate-700">
                                      {unitDetails.details.working_directory}
                                    </div>
                                  </div>
                                )}
                                
                                {unitDetails.details.description && (
                                  <div>
                                    <p className="text-xs font-medium mb-1">Descripción:</p>
                                    <p className="text-xs bg-slate-50 dark:bg-slate-800 p-2 rounded-md border border-slate-200 dark:border-slate-700">
                                      {unitDetails.details.description}
                                    </p>
                                  </div>
                                )}
                                
                                {unitDetails.details.labels && unitDetails.details.labels.length > 0 && (
                                  <div>
                                    <p className="text-xs font-medium mb-1">Etiquetas:</p>
                                    <div className="flex flex-wrap gap-1">
                                      {unitDetails.details.labels.map((label: string, idx: number) => (
                                        <span 
                                          key={idx}
                                          className="px-2 py-0.5 bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-300 text-xs rounded-full"
                                        >
                                          {label}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                
                                {/* Script content if available */}
                                {unitDetails.details.raw_script && (
                                  <div>
                                    <p className="text-xs font-medium mb-1">Script:</p>
                                    <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-md border border-slate-200 dark:border-slate-700 font-mono text-xs overflow-auto max-h-32 whitespace-pre">
                                      {unitDetails.details.raw_script}
                                    </div>
                                  </div>
                                )}
                                
                                {/* Output handling */}
                                <div className="grid grid-cols-2 gap-2 text-xs mt-2">
                                  <div>
                                    <span className="font-medium">Retornar salida:</span> {unitDetails.details.return_output ? 'Sí' : 'No'}
                                  </div>
                                  {unitDetails.details.return_output && unitDetails.details.return_output_type && (
                                    <div>
                                      <span className="font-medium">Tipo de salida:</span> {unitDetails.details.return_output_type}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            <div className="mt-3 text-center">
                              <p className="text-xs text-slate-400 dark:text-slate-500 italic">
                                Los comandos son ejecutados por el agente en la máquina destino.
                              </p>
                            </div>
                          </>
                        )}
                        
                        {(unitDetails.type === 'SFTP Download' || unitDetails.type === 'SFTP Upload') && (
                          <>
                            <div className="bg-slate-100 dark:bg-slate-700 p-3 rounded-md">
                              <div className="flex justify-between items-center mb-2">
                                <p className="text-sm font-medium">{unitDetails.details.name || unitDetails.type}</p>
                                <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
                                  {unitDetails.type === 'SFTP Download' ? 'Descarga' : 'Carga'}
                                </span>
                              </div>
                              
                              <div className="space-y-3 mt-2">
                                {/* Path information */}
                                <div>
                                  <p className="text-xs font-medium mb-1">{unitDetails.type === 'SFTP Download' ? 'Directorio de salida:' : 'Archivo de entrada:'}</p>
                                  <div className="bg-slate-50 dark:bg-slate-800 p-2 rounded-md border border-slate-200 dark:border-slate-700 text-xs">
                                    <span className="font-mono">{unitDetails.type === 'SFTP Download' ? unitDetails.details.output : unitDetails.details.input}</span>
                                  </div>
                                </div>
                                
                                {/* Connection details */}
                                {unitDetails.details.SFTPLink && (
                                  <div>
                                    <p className="text-xs font-medium mb-1">Conexión SFTP:</p>
                                    <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-md border border-slate-200 dark:border-slate-700">
                                      <div className="flex items-center justify-between mb-1">
                                        <p className="text-xs font-semibold">{unitDetails.details.SFTPLink.name}</p>
                                      </div>
                                      <div className="text-xs grid grid-cols-2 gap-2">
                                        <div>
                                          <span className="font-medium">Servidor:</span> 
                                          <span className="block font-mono mt-0.5">{unitDetails.details.SFTPLink.host}:{unitDetails.details.SFTPLink.port}</span>
                                        </div>
                                        <div>
                                          <span className="font-medium">Usuario:</span>
                                          <span className="block font-mono mt-0.5">{unitDetails.details.SFTPLink.username}</span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )}
                                
                                {/* Output handling */}
                                <div className="mt-2 text-xs">
                                  <span className="font-medium">Retornar salida:</span> 
                                  {unitDetails.details.return_output ? 'Sí' : 'No'}
                                </div>
                              </div>
                            </div>
                            
                            <div className="mt-3 text-center">
                              <p className="text-xs text-slate-400 dark:text-slate-500 italic">
                                {unitDetails.type === 'SFTP Download' 
                                  ? 'Esta tarea descarga archivos desde un servidor SFTP remoto.' 
                                  : 'Esta tarea sube archivos a un servidor SFTP remoto.'}
                              </p>
                            </div>
                          </>
                        )}
                        
                        {unitDetails.type === 'Zip Files' && (
                          <>
                            <div className="bg-slate-100 dark:bg-slate-700 p-3 rounded-md">
                              <div className="flex justify-between items-center mb-2">
                                <p className="text-sm font-medium">{unitDetails.details.name || 'Comprimir archivos'}</p>
                                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
                                  Compresión
                                </span>
                              </div>
                              
                              <div className="space-y-3 mt-2">
                                <div>
                                  <p className="text-xs font-medium mb-1">Archivo de salida:</p>
                                  <div className="bg-slate-50 dark:bg-slate-800 p-2 rounded-md border border-slate-200 dark:border-slate-700 text-xs font-mono">
                                    {unitDetails.details.output}
                                  </div>
                                </div>
                                
                                {/* Output handling */}
                                <div className="mt-2 text-xs">
                                  <span className="font-medium">Retornar salida:</span> 
                                  {unitDetails.details.return_output ? 'Sí' : 'No'}
                                </div>
                                
                                <div className="text-xs">
                                  <span className="font-medium">Fecha de creación:</span> 
                                  {new Date(unitDetails.details.created_at).toLocaleString()}
                                </div>
                              </div>
                            </div>
                            
                            <div className="mt-3 text-center">
                              <p className="text-xs text-slate-400 dark:text-slate-500 italic">
                                Esta tarea comprime archivos y directorios en un archivo zip.
                              </p>
                            </div>
                          </>
                        )}
                        
                        {unitDetails.type === 'Unzip Files' && (
                          <>
                            <div className="bg-slate-100 dark:bg-slate-700 p-3 rounded-md">
                              <div className="flex justify-between items-center mb-2">
                                <p className="text-sm font-medium">{unitDetails.details.name || 'Descomprimir archivos'}</p>
                                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
                                  Descompresión
                                </span>
                              </div>
                              
                              <div className="space-y-3 mt-2">
                                <div>
                                  <p className="text-xs font-medium mb-1">Archivo de entrada:</p>
                                  <div className="bg-slate-50 dark:bg-slate-800 p-2 rounded-md border border-slate-200 dark:border-slate-700 text-xs font-mono">
                                    {unitDetails.details.input}
                                  </div>
                                </div>
                                
                                <div>
                                  <p className="text-xs font-medium mb-1">Directorio de salida:</p>
                                  <div className="bg-slate-50 dark:bg-slate-800 p-2 rounded-md border border-slate-200 dark:border-slate-700 text-xs font-mono">
                                    {unitDetails.details.output}
                                  </div>
                                </div>
                                
                                {/* Output handling */}
                                <div className="mt-2 text-xs">
                                  <span className="font-medium">Retornar salida:</span> 
                                  {unitDetails.details.return_output ? 'Sí' : 'No'}
                                </div>
                                
                                <div className="text-xs">
                                  <span className="font-medium">Fecha de creación:</span> 
                                  {new Date(unitDetails.details.created_at).toLocaleString()}
                                </div>
                              </div>
                            </div>
                            
                            <div className="mt-3 text-center">
                              <p className="text-xs text-slate-400 dark:text-slate-500 italic">
                                Esta tarea extrae el contenido de un archivo zip en el directorio especificado.
                              </p>
                            </div>
                          </>
                        )}
                        
                        {unitDetails.type === 'Call Pipeline' && (
                          <>
                            <div className="bg-slate-100 dark:bg-slate-700 p-3 rounded-md">
                              <div className="flex justify-between items-center mb-2">
                                <p className="text-sm font-medium">{unitDetails.details.name || 'Llamada a Pipeline'}</p>
                                <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
                                  Referencia
                                </span>
                              </div>
                              
                              <div className="mt-2">
                                <div className="grid grid-cols-1 gap-2">
                                  {unitDetails.details.description && (
                                    <div>
                                      <p className="text-xs font-medium mb-1">Descripción:</p>
                                      <p className="text-xs bg-slate-50 dark:bg-slate-800 p-2 rounded-md border border-slate-200 dark:border-slate-700">
                                        {unitDetails.details.description}
                                      </p>
                                    </div>
                                  )}
                                  
                                  <div>
                                    <p className="text-xs font-medium mb-1">Identificador del Pipeline:</p>
                                    <p className="text-xs bg-slate-50 dark:bg-slate-800 p-2 rounded-md border border-slate-200 dark:border-slate-700 font-mono">
                                      {unitDetails.details.id}
                                    </p>
                                  </div>
                                  
                                  {unitDetails.details.agent_passport_id && (
                                    <div>
                                      <p className="text-xs font-medium mb-1">Agente asignado:</p>
                                      <p className="text-xs bg-slate-50 dark:bg-slate-800 p-2 rounded-md border border-slate-200 dark:border-slate-700 font-mono">
                                        {unitDetails.details.agent_passport_id}
                                      </p>
                                    </div>
                                  )}
                                  
                                  <div className="grid grid-cols-2 gap-2 text-xs mt-1">
                                    <div>
                                      <span className="font-medium">Abortar en error:</span> 
                                      {unitDetails.details.abort_on_error ? 'Sí' : 'No'}
                                    </div>
                                    <div>
                                      <span className="font-medium">Desechable:</span> 
                                      {unitDetails.details.disposable ? 'Sí' : 'No'}
                                    </div>
                                  </div>
                                  
                                  <div className="grid grid-cols-2 gap-2 text-xs mt-1">
                                    <div>
                                      <span className="font-medium">Creado:</span> 
                                      {new Date(unitDetails.details.created_at).toLocaleString()}
                                    </div>
                                    <div>
                                      <span className="font-medium">Actualizado:</span> 
                                      {new Date(unitDetails.details.updated_at).toLocaleString()}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            <div className="mt-3 text-center">
                              <p className="text-xs text-slate-400 dark:text-slate-500 italic">
                                Esta tarea ejecuta otro pipeline completo como parte de este flujo.
                              </p>
                            </div>
                          </>
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
