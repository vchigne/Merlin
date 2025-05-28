import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { executeQuery } from "@/lib/hasura-client";
import { PIPELINE_QUERY, PIPELINE_UNITS_QUERY, COMMAND_QUERY, QUERY_QUEUE_QUERY, QUERY_DETAILS_QUERY, SFTP_DOWNLOADER_QUERY, SFTP_UPLOADER_QUERY, ZIP_QUERY, UNZIP_QUERY } from "@shared/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle } from "lucide-react";
import PipelineSearch from "./PipelineSearch";
import UnifiedPipelineUnitDialog from "@/components/ui/UnifiedPipelineUnitDialog";

export default function PipelineVisualizerNew() {
  const [selectedPipeline, setSelectedPipeline] = useState<string | null>(null);
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [selectedUnitType, setSelectedUnitType] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Función mejorada para detectar el tipo y categoría de unidad
  const detectUnitType = (unit: any) => {
    if (!unit) return { type: 'Unknown', category: 'unknown' };
    
    // SFTP Estándar
    if (unit.sftp_downloader_id) return { type: 'SFTP Download', category: 'standard' };
    if (unit.sftp_uploader_id) return { type: 'SFTP Upload', category: 'standard' };
    
    // SFTP FileStream (las unidades problemáticas)
    if (unit.file_stream_sftp_downloader_id) return { type: 'SFTP Download', category: 'filestream' };
    if (unit.file_stream_sftp_uploader_id) return { type: 'SFTP Upload', category: 'filestream' };
    
    // Otros tipos estándar
    if (unit.command_id) return { type: 'Command', category: 'standard' };
    if (unit.query_queue_id) return { type: 'SQL Query', category: 'standard' };
    if (unit.zip_id) return { type: 'Zip Files', category: 'standard' };
    if (unit.unzip_id) return { type: 'Unzip Files', category: 'standard' };
    if (unit.call_pipeline) return { type: 'Call Pipeline', category: 'standard' };
    
    return { type: 'Unit', category: 'unknown' };
  };

  // Función de compatibilidad con el código existente
  const getUnitType = (unit: any) => {
    return detectUnitType(unit).type;
  };
  
  // Función para determinar el estado de la unidad (simulado)
  const getUnitStatus = (unit: any, index: number) => {
    // En una aplicación real, esto se basaría en los datos de ejecución de los trabajos
    if (index === 0) return 'completed';
    if (index === 1) return 'completed';
    if (index === 2) return 'running';
    return 'pending';
  };
  
  // Sistema de estilos diferenciados para conexiones
  const getConnectionStyle = (sourceUnit: any, targetUnit: any) => {
    const sourceType = detectUnitType(sourceUnit);
    const targetType = detectUnitType(targetUnit);
    
    // Conexiones principales (verde continuo) - flujo estándar
    if (sourceType.category === 'standard' && targetType.category === 'standard') {
      return { 
        color: '#10b981', 
        style: 'solid', 
        width: 2,
        strokeDasharray: 'none'
      };
    }
    
    // Conexiones FileStream (naranja continuo)
    if (sourceType.category === 'filestream' || targetType.category === 'filestream') {
      return { 
        color: '#f97316', 
        style: 'solid', 
        width: 2,
        strokeDasharray: 'none'
      };
    }
    
    // Conexiones mixtas (azul continuo)
    if (sourceType.category !== targetType.category) {
      return { 
        color: '#3b82f6', 
        style: 'solid', 
        width: 2,
        strokeDasharray: 'none'
      };
    }
    
    // Conexiones auxiliares (gris discontinuo) - por defecto
    return { 
      color: '#6b7280', 
      style: 'dashed', 
      width: 1,
      strokeDasharray: '5,5'
    };
  };

  // Sistema de construcción de conexiones jerárquicas
  const buildHierarchicalConnections = (units: any[]) => {
    const connections = [];
    const unitMap = new Map(units.map(unit => [unit.id, unit]));
    
    // Crear conexiones basadas en pipeline_unit_id (el campo correcto)
    units.forEach(unit => {
      if (unit.pipeline_unit_id && unitMap.has(unit.pipeline_unit_id)) {
        const parentUnit = unitMap.get(unit.pipeline_unit_id);
        const connectionStyle = getConnectionStyle(parentUnit, unit);
        
        connections.push({
          id: `conn-${parentUnit.id}-${unit.id}`,
          source: parentUnit,
          target: unit,
          type: 'hierarchical',
          style: connectionStyle
        });
      }
    });
    
    // Si no hay suficientes conexiones jerárquicas, crear conexiones por orden lógico
    if (connections.length < units.length - 1) {
      const unconnectedUnits = units.filter(unit => 
        !connections.some(conn => conn.target.id === unit.id)
      );
      
      for (let i = 0; i < unconnectedUnits.length - 1; i++) {
        const source = unconnectedUnits[i];
        const target = unconnectedUnits[i + 1];
        const connectionStyle = getConnectionStyle(source, target);
        
        // Solo agregar si no existe ya una conexión
        if (!connections.some(conn => 
          conn.source.id === source.id && conn.target.id === target.id
        )) {
          connections.push({
            id: `conn-${source.id}-${target.id}`,
            source,
            target,
            type: 'sequential',
            style: connectionStyle
          });
        }
      }
    }
    
    return connections;
  };

  // Función para ordenar unidades según jerarquía
  const sortUnitsByHierarchy = (units: any[]) => {
    const unitMap = new Map(units.map(unit => [unit.id, unit]));
    const visited = new Set();
    const result = [];
    
    // Función recursiva para construir orden jerárquico
    const buildHierarchy = (unitId: string, depth = 0) => {
      if (visited.has(unitId) || !unitMap.has(unitId)) return;
      
      const unit = unitMap.get(unitId);
      visited.add(unitId);
      unit.hierarchyDepth = depth;
      result.push(unit);
      
      // Buscar hijos de esta unidad
      const children = units.filter(u => u.pipeline_unit_id === unitId);
      children.forEach(child => buildHierarchy(child.id, depth + 1));
    };
    
    // Encontrar unidades raíz (sin parent)
    const rootUnits = units.filter(unit => !unit.pipeline_unit_id);
    
    // Construir jerarquía desde cada raíz
    rootUnits.forEach(root => buildHierarchy(root.id, 0));
    
    // Agregar unidades sin jerarquía al final
    units.forEach(unit => {
      if (!visited.has(unit.id)) {
        unit.hierarchyDepth = 999;
        result.push(unit);
      }
    });
    
    return result;
  };

  // Algoritmo mejorado de posicionamiento y procesamiento
  const processUnits = (units: any[]) => {
    if (!units || units.length === 0) return { nodes: [], connections: [] };
    
    // 1. Detectar tipos y categorías de todas las unidades
    const unitsWithTypes = units.map(unit => ({
      ...unit,
      unitType: detectUnitType(unit),
      displayType: getUnitType(unit),
      status: getUnitStatus(unit, units.indexOf(unit))
    }));
    
    // 2. Ordenar por jerarquía en lugar de por categorías
    const orderedUnits = sortUnitsByHierarchy(unitsWithTypes);
    
    // 3. Posicionamiento jerárquico horizontal
    const SPACING_X = window.innerWidth < 640 ? 150 : 180;
    const SPACING_Y = 50;
    
    // Posicionar todas las unidades en orden jerárquico horizontal
    const allNodes = orderedUnits.map((unit, index) => ({
      ...unit,
      posX: index * SPACING_X + 10,
      posY: 50, // Una sola fila horizontal para mostrar el flujo secuencial
      type: unit.displayType,
      index
    }));
    
    // 4. Construir conexiones jerárquicas
    const connections = buildHierarchicalConnections(allNodes);
    
    return { nodes: allNodes, connections };
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
      } else if (unit.file_stream_sftp_downloader_id) {
        // Manejar FileStream SFTP Downloader
        query = SFTP_DOWNLOADER_QUERY; // Usar la misma query por ahora
        variables = { id: unit.file_stream_sftp_downloader_id };
      } else if (unit.file_stream_sftp_uploader_id) {
        // Manejar FileStream SFTP Uploader
        query = SFTP_UPLOADER_QUERY; // Usar la misma query por ahora
        variables = { id: unit.file_stream_sftp_uploader_id };
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
        // Determinar el tipo para mostrar en la interfaz
        const type = getUnitType(unit);
        let unitInfo = {
          type,
          name: unit.comment || `${type} Unit`,
          description: unit.comment || `Unidad de tipo ${type}`,
          details: unit
        };

        if (result.data && !result.errors) {
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
          } else if (unit.file_stream_sftp_downloader_id) {
            // Para FileStream, los datos podrían estar en un campo diferente
            data = result.data.merlin_agent_SFTPDownloader[0] || result.data.merlin_agent_FileStreamSftpDownloader?.[0];
          } else if (unit.file_stream_sftp_uploader_id) {
            // Para FileStream, los datos podrían estar en un campo diferente
            data = result.data.merlin_agent_SFTPUploader[0] || result.data.merlin_agent_FileStreamSftpUploader?.[0];
          } else if (unit.zip_id) {
            data = result.data.merlin_agent_Zip[0];
          } else if (unit.unzip_id) {
            data = result.data.merlin_agent_UnZip[0];
          }
          
          if (data) {
            unitInfo = {
              type,
              name: data.name || data.comment || unit.comment || `${type} Unit`,
              description: data.description || data.comment || unit.comment || `Unidad de tipo ${type}`,
              details: data
            };
          }
        } else if (result.errors) {
          console.error("Error en consulta GraphQL:", result.errors);
          // Mostrar información básica aunque la consulta falle
          unitInfo.description = `${type} - ${unit.comment || 'Información detallada no disponible temporalmente'}`;
        }
        
        setUnitDetails(unitInfo);
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
                    {/* Dibujamos primero las conexiones (flechas) con estilos diferenciados */}
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
                        
                        // Usar el estilo diferenciado basado en los tipos de unidades
                        const connectionStyle = conn.style || getConnectionStyle(source, target);
                        
                        // Estado de la conexión basado en el estado de los nodos
                        const sourceStatus = getUnitStatus(source, source.index);
                        const isActive = sourceStatus !== 'pending';
                        const isCompleted = sourceStatus === 'completed';
                        
                        // Determinar el identificador del marcador
                        const markerId = connectionStyle.color === '#10b981' ? 'arrow-standard' :
                                        connectionStyle.color === '#f97316' ? 'arrow-filestream' :
                                        connectionStyle.color === '#3b82f6' ? 'arrow-mixed' :
                                        'arrow-auxiliary';
                        
                        return (
                          <g key={conn.id}>
                            {/* Curva principal con estilos diferenciados */}
                            <path 
                              d={path} 
                              fill="none" 
                              strokeWidth={connectionStyle.width} 
                              stroke={connectionStyle.color}
                              strokeDasharray={connectionStyle.strokeDasharray} 
                              markerEnd={`url(#${markerId})`}
                              opacity={isActive ? 1 : 0.6}
                            />
                          </g>
                        );
                      })}
                      
                      {/* Definición de los marcadores de flecha diferenciados */}
                      <defs>
                        {/* Flecha para conexiones estándar (verde) */}
                        <marker 
                          id="arrow-standard" 
                          viewBox="0 0 10 10" 
                          refX="5" 
                          refY="5"
                          markerWidth="4" 
                          markerHeight="4" 
                          orient="auto-start-reverse"
                        >
                          <path d="M 0 0 L 10 5 L 0 10 z" fill="#10b981" />
                        </marker>
                        
                        {/* Flecha para conexiones FileStream (naranja) */}
                        <marker 
                          id="arrow-filestream" 
                          viewBox="0 0 10 10" 
                          refX="5" 
                          refY="5"
                          markerWidth="4" 
                          markerHeight="4" 
                          orient="auto-start-reverse"
                        >
                          <path d="M 0 0 L 10 5 L 0 10 z" fill="#f97316" />
                        </marker>
                        
                        {/* Flecha para conexiones mixtas (azul) */}
                        <marker 
                          id="arrow-mixed" 
                          viewBox="0 0 10 10" 
                          refX="5" 
                          refY="5"
                          markerWidth="4" 
                          markerHeight="4" 
                          orient="auto-start-reverse"
                        >
                          <path d="M 0 0 L 10 5 L 0 10 z" fill="#3b82f6" />
                        </marker>
                        
                        {/* Flecha para conexiones auxiliares (gris) */}
                        <marker 
                          id="arrow-auxiliary" 
                          viewBox="0 0 10 10" 
                          refX="5" 
                          refY="5"
                          markerWidth="4" 
                          markerHeight="4" 
                          orient="auto-start-reverse"
                        >
                          <path d="M 0 0 L 10 5 L 0 10 z" fill="#6b7280" />
                        </marker>
                      </defs>
                    </svg>
                    
                    {/* Dibujamos los nodos (unidades) con estilos diferenciados */}
                    {nodes.map((unit) => {
                      const unitType = getUnitType(unit);
                      const unitTypeInfo = detectUnitType(unit);
                      const status = getUnitStatus(unit, unit.index);
                      
                      // Determinar el color del borde basado en el tipo de unidad
                      let borderColor = '';
                      if (status === 'completed') {
                        borderColor = 'border-green-500 dark:border-green-400';
                      } else if (status === 'running') {
                        borderColor = 'border-amber-500 dark:border-amber-400';
                      } else {
                        // Bordes específicos por tipo cuando no están en ejecución
                        if (unitTypeInfo.type === 'SFTP Download' || unitTypeInfo.type === 'SFTP Upload') {
                          borderColor = 'border-orange-500 dark:border-orange-400'; // Naranja para todas las unidades SFTP
                        } else if (unitTypeInfo.type === 'Command') {
                          borderColor = 'border-green-500 dark:border-green-400'; // Verde para comandos
                        } else if (unitTypeInfo.type === 'SQL Query') {
                          borderColor = 'border-blue-500 dark:border-blue-400'; // Azul para SQL
                        } else {
                          borderColor = 'border-slate-300 dark:border-slate-600'; // Gris por defecto
                        }
                      }
                      
                      return (
                        <div 
                          key={unit.id}
                          className={`absolute w-32 xs:w-36 sm:w-40 h-14 sm:h-16 bg-slate-100 dark:bg-slate-700 border-2 ${borderColor} rounded-md shadow-sm transition-all duration-200 hover:shadow-md cursor-pointer text-xs sm:text-sm`}
                          style={{ 
                            left: `${unit.posX}px`, 
                            top: `${unit.posY}px` 
                          }}
                          onClick={() => {
                            setSelectedUnitId(unit.id);
                            setSelectedUnitType(getUnitType(unit));
                            setDialogOpen(true);
                          }}
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

      {/* Diálogo unificado para detalles de unidades */}
      <UnifiedPipelineUnitDialog
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        unitId={selectedUnitId}
        unitType={selectedUnitType}
      />
    </Card>
  );
}