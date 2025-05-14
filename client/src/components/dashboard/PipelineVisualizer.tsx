import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { executeQuery } from "@/lib/hasura-client";
import { PIPELINE_QUERY, PIPELINE_UNITS_QUERY, COMMAND_QUERY, QUERY_QUEUE_QUERY, QUERY_DETAILS_QUERY, SFTP_DOWNLOADER_QUERY, SFTP_UPLOADER_QUERY, ZIP_QUERY, UNZIP_QUERY } from "@shared/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import PipelineSearch from "./PipelineSearch";

export default function PipelineVisualizer() {
  const [selectedPipeline, setSelectedPipeline] = useState<string | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<any>(null);
  const [unitDetails, setUnitDetails] = useState<any>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filteredPipelines, setFilteredPipelines] = useState<any[]>([]);
  
  // Función para determinar el tipo de unidad
  const getUnitType = (unit: any) => {
    if (!unit) return 'Unknown';
    if (unit.command_id) return 'Command';
    if (unit.query_queue_id) return 'SQL Query';
    if (unit.sftp_downloader_id) return 'SFTP Download';
    if (unit.sftp_uploader_id) return 'SFTP Upload';
    if (unit.zip_id) return 'Zip Files';
    if (unit.unzip_id) return 'Unzip Files';
    if (unit.call_pipeline) return 'Call Pipeline';
    return 'Unit';
  };
  
  // Función para determinar el estado de la unidad (simulado)
  const getUnitStatus = (unit: any, index: number) => {
    // En una aplicación real, esto se basaría en los datos de ejecución de los trabajos
    if (index === 0) return 'completed';
    if (index === 1) return 'completed';
    if (index === 2) return 'running';
    return 'pending';
  };
  
  // Función para ordenar y crear conexiones automáticas entre unidades
  const processUnits = (units: any[]) => {
    if (!units || units.length === 0) return { nodes: [], connections: [] };
    
    // Ordenar unidades por tipo y luego por ID
    const sortedUnits = [...units].sort((a, b) => {
      const typeA = getUnitType(a);
      const typeB = getUnitType(b);
      
      if (typeA !== typeB) {
        return typeA.localeCompare(typeB);
      }
      
      return a.id.localeCompare(b.id);
    });
    
    // Crear nodos con posiciones adecuadas
    const nodes = sortedUnits.map((unit, index) => {
      // Determinar la posición usando un layout automático si es necesario
      let x, y;
      
      if (!unit.posx && !unit.posy) {
        // Disposición automática para el dashboard (horizontal)
        x = (index % 4) * 180 + 10;
        y = Math.floor(index / 4) * 100 + 10;
      } else {
        // Usar coordenadas existentes
        x = unit.posx * 180 + 10;
        y = unit.posy * 100 + 10;
      }
      
      return {
        ...unit,
        posX: x,
        posY: y,
        index
      };
    });
    
    // Crear conexiones automáticas entre nodos consecutivos
    const connections = [];
    if (nodes.length > 1) {
      for (let i = 0; i < nodes.length - 1; i++) {
        connections.push({
          id: `conn-${nodes[i].id}-${nodes[i + 1].id}`,
          source: nodes[i],
          target: nodes[i + 1]
        });
      }
    }
    
    return { nodes, connections };
  };
  
  // Consulta para obtener la lista de pipelines
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
  
  // Establecer el primer pipeline como predeterminado cuando se cargan los datos
  useEffect(() => {
    if (pipelinesData && pipelinesData.length > 0 && !selectedPipeline) {
      setSelectedPipeline(pipelinesData[0].id);
    }
    
    // Actualizar la lista filtrada cuando cambia la búsqueda o los datos
    if (pipelinesData) {
      if (searchQuery.trim() === '') {
        setFilteredPipelines(pipelinesData);
      } else {
        const query = searchQuery.toLowerCase();
        const filtered = pipelinesData.filter(pipeline => 
          pipeline.name.toLowerCase().includes(query) || 
          (pipeline.description && pipeline.description.toLowerCase().includes(query))
        );
        setFilteredPipelines(filtered);
      }
    }
  }, [pipelinesData, selectedPipeline, searchQuery]);
  
  // Consulta para obtener las unidades del pipeline seleccionado
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
  
  // Función para manejar el cambio de pipeline seleccionado
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
            
            if (data) {
              // Para las consultas SQL, obtenemos detalles adicionales
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
  
  // Estado de carga
  if (isPipelinesLoading) {
    return (
      <Card>
        <CardHeader className="border-b border-slate-200 dark:border-slate-700">
          <div className="flex justify-between items-center">
            <CardTitle>Visualización del Pipeline</CardTitle>
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
  
  // Estado de sin pipelines
  if (!pipelinesData || pipelinesData.length === 0) {
    return (
      <Card>
        <CardHeader className="border-b border-slate-200 dark:border-slate-700">
          <CardTitle>Visualización del Pipeline</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="h-[300px] w-full flex items-center justify-center text-slate-500 dark:text-slate-400">
            No hay pipelines disponibles
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // Renderizado principal
  return (
    <Card>
      <CardHeader className="border-b border-slate-200 dark:border-slate-700">
        <div className="flex justify-between items-center">
          <CardTitle>Visualización del Pipeline</CardTitle>
          <PipelineSearch 
            pipelines={pipelinesData || []}
            selectedPipelineId={selectedPipeline}
            onSelectPipeline={handlePipelineChange}
            isLoading={isPipelinesLoading}
          />
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
              No hay unidades definidas para este pipeline
            </div>
          ) : (
            <div className="relative w-full min-w-[800px] h-full">
              {/* Procesamos las unidades para posicionarlas y crear las conexiones */}
              {(() => {
                const { nodes, connections } = processUnits(pipelineUnits);
                
                return (
                  <>
                    {/* Dibujamos primero las conexiones (flechas) */}
                    <svg className="absolute top-0 left-0 w-full h-full pointer-events-none">
                      {connections.map((conn) => {
                        const source = conn.source;
                        const target = conn.target;
                        
                        // Coordenadas del centro de los nodos
                        const sourceX = source.posX + 80; // Ancho aproximado del nodo / 2
                        const sourceY = source.posY + 32; // Alto aproximado del nodo / 2
                        const targetX = target.posX + 20; // Pequeño offset para que la flecha apunte al borde
                        const targetY = target.posY + 32; // Alto aproximado del nodo / 2
                        
                        // Ruta de la curva Bezier
                        const dx = targetX - sourceX;
                        const path = `M ${sourceX},${sourceY} C ${sourceX + dx/2},${sourceY} ${targetX - dx/2},${targetY} ${targetX},${targetY}`;
                        
                        // Estado de la conexión basado en el estado de los nodos
                        const sourceStatus = getUnitStatus(source, source.index);
                        const targetStatus = getUnitStatus(target, target.index);
                        
                        // La conexión está activa si ambos nodos están activos (no pendientes)
                        const isActive = sourceStatus !== 'pending';
                        const isCompleted = sourceStatus === 'completed';
                        
                        return (
                          <g key={conn.id}>
                            {/* Curva principal */}
                            <path 
                              d={path} 
                              fill="none" 
                              strokeWidth={2} 
                              stroke={isCompleted ? '#10b981' : (isActive ? '#60a5fa' : '#9ca3af')}
                              strokeDasharray={isActive ? 'none' : '5,5'} 
                              markerEnd={`url(#arrow-${isCompleted ? 'completed' : (isActive ? 'active' : 'inactive')})`} 
                            />
                          </g>
                        );
                      })}
                      
                      {/* Definición de los marcadores de flecha */}
                      <defs>
                        <marker 
                          id="arrow-active" 
                          viewBox="0 0 10 10" 
                          refX="5" 
                          refY="5"
                          markerWidth="4" 
                          markerHeight="4" 
                          orient="auto-start-reverse"
                        >
                          <path d="M 0 0 L 10 5 L 0 10 z" fill="#60a5fa" />
                        </marker>
                        <marker 
                          id="arrow-completed" 
                          viewBox="0 0 10 10" 
                          refX="5" 
                          refY="5"
                          markerWidth="4" 
                          markerHeight="4" 
                          orient="auto-start-reverse"
                        >
                          <path d="M 0 0 L 10 5 L 0 10 z" fill="#10b981" />
                        </marker>
                        <marker 
                          id="arrow-inactive" 
                          viewBox="0 0 10 10" 
                          refX="5" 
                          refY="5"
                          markerWidth="4" 
                          markerHeight="4" 
                          orient="auto-start-reverse"
                        >
                          <path d="M 0 0 L 10 5 L 0 10 z" fill="#9ca3af" />
                        </marker>
                      </defs>
                    </svg>
                    
                    {/* Dibujamos los nodos (unidades) */}
                    {nodes.map((unit) => {
                      const unitType = getUnitType(unit);
                      const status = getUnitStatus(unit, unit.index);
                      
                      return (
                        <div 
                          key={unit.id}
                          className={`absolute w-36 sm:w-40 h-16 bg-slate-100 dark:bg-slate-700 border-2 ${
                            status === 'completed' ? 'border-green-500 dark:border-green-400' :
                            status === 'running' ? 'border-amber-500 dark:border-amber-400' :
                            'border-slate-300 dark:border-slate-600'
                          } rounded-lg p-2 sm:p-3 shadow-sm ${status === 'pending' ? 'opacity-60' : ''} cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors`}
                          style={{ top: `${unit.posY}px`, left: `${unit.posX}px` }}
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
                  </>
                );
              })()}
            </div>
          )}
        </div>
        <div className="text-xs text-center text-slate-500 mt-2 italic">Desliza para ver el flujo completo</div>
        
        {/* Diálogo para mostrar detalles de la unidad */}
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
                        {/* Detalles específicos según el tipo de unidad */}
                        {unitDetails.type === 'SQL Query' && (
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
                              // Si no hay consultas relacionadas
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
                          </>
                        )}
                        
                        {/* Detalles para Commands */}
                        {unitDetails.type === 'Command' && (
                          <>
                            <div>
                              <p className="text-sm font-medium mb-1">Comando:</p>
                              <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-md border border-slate-200 dark:border-slate-700 text-xs font-mono overflow-auto max-h-32 whitespace-pre">
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
                                <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-md border border-slate-200 dark:border-slate-700 text-xs font-mono overflow-auto max-h-32 whitespace-pre">
                                  {unitDetails.details.raw_script}
                                </div>
                              </div>
                            )}
                            
                            <div className="grid grid-cols-2 gap-2 text-xs mt-2">
                              <div>
                                <span className="font-medium">Instante:</span> {unitDetails.details.instant ? 'Sí' : 'No'}
                              </div>
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
                        
                        {/* Detalles para SFTP Download */}
                        {unitDetails.type === 'SFTP Download' && (
                          <>
                            <div>
                              <p className="text-sm font-medium mb-1">Output:</p>
                              <p className="text-sm bg-slate-100 dark:bg-slate-700 p-2 rounded">{unitDetails.details.output}</p>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-2 text-xs mt-2">
                              <div>
                                <span className="font-medium">Link ID:</span> {unitDetails.details.sftp_link_id}
                              </div>
                              <div>
                                <span className="font-medium">Retornar salida:</span> {unitDetails.details.return_output ? 'Sí' : 'No'}
                              </div>
                            </div>
                          </>
                        )}
                        
                        {/* Detalles para SFTP Upload */}
                        {unitDetails.type === 'SFTP Upload' && (
                          <>
                            <div>
                              <p className="text-sm font-medium mb-1">Input:</p>
                              <p className="text-sm bg-slate-100 dark:bg-slate-700 p-2 rounded">{unitDetails.details.input}</p>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-2 text-xs mt-2">
                              <div>
                                <span className="font-medium">Link ID:</span> {unitDetails.details.sftp_link_id}
                              </div>
                              <div>
                                <span className="font-medium">Retornar salida:</span> {unitDetails.details.return_output ? 'Sí' : 'No'}
                              </div>
                            </div>
                          </>
                        )}
                        
                        {/* Detalles para Zip Files */}
                        {unitDetails.type === 'Zip Files' && (
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
                        
                        {/* Detalles para Unzip Files */}
                        {unitDetails.type === 'Unzip Files' && (
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
                        
                        {/* Detalles para Call Pipeline */}
                        {unitDetails.type === 'Call Pipeline' && (
                          <>
                            <div>
                              <p className="text-sm font-medium mb-1">Pipeline llamado:</p>
                              <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-md border border-slate-200 dark:border-slate-700">
                                <p className="text-sm font-medium">{unitDetails.details.name}</p>
                                {unitDetails.details.description && (
                                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{unitDetails.details.description}</p>
                                )}
                                <div className="mt-2 space-y-1 text-xs">
                                  <p><span className="font-medium">ID:</span> {unitDetails.details.id}</p>
                                  <p><span className="font-medium">Agente:</span> {unitDetails.details.agent_passport_id}</p>
                                  <p><span className="font-medium">Abortar con error:</span> {unitDetails.details.abort_on_error ? 'Sí' : 'No'}</p>
                                  
                                  <div className="grid grid-cols-2 gap-2 text-xs mt-1">
                                    <div>
                                      <span className="font-medium">Creado:</span> {new Date(unitDetails.details.created_at).toLocaleString()}
                                    </div>
                                    <div>
                                      <span className="font-medium">Actualizado:</span> {new Date(unitDetails.details.updated_at).toLocaleString()}
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
                        
                        {/* Si no hay detalles específicos */}
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