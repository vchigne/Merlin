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

export default function PipelineVisualizerNew() {
  const [selectedPipeline, setSelectedPipeline] = useState<string | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<any>(null);
  const [unitDetails, setUnitDetails] = useState<any>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

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
        // Disposición automática responsiva para el dashboard
        const columnCount = window.innerWidth < 640 ? 2 : window.innerWidth < 1024 ? 3 : 4;
        const spacing = window.innerWidth < 640 ? 150 : 180;
        
        x = (index % columnCount) * spacing + 10;
        y = Math.floor(index / columnCount) * 100 + 10;
      } else {
        // Usar coordenadas existentes con ajustes responsivos
        const spacing = window.innerWidth < 640 ? 150 : 180;
        
        x = unit.posx * spacing + 10;
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
  }, [pipelinesData, selectedPipeline]);
  
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
        <div className="relative w-full h-[300px] overflow-auto pb-4">
          {isUnitsLoading ? (
            <div className="flex items-center justify-center h-full">
              <Skeleton className="h-full w-full rounded-lg" />
            </div>
          ) : !pipelineUnits || pipelineUnits.length === 0 ? (
            <div className="flex items-center justify-center h-full text-slate-500 dark:text-slate-400">
              No hay unidades definidas para este pipeline
            </div>
          ) : (
            <div className="relative w-full min-w-[400px] md:min-w-[600px] lg:min-w-[800px] h-full">
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
                          className={`absolute w-32 xs:w-36 sm:w-40 h-14 sm:h-16 bg-slate-100 dark:bg-slate-700 border-2 ${
                            status === 'completed' ? 'border-green-500 dark:border-green-400' :
                            status === 'running' ? 'border-amber-500 dark:border-amber-400' :
                            'border-slate-300 dark:border-slate-600'
                          } rounded-md shadow-sm transition-all duration-200 hover:shadow-md cursor-pointer text-xs sm:text-sm`}
                          style={{ 
                            left: `${unit.posX}px`, 
                            top: `${unit.posY}px` 
                          }}
                          onClick={() => fetchUnitDetails(unit)}
                        >
                          <div className="p-2 h-full flex flex-col justify-center">
                            <div className="font-medium text-slate-800 dark:text-slate-200 text-sm whitespace-nowrap overflow-hidden text-ellipsis">
                              {unitType}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap overflow-hidden text-ellipsis">
                              {unit.comment || 'Sin descripción'}
                            </div>
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
      </CardContent>

      {/* Modal de detalles de la unidad */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl">
          {unitDetails ? (
            <>
              <DialogHeader>
                <DialogTitle>
                  {unitDetails.name}
                  <span className="text-xs ml-2 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded">
                    {unitDetails.type}
                  </span>
                </DialogTitle>
                {unitDetails.description && (
                  <DialogDescription>
                    {unitDetails.description}
                  </DialogDescription>
                )}
              </DialogHeader>
              
              <div className="space-y-4">
                {/* Mostrar los detalles según el tipo de unidad */}
                {unitDetails.type === 'Command' && unitDetails.details && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Detalles del Comando</h4>
                    <div className="bg-slate-50 dark:bg-slate-800 rounded-md p-3 text-xs font-mono">
                      <div><span className="text-sky-600 dark:text-sky-400">Objetivo:</span> {unitDetails.details.target || 'N/A'}</div>
                      <div><span className="text-sky-600 dark:text-sky-400">Directorio:</span> {unitDetails.details.working_directory || 'N/A'}</div>
                      <div><span className="text-sky-600 dark:text-sky-400">Argumentos:</span> {unitDetails.details.args || 'N/A'}</div>
                      {unitDetails.details.raw_script && (
                        <div className="mt-2">
                          <div className="text-sky-600 dark:text-sky-400">Script:</div>
                          <pre className="overflow-x-auto p-2 mt-1 bg-slate-100 dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-700">
                            {unitDetails.details.raw_script}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                {unitDetails.type === 'SQL Query' && unitDetails.details && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Detalles de Consulta SQL</h4>
                    {unitDetails.details.Queries ? (
                      <div className="space-y-3">
                        {unitDetails.details.Queries.map((query: any) => (
                          <div key={query.id} className="bg-slate-50 dark:bg-slate-800 rounded-md p-3">
                            <div className="text-xs mb-1">
                              <span className="font-medium">{query.name}</span> 
                              {query.order && <span className="text-slate-500 ml-2">Orden: {query.order}</span>}
                            </div>
                            <pre className="overflow-x-auto text-xs font-mono p-2 bg-slate-100 dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-700">
                              {query.query_string}
                            </pre>
                            {query.path && (
                              <div className="mt-1 text-xs text-slate-500">
                                Ruta de salida: {query.path}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-24 bg-slate-50 dark:bg-slate-800 rounded-md">
                        <div className="text-slate-500 dark:text-slate-400 text-sm flex items-center">
                          <AlertCircle className="mr-2 h-4 w-4" />
                          No se pudieron cargar los detalles de las consultas
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                {unitDetails.type === 'SFTP Download' && unitDetails.details && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Detalles de Descarga SFTP</h4>
                    <div className="bg-slate-50 dark:bg-slate-800 rounded-md p-3 text-xs">
                      <div><span className="text-sky-600 dark:text-sky-400 font-medium">Carpeta de destino:</span> {unitDetails.details.output || 'N/A'}</div>
                      {unitDetails.details.SFTPLink ? (
                        <div className="space-y-1">
                          <div><span className="text-sky-600 dark:text-sky-400 font-medium">Servidor SFTP:</span> {unitDetails.details.SFTPLink.name || unitDetails.details.SFTPLink.server || 'Sin especificar'}</div>
                          {unitDetails.details.SFTPLink.server && (
                            <div><span className="text-sky-600 dark:text-sky-400 font-medium">Dirección:</span> {unitDetails.details.SFTPLink.server}:{unitDetails.details.SFTPLink.port || 22}</div>
                          )}
                          {unitDetails.details.SFTPLink.user && (
                            <div><span className="text-sky-600 dark:text-sky-400 font-medium">Usuario:</span> {unitDetails.details.SFTPLink.user}</div>
                          )}
                        </div>
                      ) : (
                        <div><span className="text-sky-600 dark:text-sky-400 font-medium">Conector SFTP:</span> {unitDetails.details.sftp_link_id || 'N/A'}</div>
                      )}
                    </div>
                  </div>
                )}
                
                {unitDetails.type === 'SFTP Upload' && unitDetails.details && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Detalles de Subida SFTP</h4>
                    <div className="bg-slate-50 dark:bg-slate-800 rounded-md p-3 text-xs">
                      <div><span className="text-sky-600 dark:text-sky-400 font-medium">Carpeta de origen:</span> {unitDetails.details.input || 'N/A'}</div>
                      {unitDetails.details.SFTPLink ? (
                        <div className="space-y-1">
                          <div><span className="text-sky-600 dark:text-sky-400 font-medium">Servidor SFTP:</span> {unitDetails.details.SFTPLink.name || unitDetails.details.SFTPLink.server || 'Sin especificar'}</div>
                          {unitDetails.details.SFTPLink.server && (
                            <div><span className="text-sky-600 dark:text-sky-400 font-medium">Dirección:</span> {unitDetails.details.SFTPLink.server}:{unitDetails.details.SFTPLink.port || 22}</div>
                          )}
                          {unitDetails.details.SFTPLink.user && (
                            <div><span className="text-sky-600 dark:text-sky-400 font-medium">Usuario:</span> {unitDetails.details.SFTPLink.user}</div>
                          )}
                        </div>
                      ) : (
                        <div><span className="text-sky-600 dark:text-sky-400 font-medium">Conector SFTP:</span> {unitDetails.details.sftp_link_id || 'N/A'}</div>
                      )}
                    </div>
                  </div>
                )}
                
                {unitDetails.type === 'Zip Files' && unitDetails.details && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Detalles de Compresión</h4>
                    <div className="bg-slate-50 dark:bg-slate-800 rounded-md p-3 text-xs">
                      <div><span className="text-sky-600 dark:text-sky-400 font-medium">Archivo de salida:</span> {unitDetails.details.output || 'N/A'}</div>
                    </div>
                  </div>
                )}
                
                {unitDetails.type === 'Unzip Files' && unitDetails.details && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Detalles de Descompresión</h4>
                    <div className="bg-slate-50 dark:bg-slate-800 rounded-md p-3 text-xs">
                      <div><span className="text-sky-600 dark:text-sky-400 font-medium">Archivo de entrada:</span> {unitDetails.details.input || 'N/A'}</div>
                      <div><span className="text-sky-600 dark:text-sky-400 font-medium">Carpeta de salida:</span> {unitDetails.details.output || 'N/A'}</div>
                    </div>
                  </div>
                )}
                
                {unitDetails.type === 'Call Pipeline' && unitDetails.details && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Detalles de Llamada a Pipeline</h4>
                    <div className="bg-slate-50 dark:bg-slate-800 rounded-md p-3 text-xs">
                      <div><span className="text-sky-600 dark:text-sky-400 font-medium">Pipeline:</span> {unitDetails.details.name || 'N/A'}</div>
                      {unitDetails.details.description && (
                        <div><span className="text-sky-600 dark:text-sky-400 font-medium">Descripción:</span> {unitDetails.details.description}</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              <DialogFooter>
                <Button onClick={() => setDialogOpen(false)}>Cerrar</Button>
              </DialogFooter>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-40">
              <Skeleton className="h-8 w-3/4 mb-4" />
              <Skeleton className="h-4 w-1/2 mb-2" />
              <Skeleton className="h-24 w-full" />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}