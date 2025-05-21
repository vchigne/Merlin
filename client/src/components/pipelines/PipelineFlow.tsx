import { useEffect, useState } from "react";
import { convertToFlowCoordinates } from "@/lib/utils";
import { executeQuery } from "@/lib/hasura-client";
import { COMMAND_QUERY, QUERY_QUEUE_QUERY, QUERY_DETAILS_QUERY, SFTP_DOWNLOADER_QUERY, SFTP_UPLOADER_QUERY, ZIP_QUERY, UNZIP_QUERY, PIPELINE_QUERY } from "@shared/queries";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
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
import "@/styles/pipeline-flow.css";

interface PipelineFlowProps {
  pipelineUnits: any[];
  pipelineJobs?: any[];
  isLoading: boolean;
}

export default function PipelineFlow({ pipelineUnits, pipelineJobs, isLoading }: PipelineFlowProps) {
  const [flowElements, setFlowElements] = useState<{ nodes: any[]; edges: any[] }>({ nodes: [], edges: [] });
  const [selectedUnit, setSelectedUnit] = useState<any>(null);
  const [unitDetails, setUnitDetails] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading2, setIsLoading2] = useState(false);
  
  // Cierra el diálogo
  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    // Limpiar el estado después de cerrar para evitar que los datos antiguos aparezcan brevemente
    setTimeout(() => {
      setSelectedUnit(null);
      setUnitDetails(null);
    }, 200);
  };
  
  // Función para obtener los detalles de una unidad específica
  const fetchUnitDetails = async (unitData: any) => {
    setSelectedUnit(unitData);
    setIsDialogOpen(true);
    setIsLoading2(true);
    
    try {
      let query = '';
      let variables = {};
      
      // Determinar qué tipo de unidad es y obtener los detalles correspondientes
      if (unitData.command_id) {
        query = COMMAND_QUERY;
        variables = { id: unitData.command_id };
      } else if (unitData.query_queue_id) {
        // Para las colas de consulta, obtenemos primero la metadata de la cola
        query = QUERY_QUEUE_QUERY;
        variables = { id: unitData.query_queue_id };
      } else if (unitData.sftp_downloader_id) {
        query = SFTP_DOWNLOADER_QUERY;
        variables = { id: unitData.sftp_downloader_id };
      } else if (unitData.sftp_uploader_id) {
        query = SFTP_UPLOADER_QUERY;
        variables = { id: unitData.sftp_uploader_id };
      } else if (unitData.zip_id) {
        query = ZIP_QUERY;
        variables = { id: unitData.zip_id };
      } else if (unitData.unzip_id) {
        query = UNZIP_QUERY;
        variables = { id: unitData.unzip_id };
      } else if (unitData.call_pipeline) {
        // En caso de llamada a otro pipeline
        const result = await executeQuery(PIPELINE_QUERY, { id: unitData.call_pipeline });
        if (result.data && !result.errors) {
          setUnitDetails({
            type: 'pipeline',
            name: result.data.merlin_agent_Pipeline[0]?.name || 'Pipeline',
            description: result.data.merlin_agent_Pipeline[0]?.description || 'Llamada a otro pipeline',
            details: result.data.merlin_agent_Pipeline[0]
          });
        }
        setIsLoading2(false);
        return;
      }
      
      if (query) {
        const result = await executeQuery(query, variables);
        if (result.data && !result.errors) {
          // Determinar el tipo para mostrar en la interfaz
          const type = determineUnitType(unitData);
          
          // Obtener los datos relevantes según el tipo
          let data;
          if (unitData.command_id) {
            data = result.data.merlin_agent_Command[0];
          } else if (unitData.query_queue_id) {
            data = result.data.merlin_agent_QueryQueue[0];
            
            if (data) {
              // Para las consultas SQL, obtenemos detalles adicionales
              try {
                const queriesResult = await executeQuery(QUERY_DETAILS_QUERY, { id: unitData.query_queue_id });
                if (queriesResult.data && queriesResult.data.merlin_agent_Query) {
                  // Agregamos las consultas al objeto de datos
                  data.Queries = queriesResult.data.merlin_agent_Query.sort((a: any, b: any) => a.order - b.order);
                }
              } catch (error) {
                console.error("Error fetching SQL queries:", error);
              }
            }
          } else if (unitData.sftp_downloader_id) {
            data = result.data.merlin_agent_SFTPDownloader[0];
          } else if (unitData.sftp_uploader_id) {
            data = result.data.merlin_agent_SFTPUploader[0];
          } else if (unitData.zip_id) {
            data = result.data.merlin_agent_Zip[0];
          } else if (unitData.unzip_id) {
            data = result.data.merlin_agent_UnZip[0];
          }
          
          setUnitDetails({
            type,
            name: data?.name || getUnitTypeDescription(unitData),
            description: data?.description || '',
            details: data
          });
        }
      }
    } catch (error) {
      console.error("Error fetching unit details:", error);
      setUnitDetails({
        type: determineUnitType(unitData),
        name: 'Error',
        description: 'No se pudieron cargar los detalles',
        details: null
      });
    } finally {
      setIsLoading2(false);
    }
  };
  
  // Abre el diálogo con los detalles de la unidad seleccionada
  const handleUnitClick = (unitData: any) => {
    fetchUnitDetails(unitData);
  };

  useEffect(() => {
    if (pipelineUnits && pipelineUnits.length > 0) {
      console.log('Pipeline Units (datos originales):', JSON.stringify(pipelineUnits, null, 2));
      const result = convertToFlowCoordinates(pipelineUnits);
      console.log('Flow Elements (después de conversión):', JSON.stringify(result, null, 2));
      setFlowElements(result);
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
          {/* Contenedor para las conexiones */}
          <div className="absolute inset-0 w-full h-full" style={{ zIndex: 0 }}>
            <svg width="100%" height="100%" className="absolute top-0 left-0">
              <defs>
                {/* Un marcador único para cada estilo de conexión */}
                <marker
                  id="arrow-default"
                  viewBox="0 0 10 10"
                  refX="5"
                  refY="5"
                  markerWidth="8"
                  markerHeight="8"
                  orient="auto"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" className="fill-slate-500 dark:fill-slate-400" />
                </marker>
                <marker
                  id="arrow-active"
                  viewBox="0 0 10 10"
                  refX="5"
                  refY="5"
                  markerWidth="8"
                  markerHeight="8"
                  orient="auto"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" className="fill-blue-500 dark:fill-blue-400" />
                </marker>
              </defs>
              
              {/* Dibujar las líneas de conexión */}
              {flowElements.edges.map((edge) => {
                const sourceNode = flowElements.nodes.find(n => n.id === edge.source);
                const targetNode = flowElements.nodes.find(n => n.id === edge.target);
                
                if (!sourceNode || !targetNode) return null;
                
                const sourceStatus = getUnitStatus(sourceNode.id);
                const targetStatus = getUnitStatus(targetNode.id);
                
                // Determinar si la conexión está activa
                const isActive = sourceStatus === 'completed' && 
                                (targetStatus === 'running' || targetStatus === 'completed');
                
                // Calcular puntos de inicio y fin para las conexiones
                const startX = sourceNode.position.x + 104;  // Centro del nodo
                const startY = sourceNode.position.y + 80;   // Parte inferior
                const endX = targetNode.position.x + 104;    // Centro del nodo
                const endY = targetNode.position.y;          // Parte superior
                
                // Control points for curved path
                const midY = (startY + endY) / 2;
                const curveFactor = 50;
                
                const controlPoint1X = startX;
                const controlPoint1Y = startY + curveFactor;
                const controlPoint2X = endX;
                const controlPoint2Y = endY - curveFactor;
                
                const path = `M ${startX},${startY} C ${controlPoint1X},${controlPoint1Y} ${controlPoint2X},${controlPoint2Y} ${endX},${endY}`;
                
                return (
                  <path
                    key={edge.id}
                    d={path}
                    fill="none"
                    className={`${isActive ? 'stroke-blue-500 dark:stroke-blue-400' : 'stroke-slate-500 dark:stroke-slate-400'}`}
                    strokeWidth="2"
                    strokeDasharray={targetStatus === 'pending' ? "5 5" : ""}
                    markerEnd={`url(#arrow-${isActive ? 'active' : 'default'})`}
                  />
                );
              })}
            </svg>
          </div>
          
          {/* Dibujar nodos */}
          {flowElements.nodes.map((node) => {
            const unitType = node.data.type;
            const status = getUnitStatus(node.id);
            
            return (
              <div 
                key={node.id}
                className={`absolute w-52 pipeline-node ${status} cursor-pointer hover:shadow-md transition-shadow`}
                style={{ 
                  top: `${node.position.y}px`, 
                  left: `${node.position.x}px`, 
                  zIndex: 1,
                  borderLeft: `4px solid ${getNodeColor(unitType)}`,
                  borderTop: `1px solid ${getNodeColor(unitType)}20`,
                  borderRight: `1px solid ${getNodeColor(unitType)}20`,
                  borderBottom: `1px solid ${getNodeColor(unitType)}20`,
                }}
                onClick={() => handleUnitClick(node.data.unit)}
                title="Haz clic para ver detalles"
              >
                <div className="flex items-center space-x-2 mb-2">
                  {getUnitIcon(unitType)}
                  <div className="text-sm font-medium dark:text-white truncate max-w-[90%]">
                    {node.data.label}
                  </div>
                </div>
                
                {node.data.description && (
                  <div className="text-xs text-slate-600 dark:text-slate-300 mb-2 max-w-full overflow-hidden text-ellipsis">
                    {node.data.description}
                  </div>
                )}
                
                {/* Información simplificada y más específica */}
                <div className="text-xs text-slate-700 dark:text-slate-300 mb-2 max-w-full overflow-hidden">
                  {/* COMANDOS */}
                  {unitType === 'command' && (
                    <div className="mt-1">
                      <div className="truncate font-mono text-amber-600 dark:text-amber-400">
                        ID: {node.data.unit.command_id?.substring(0, 8)}...
                      </div>
                    </div>
                  )}
                  
                  {/* CONSULTAS SQL */}
                  {unitType === 'query' && (
                    <div className="mt-1">
                      <div className="truncate font-mono text-blue-600 dark:text-blue-400">
                        ID: {node.data.unit.query_queue_id?.substring(0, 8)}...
                      </div>
                    </div>
                  )}
                  
                  {/* SFTP DOWNLOAD */}
                  {unitType === 'sftp_download' && (
                    <div className="mt-1">
                      <div className="truncate font-mono text-green-600 dark:text-green-400">
                        ID: {node.data.unit.sftp_downloader_id?.substring(0, 8)}...
                      </div>
                    </div>
                  )}
                  
                  {/* SFTP UPLOAD */}
                  {unitType === 'sftp_upload' && (
                    <div className="mt-1">
                      <div className="truncate font-mono text-orange-600 dark:text-orange-400">
                        ID: {node.data.unit.sftp_uploader_id?.substring(0, 8)}...
                      </div>
                    </div>
                  )}
                  
                  {/* ZIP */}
                  {unitType === 'zip' && (
                    <div className="mt-1">
                      <div className="truncate font-mono text-amber-600 dark:text-amber-400">
                        ID: {node.data.unit.zip_id?.substring(0, 8)}...
                      </div>
                    </div>
                  )}
                  
                  {/* UNZIP */}
                  {unitType === 'unzip' && (
                    <div className="mt-1">
                      <div className="truncate font-mono text-indigo-600 dark:text-indigo-400">
                        ID: {node.data.unit.unzip_id?.substring(0, 8)}...
                      </div>
                    </div>
                  )}
                  
                  {/* PIPELINE */}
                  {unitType === 'pipeline' && (
                    <div className="mt-1">
                      <div className="truncate font-mono text-pink-600 dark:text-pink-400">
                        ID: {node.data.unit.call_pipeline?.substring(0, 8)}...
                      </div>
                    </div>
                  )}
                  
                  {/* Solo mostrar configuración de reintentos si es > 0 */}
                  {node.data.unit.retry_count > 0 && (
                    <div className="mt-1">
                      <span className="text-xs text-slate-500">Reintentos: {node.data.unit.retry_count}</span>
                    </div>
                  )}
                </div>
                
                <div className="flex mt-1">
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
        </div>
      </CardContent>
      
      {/* Modal de detalles */}
      {isDialogOpen && selectedUnit && (
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[640px] max-h-[85vh] overflow-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                {getUnitIcon(determineUnitType(selectedUnit))}
                <span>{unitDetails?.name || "Detalles de la Unidad"}</span>
              </DialogTitle>
              <DialogDescription>
                {unitDetails?.description || "Información detallada sobre esta unidad del pipeline"}
              </DialogDescription>
            </DialogHeader>
            
            {isLoading2 ? (
              <div className="py-8 flex justify-center">
                <Skeleton className="h-32 w-full" />
              </div>
            ) : (
              <div className="grid gap-4 py-2">
                <div>
                  <h3 className="text-lg font-medium mb-1">
                    {selectedUnit.comment || `Unidad ${selectedUnit.id.substring(0, 8)}`}
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {getUnitTypeDescription(selectedUnit)}
                  </p>
                </div>
                
                <Separator />
                
                <div>
                  <h4 className="text-sm font-medium mb-1">ID de la Unidad</h4>
                  <p className="text-sm text-slate-500 dark:text-slate-400 break-all">{selectedUnit.id}</p>
                </div>
                
                {selectedUnit.pipeline_unit_id && (
                  <div>
                    <h4 className="text-sm font-medium mb-1">Unidad Padre</h4>
                    <p className="text-sm text-slate-500 dark:text-slate-400 break-all">{selectedUnit.pipeline_unit_id}</p>
                  </div>
                )}
                
                <div className="flex flex-wrap gap-2">
                  {selectedUnit.abort_on_timeout && (
                    <Badge variant="outline" className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400">
                      Abortar en Timeout
                    </Badge>
                  )}
                  {selectedUnit.continue_on_error && (
                    <Badge variant="outline" className="bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400">
                      Continuar en Error
                    </Badge>
                  )}
                </div>
                
                <Separator />
                
                <div className="grid grid-cols-2 gap-4">
                  {selectedUnit.timeout_milliseconds > 0 && (
                    <div>
                      <h4 className="text-xs font-medium mb-1">Timeout</h4>
                      <p className="text-sm">{Math.round(selectedUnit.timeout_milliseconds / 1000)} seg</p>
                    </div>
                  )}
                  
                  {selectedUnit.retry_count > 0 && (
                    <div>
                      <h4 className="text-xs font-medium mb-1">Reintentos</h4>
                      <p className="text-sm">{selectedUnit.retry_count} veces</p>
                    </div>
                  )}
                  
                  {selectedUnit.retry_after_milliseconds > 0 && (
                    <div>
                      <h4 className="text-xs font-medium mb-1">Espera entre reintentos</h4>
                      <p className="text-sm">{Math.round(selectedUnit.retry_after_milliseconds / 1000)} seg</p>
                    </div>
                  )}
                </div>
                
                {/* Detalles específicos por tipo de unidad */}
                {unitDetails?.details && (
                  <>
                    <Separator />
                    <Card className="overflow-hidden">
                      <CardHeader className="bg-slate-50 dark:bg-slate-800 p-4">
                        <CardTitle className="text-base">Detalles de la tarea</CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 space-y-3 max-h-[300px] overflow-y-auto">
                        {/* Detalles específicos para Comandos */}
                        {determineUnitType(selectedUnit) === 'command' && (
                          <>
                            {unitDetails.details.target && (
                              <div>
                                <p className="text-sm font-medium mb-1">Objetivo:</p>
                                <p className="text-sm bg-slate-100 dark:bg-slate-700 p-2 rounded">{unitDetails.details.target}</p>
                              </div>
                            )}
                            
                            {unitDetails.details.args && (
                              <div>
                                <p className="text-sm font-medium mb-1">Comando:</p>
                                <p className="text-sm bg-slate-100 dark:bg-slate-700 p-2 rounded font-mono">{unitDetails.details.args}</p>
                              </div>
                            )}
                            
                            {unitDetails.details.raw_script && (
                              <div>
                                <p className="text-sm font-medium mb-1">Script:</p>
                                <div className="text-sm bg-slate-100 dark:bg-slate-700 p-2 rounded font-mono whitespace-pre overflow-auto max-h-32">
                                  {unitDetails.details.raw_script}
                                </div>
                              </div>
                            )}
                            
                            <div className="grid grid-cols-2 gap-2 text-xs mt-2">
                              <div>
                                <span className="font-medium">Instantáneo:</span> {unitDetails.details.instant ? 'Sí' : 'No'}
                              </div>
                              <div>
                                <span className="font-medium">Retornar salida:</span> {unitDetails.details.return_output ? 'Sí' : 'No'}
                              </div>
                              {unitDetails.details.working_directory && (
                                <div className="col-span-2">
                                  <span className="font-medium">Directorio de trabajo:</span> {unitDetails.details.working_directory}
                                </div>
                              )}
                              <div>
                                <span className="font-medium">Creado:</span> {new Date(unitDetails.details.created_at).toLocaleString()}
                              </div>
                              <div>
                                <span className="font-medium">Actualizado:</span> {new Date(unitDetails.details.updated_at).toLocaleString()}
                              </div>
                            </div>
                          </>
                        )}
                        
                        {/* Detalles específicos para SQL Queries */}
                        {determineUnitType(selectedUnit) === 'query' && (
                          <>
                            <div>
                              <p className="text-sm font-medium mb-1">ID de la cola de consultas:</p>
                              <p className="text-sm bg-slate-100 dark:bg-slate-700 p-2 rounded">{unitDetails.details.id}</p>
                            </div>
                            
                            {/* Consultas relacionadas */}
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
                                      
                                      {/* Advertencia de seguridad */}
                                      <div className="text-xs text-amber-600 dark:text-amber-400 mt-1 mb-2 flex items-center">
                                        <AlertCircle className="h-4 w-4 mr-1" />
                                        Modo solo lectura - No se ejecutará ni modificará esta consulta
                                      </div>
                                      
                                      {/* Query metadata */}
                                      <div className="grid grid-cols-2 gap-2 text-xs mt-2">
                                        {query.path && (
                                          <div className="col-span-2">
                                            <span className="font-medium">Path de salida:</span> {query.path}
                                          </div>
                                        )}
                                        <div>
                                          <span className="font-medium">Print headers:</span> {query.print_headers ? 'Sí' : 'No'}
                                        </div>
                                        <div>
                                          <span className="font-medium">Habilitado:</span> {query.enabled ? 'Sí' : 'No'}
                                        </div>
                                        <div>
                                          <span className="font-medium">Retornar salida:</span> {query.return_output ? 'Sí' : 'No'}
                                        </div>
                                        <div>
                                          <span className="font-medium">Orden:</span> {query.order}
                                        </div>
                                        <div>
                                          <span className="font-medium">Timeout:</span> {query.timeout ? `${query.timeout}ms` : 'N/A'}
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <div className="text-sm text-slate-600 dark:text-slate-400">
                                No hay consultas definidas en esta cola.
                              </div>
                            )}
                            
                            <div className="grid grid-cols-2 gap-2 text-xs mt-2">
                              <div>
                                <span className="font-medium">Creado:</span> {new Date(unitDetails.details.created_at).toLocaleString()}
                              </div>
                              <div>
                                <span className="font-medium">Actualizado:</span> {new Date(unitDetails.details.updated_at).toLocaleString()}
                              </div>
                            </div>
                          </>
                        )}
                        
                        {/* Detalles específicos para SFTP Downloader */}
                        {determineUnitType(selectedUnit) === 'sftp_download' && (
                          <>
                            <div>
                              <p className="text-sm font-medium mb-1">Output:</p>
                              <p className="text-sm bg-slate-100 dark:bg-slate-700 p-2 rounded">{unitDetails.details.output}</p>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-2 text-xs mt-2">
                              <div>
                                <span className="font-medium">SFTP Link ID:</span> {unitDetails.details.sftp_link_id}
                              </div>
                              <div>
                                <span className="font-medium">Retornar salida:</span> {unitDetails.details.return_output ? 'Sí' : 'No'}
                              </div>
                            </div>
                          </>
                        )}
                        
                        {/* Detalles específicos para SFTP Uploader */}
                        {determineUnitType(selectedUnit) === 'sftp_upload' && (
                          <>
                            <div>
                              <p className="text-sm font-medium mb-1">Input:</p>
                              <p className="text-sm bg-slate-100 dark:bg-slate-700 p-2 rounded">{unitDetails.details.input}</p>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-2 text-xs mt-2">
                              <div>
                                <span className="font-medium">SFTP Link ID:</span> {unitDetails.details.sftp_link_id}
                              </div>
                              <div>
                                <span className="font-medium">Retornar salida:</span> {unitDetails.details.return_output ? 'Sí' : 'No'}
                              </div>
                            </div>
                          </>
                        )}
                        
                        {/* Detalles específicos para Zip Files */}
                        {determineUnitType(selectedUnit) === 'zip' && (
                          <>
                            <div>
                              <p className="text-sm font-medium mb-1">Output:</p>
                              <p className="text-sm bg-slate-100 dark:bg-slate-700 p-2 rounded">{unitDetails.details.output}</p>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-2 text-xs mt-2">
                              <div>
                                <span className="font-medium">Retornar salida:</span> {unitDetails.details.return_output ? 'Sí' : 'No'}
                              </div>
                              <div>
                                <span className="font-medium">Creado:</span> {new Date(unitDetails.details.created_at).toLocaleString()}
                              </div>
                              <div>
                                <span className="font-medium">Actualizado:</span> {new Date(unitDetails.details.updated_at).toLocaleString()}
                              </div>
                            </div>
                          </>
                        )}
                        
                        {/* Detalles específicos para Unzip Files */}
                        {determineUnitType(selectedUnit) === 'unzip' && (
                          <>
                            <div>
                              <p className="text-sm font-medium mb-1">Input:</p>
                              <p className="text-sm bg-slate-100 dark:bg-slate-700 p-2 rounded">{unitDetails.details.input}</p>
                            </div>
                            
                            <div>
                              <p className="text-sm font-medium mb-1">Output:</p>
                              <p className="text-sm bg-slate-100 dark:bg-slate-700 p-2 rounded">{unitDetails.details.output}</p>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-2 text-xs mt-2">
                              <div>
                                <span className="font-medium">Retornar salida:</span> {unitDetails.details.return_output ? 'Sí' : 'No'}
                              </div>
                              <div>
                                <span className="font-medium">Creado:</span> {new Date(unitDetails.details.created_at).toLocaleString()}
                              </div>
                              <div>
                                <span className="font-medium">Actualizado:</span> {new Date(unitDetails.details.updated_at).toLocaleString()}
                              </div>
                            </div>
                          </>
                        )}
                        
                        {/* Detalles específicos para Call Pipeline */}
                        {determineUnitType(selectedUnit) === 'pipeline' && (
                          <>
                            <div>
                              <p className="text-sm font-medium mb-1">Pipeline llamado:</p>
                              <p className="text-sm bg-slate-100 dark:bg-slate-700 p-2 rounded">{unitDetails.details.name || unitDetails.details.id}</p>
                            </div>
                            
                            {unitDetails.details.description && (
                              <div>
                                <p className="text-sm font-medium mb-1">Descripción:</p>
                                <p className="text-sm bg-slate-100 dark:bg-slate-700 p-2 rounded">{unitDetails.details.description}</p>
                              </div>
                            )}
                            
                            <div className="grid grid-cols-2 gap-2 text-xs mt-2">
                              <div>
                                <span className="font-medium">Abortar en error:</span> {unitDetails.details.abort_on_error ? 'Sí' : 'No'}
                              </div>
                              <div>
                                <span className="font-medium">Descartable:</span> {unitDetails.details.disposable ? 'Sí' : 'No'}
                              </div>
                              <div>
                                <span className="font-medium">Creado:</span> {new Date(unitDetails.details.created_at).toLocaleString()}
                              </div>
                              <div>
                                <span className="font-medium">Actualizado:</span> {new Date(unitDetails.details.updated_at).toLocaleString()}
                              </div>
                            </div>
                          </>
                        )}
                      </CardContent>
                    </Card>
                  </>
                )}
              </div>
            )}
            
            <DialogFooter>
              <Button onClick={handleCloseDialog}>Cerrar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </Card>
  );
}

// Función para determinar el tipo de unidad
function determineUnitType(unit: any): string {
  if (unit.command_id) return 'command';
  if (unit.query_queue_id) return 'query';
  if (unit.sftp_downloader_id) return 'sftp_download';
  if (unit.sftp_uploader_id) return 'sftp_upload';
  if (unit.zip_id) return 'zip';
  if (unit.unzip_id) return 'unzip';
  if (unit.call_pipeline) return 'pipeline';
  return 'unknown';
}

// Función para obtener color según el tipo de nodo
function getNodeColor(type: string): string {
  switch (type) {
    case 'command':
      return '#4f46e5'; // Indigo para comandos
    case 'query':
      return '#0ea5e9'; // Azul para consultas SQL
    case 'sftp_download':
      return '#10b981'; // Verde para SFTP descarga
    case 'sftp_upload':
      return '#84cc16'; // Lima para SFTP subida
    case 'zip':
      return '#f59e0b'; // Ámbar para compresión
    case 'unzip':
      return '#f97316'; // Naranja para descompresión
    case 'pipeline':
      return '#8b5cf6'; // Violeta para llamadas a pipeline
    default:
      return '#6b7280'; // Gris para desconocidos
  }
}

// Función para obtener una descripción más detallada del tipo de unidad
function getUnitTypeDescription(unit: any): string {
  if (unit.command_id) return 'Esta unidad ejecuta un comando en el sistema operativo del agente.';
  if (unit.query_queue_id) return 'Esta unidad ejecuta una o más consultas SQL en una base de datos.';
  if (unit.sftp_downloader_id) return 'Esta unidad descarga archivos desde un servidor remoto usando SFTP.';
  if (unit.sftp_uploader_id) return 'Esta unidad sube archivos a un servidor remoto usando SFTP.';
  if (unit.zip_id) return 'Esta unidad comprime archivos en un archivo ZIP.';
  if (unit.unzip_id) return 'Esta unidad extrae archivos de un archivo ZIP.';
  if (unit.call_pipeline) return 'Esta unidad llama a otro pipeline para su ejecución.';
  return 'Unidad de pipeline';
}