import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { executeQuery } from "@/lib/hasura-client";
import { PIPELINE_QUERY, PIPELINE_UNITS_QUERY } from "@shared/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle } from "lucide-react";
import PipelineSearch from "./PipelineSearch";
import UnifiedPipelineUnitDialog from "@/components/ui/UnifiedPipelineUnitDialog";

interface PipelineVisualizerNewProps {
  pipelineId?: string; // Pipeline específico a mostrar
  showSelector?: boolean; // Si mostrar el selector de pipeline (default: true)
}

export default function PipelineVisualizerNew({ 
  pipelineId: propPipelineId, 
  showSelector = true 
}: PipelineVisualizerNewProps = {}) {
  const [selectedPipeline, setSelectedPipeline] = useState<string | null>(propPipelineId || null);
  const [selectedUnit, setSelectedUnit] = useState<any>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  
  // NUEVO: Referencias y posiciones para conexiones CSS
  const containerRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const [nodePositions, setNodePositions] = useState<{ [key: string]: { x: number, y: number, width: number, height: number } }>({});
  
  // NUEVO: Estados para drag and drop
  const [isDragging, setIsDragging] = useState(false);
  const [draggedUnit, setDraggedUnit] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [unitPositions, setUnitPositions] = useState<{ [key: string]: { x: number, y: number } }>({});
  // NUEVO: Estado para conexiones dinámicas que se actualiza durante el drag
  const [dynamicConnections, setDynamicConnections] = useState<any[]>([]);

  // Efecto para actualizar el pipeline seleccionado cuando cambia la prop
  useEffect(() => {
    if (propPipelineId) {
      setSelectedPipeline(propPipelineId);
    }
  }, [propPipelineId]);

  // NUEVO: Función para calcular posiciones reales del DOM
  const updateNodePositions = () => {
    if (!containerRef.current) return;
    
    const containerRect = containerRef.current.getBoundingClientRect();
    const newPositions: { [key: string]: { x: number, y: number, width: number, height: number } } = {};
    
    Object.entries(nodeRefs.current).forEach(([nodeId, nodeElement]) => {
      if (nodeElement) {
        const rect = nodeElement.getBoundingClientRect();
        newPositions[nodeId] = {
          x: rect.left - containerRect.left,
          y: rect.top - containerRect.top,
          width: rect.width,
          height: rect.height
        };
      }
    });
    
    setNodePositions(newPositions);
  };

  // NUEVO: Efecto para actualizar conexiones cuando cambien las posiciones de las unidades
  useEffect(() => {
    updateNodePositions();
  }, [unitPositions]);



  // NUEVO: Función para calcular conexiones SVG curvas entre nodos (estilo n8n)
  const calculateSVGConnections = (nodes: any[]) => {
    const connections = [];
    
    for (let i = 0; i < nodes.length - 1; i++) {
      const currentNode = nodes[i];
      const nextNode = nodes[i + 1];
      
      const currentPos = nodePositions[currentNode.id];
      const nextPos = nodePositions[nextNode.id];
      
      if (currentPos && nextPos) {
        // Usar posiciones dinámicas si la unidad ha sido arrastrada
        const currentUnitPos = unitPositions[currentNode.id];
        const nextUnitPos = unitPositions[nextNode.id];
        
        // Calcular puntos de conexión
        const startX = (currentUnitPos?.x ?? currentPos.x) + currentPos.width / 2;
        const startY = (currentUnitPos?.y ?? currentPos.y) + currentPos.height;
        const endX = (nextUnitPos?.x ?? nextPos.x) + nextPos.width / 2;
        const endY = (nextUnitPos?.y ?? nextPos.y);
        
        // Calcular puntos de control para la curva Bézier
        const controlOffset = Math.abs(endY - startY) * 0.5; // Offset dinámico basado en distancia
        const control1X = startX;
        const control1Y = startY + controlOffset;
        const control2X = endX;
        const control2Y = endY - controlOffset;
        
        // Crear path SVG con curva suave
        const pathData = `M ${startX} ${startY} C ${control1X} ${control1Y}, ${control2X} ${control2Y}, ${endX} ${endY}`;
        
        connections.push({
          id: `svg-curve-${i}`,
          pathData,
          startX,
          startY,
          endX,
          endY,
          color: `hsl(${(i * 60) % 360}, 70%, 50%)`, // Colores más variados
          strokeWidth: 3,
          // Agregar marcador de flecha al final
          hasArrow: true
        });
      }
    }
    
    return connections;
  };

  // NUEVO: Effect para actualizar posiciones cuando cambie el pipeline
  useEffect(() => {
    const timer = setTimeout(() => {
      updateNodePositions();
    }, 100); // Pequeño delay para asegurar que el DOM esté renderizado
    
    return () => clearTimeout(timer);
  }, [selectedPipeline]);

  // Función para obtener el color del tipo de unidad
  const getUnitTypeColor = (unitType: string): string => {
    switch(unitType) {
      case 'Command': return '#10B981';
      case 'Query Queue': 
      case 'SQL Query': return '#3B82F6';
      case 'SFTP Download': return '#8B5CF6';
      case 'SFTP Upload': return '#F59E0B';
      case 'Zip': 
      case 'Zip Files': return '#EF4444';
      case 'Unzip': 
      case 'Unzip Files': return '#EC4899';
      case 'Pipeline Call': return '#6366F1';
      default: return '#6B7280';
    }
  };

  // Función para detectar el tipo de unidad
  const detectUnitType = (unit: any) => {
    if (unit.command_id) return { type: 'Command', category: 'standard' };
    if (unit.query_queue_id) return { type: 'SQL Query', category: 'standard' };
    if (unit.sftp_downloader_id) return { type: 'SFTP Download', category: 'standard' };
    if (unit.sftp_uploader_id) return { type: 'SFTP Upload', category: 'standard' };
    if (unit.zip_id) return { type: 'Zip Files', category: 'standard' };
    if (unit.unzip_id) return { type: 'Unzip Files', category: 'standard' };
    if (unit.call_pipeline) return { type: 'Pipeline Call', category: 'standard' };
    return { type: 'Unknown', category: 'unknown' };
  };

  // Hook para obtener datos de entidades
  const [entityData, setEntityData] = useState<{ [key: string]: any }>({});

  // Función para obtener datos de entidad por ID y tipo
  const fetchEntityData = async (id: string, type: string) => {
    const cacheKey = `${type}_${id}`;
    if (entityData[cacheKey]) return entityData[cacheKey];

    let query = '';
    let queryName = '';
    
    switch (type) {
      case 'Command':
        query = 'query GetCommandById($id: uuid!) { merlin_agent_Command_by_pk(id: $id) { id name description } }';
        queryName = 'merlin_agent_Command_by_pk';
        break;
      case 'QueryQueue':
        query = 'query GetQueryQueueById($id: uuid!) { merlin_agent_QueryQueue_by_pk(id: $id) { id name description } }';
        queryName = 'merlin_agent_QueryQueue_by_pk';
        break;
      case 'SFTPDownloader':
        query = 'query GetSFTPDownloaderById($id: uuid!) { merlin_agent_SFTPDownloader_by_pk(id: $id) { id name description } }';
        queryName = 'merlin_agent_SFTPDownloader_by_pk';
        break;
      case 'SFTPUploader':
        query = 'query GetSFTPUploaderById($id: uuid!) { merlin_agent_SFTPUploader_by_pk(id: $id) { id name description } }';
        queryName = 'merlin_agent_SFTPUploader_by_pk';
        break;
      case 'Zip':
        query = 'query GetZipById($id: uuid!) { merlin_agent_Zip_by_pk(id: $id) { id name description } }';
        queryName = 'merlin_agent_Zip_by_pk';
        break;
      case 'Unzip':
        query = 'query GetUnzipById($id: uuid!) { merlin_agent_Unzip_by_pk(id: $id) { id name description } }';
        queryName = 'merlin_agent_Unzip_by_pk';
        break;
      case 'Pipeline':
        query = 'query GetPipelineById($id: uuid!) { merlin_agent_Pipeline_by_pk(id: $id) { id name description } }';
        queryName = 'merlin_agent_Pipeline_by_pk';
        break;
      default:
        return null;
    }

    try {
      const response = await fetch('/api/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, variables: { id } })
      });
      const result = await response.json();
      const data = result.data?.[queryName];
      
      setEntityData(prev => ({ ...prev, [cacheKey]: data }));
      return data;
    } catch (error) {
      console.error(`Error fetching ${type} data:`, error);
      return null;
    }
  };

  // Función para obtener el nombre para mostrar
  const getDisplayName = (unit: any) => {
    const type = detectUnitType(unit);
    
    if (unit.command_id && unit.Command) {
      return unit.Command.name || `Comando ${unit.id?.slice(-4) || 'CMD'}`;
    }
    if (unit.query_queue_id && unit.QueryQueue) {
      return unit.QueryQueue.name || `Cola de consultas ${unit.id?.slice(-4) || 'SQL'}`;
    }
    if (unit.sftp_downloader_id && unit.SFTPDownloader) {
      return unit.SFTPDownloader.name || `Descarga SFTP ${unit.id?.slice(-4) || 'DWN'}`;
    }
    if (unit.sftp_uploader_id && unit.SFTPUploader) {
      return unit.SFTPUploader.name || `Subida SFTP ${unit.id?.slice(-4) || 'UPL'}`;
    }
    if (unit.zip_id && unit.Zip) {
      return unit.Zip.name || `Compresión ZIP ${unit.id?.slice(-4) || 'ZIP'}`;
    }
    if (unit.unzip_id && unit.Unzip) {
      return unit.Unzip.name || `Extracción ${unit.id?.slice(-4) || 'UNZ'}`;
    }
    if (unit.call_pipeline && unit.Pipeline) {
      return unit.Pipeline.name || `Pipeline ${unit.id?.slice(-4) || 'PIP'}`;
    }
    
    // Fallback para casos donde no hay relación disponible
    if (unit.command_id) {
      return `Comando ${unit.id?.slice(-4) || 'CMD'}`;
    }
    if (unit.query_queue_id) {
      return `Cola de consultas ${unit.id?.slice(-4) || 'SQL'}`;
    }
    if (unit.sftp_downloader_id) {
      return `Descarga SFTP ${unit.id?.slice(-4) || 'DWN'}`;
    }
    if (unit.sftp_uploader_id) {
      return `Subida SFTP ${unit.id?.slice(-4) || 'UPL'}`;
    }
    if (unit.zip_id) {
      return `Compresión ZIP ${unit.id?.slice(-4) || 'ZIP'}`;
    }
    if (unit.unzip_id) {
      return `Extracción ${unit.id?.slice(-4) || 'UNZ'}`;
    }
    if (unit.call_pipeline) {
      return `Pipeline ${unit.id?.slice(-4) || 'PIP'}`;
    }
    
    return `${type.type} #${unit.id?.slice(-4) || 'N/A'}`;
  };

  // NUEVO: Funciones para drag and drop
  const handleMouseDown = (unit: any, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    
    setIsDragging(true);
    setDraggedUnit(unit.id);
    
    const rect = event.currentTarget.getBoundingClientRect();
    setDragOffset({
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    });
  };

  const handleUnitClick = (unit: any, event: React.MouseEvent) => {
    // Solo abrir dialog si no estamos arrastrando
    if (!isDragging) {
      event.stopPropagation();
      setSelectedUnit(unit);
      setDialogOpen(true);
    }
  };

  // NUEVO: Efecto para manejar eventos globales de mouse durante drag
  useEffect(() => {
    if (isDragging) {
      const handleGlobalMouseMove = (event: MouseEvent) => {
        if (draggedUnit && containerRef.current) {
          const containerRect = containerRef.current.getBoundingClientRect();
          const newX = event.clientX - containerRect.left - dragOffset.x;
          const newY = event.clientY - containerRect.top - dragOffset.y;
          
          setUnitPositions(prev => ({
            ...prev,
            [draggedUnit]: { x: newX, y: newY }
          }));
          
          // NUEVO: Forzar re-renderización inmediata de conexiones
          // No necesitamos timeout aquí porque las conexiones se recalculan automáticamente
        }
      };

      const handleGlobalMouseUp = () => {
        setIsDragging(false);
        setDraggedUnit(null);
        // NUEVO: Actualizar conexiones al finalizar el drag
        setTimeout(() => {
          updateNodePositions();
        }, 100);
      };

      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleGlobalMouseMove);
        document.removeEventListener('mouseup', handleGlobalMouseUp);
      };
    }
  }, [isDragging, draggedUnit, dragOffset]);

  // Función para obtener la descripción para mostrar
  const getDisplayDescription = (unit: any) => {
    if (unit.command_id && unit.Command) {
      return unit.Command.description || 'Ejecución de comando de sistema';
    }
    if (unit.query_queue_id && unit.QueryQueue) {
      return unit.QueryQueue.description || 'Procesa consultas SQL en secuencia';
    }
    if (unit.sftp_downloader_id && unit.SFTPDownloader) {
      return unit.SFTPDownloader.description || 'Descarga archivos via SFTP';
    }
    if (unit.sftp_uploader_id && unit.SFTPUploader) {
      return unit.SFTPUploader.description || 'Sube archivos via SFTP';
    }
    if (unit.zip_id && unit.Zip) {
      return unit.Zip.description || 'Comprime archivos en ZIP';
    }
    if (unit.unzip_id && unit.Unzip) {
      return unit.Unzip.description || 'Extrae archivos de ZIP';
    }
    if (unit.call_pipeline && unit.Pipeline) {
      return unit.Pipeline.description || 'Ejecuta otro pipeline';
    }
    
    // Fallback para casos donde no hay relación disponible
    if (unit.command_id) {
      return 'Ejecución de comando de sistema';
    }
    if (unit.query_queue_id) {
      return 'Procesa consultas SQL en secuencia';
    }
    if (unit.sftp_downloader_id) {
      return 'Descarga archivos via SFTP';
    }
    if (unit.sftp_uploader_id) {
      return 'Sube archivos via SFTP';
    }
    if (unit.zip_id) {
      return 'Comprime archivos en ZIP';
    }
    if (unit.unzip_id) {
      return 'Extrae archivos de ZIP';
    }
    if (unit.call_pipeline) {
      return 'Ejecuta otro pipeline';
    }
    
    return 'Tipo de unidad desconocido';
  };

  // Función principal para procesar las unidades y crear nodos y conexiones
  const processUnits = (units: any[]) => {
    if (!units || units.length === 0) {
      return { nodes: [], connections: [] };
    }

    // Ordenar las unidades por índice
    const sortedUnits = [...units].sort((a, b) => (a.index || 0) - (b.index || 0));
    console.log('📊 Unidades ordenadas:', sortedUnits.map(u => ({
      id: u.id,
      type: detectUnitType(u)
    })));

    // Crear nodos en bloques de 3 columnas
    const nodes = sortedUnits.map((unit, index) => {
      const type = detectUnitType(unit);
      
      // Calcular posición en grid de 3 columnas
      const row = Math.floor(index / 3);
      const col = index % 3;
      
      const xPosition = 50 + (col * 220); // Espaciado horizontal de 220px
      const yPosition = 50 + (row * 250); // Espaciado vertical de 250px
      
      return {
        id: unit.id,
        type: type.type,
        displayName: getDisplayName(unit),
        displayDescription: getDisplayDescription(unit),
        posX: xPosition,
        posY: yPosition,
        index,
        row,
        col,
        data: unit
      };
    });

    console.log('🎯 Nodos creados:', nodes.length, nodes.map(n => ({
      id: n.id,
      type: n.type,
      pos: `${n.posX},${n.posY}`
    })));

    // Crear conexiones secuenciales adaptadas al grid 3x3
    const connections: any[] = [];
    console.log('🔗 Creando conexiones para', nodes.length, 'nodos en grid 3x3...');
    
    for (let i = 0; i < nodes.length - 1; i++) {
      const sourceNode = nodes[i];
      const targetNode = nodes[i + 1];
      
      const connectionId = `grid-conn-${i}`;
      console.log(`🔗 Conexión ${i}:`, {
        from: `${sourceNode.type} (${sourceNode.row},${sourceNode.col})`,
        to: `${targetNode.type} (${targetNode.row},${targetNode.col})`,
        fromPos: `${sourceNode.posX + 100},${sourceNode.posY + 48}`,
        toPos: `${targetNode.posX + 100},${targetNode.posY + 48}`
      });
      
      connections.push({
        id: connectionId,
        source: sourceNode,
        target: targetNode,
        sourcePoint: {
          x: sourceNode.posX + 100, // Centro del nodo
          y: sourceNode.posY + 48   // Centro vertical del nodo
        },
        targetPoint: {
          x: targetNode.posX + 100, // Centro del nodo
          y: targetNode.posY + 48   // Centro vertical del nodo
        }
      });
    }

    const result = { nodes, connections };
    console.log('🔥 RESULTADO FINAL:', {
      nodes: result.nodes.length,
      connections: result.connections.length,
      connectionsIds: result.connections.map(c => c.id)
    });

    return result;
  };

  // Función para obtener el tipo de unidad para el UnifiedPipelineUnitDialog
  const getUnitType = (unit: any) => {
    if (unit.command_id) return 'Command';
    if (unit.query_queue_id) return 'QueryQueue';
    if (unit.sftp_downloader_id) return 'SFTPDownloader';
    if (unit.sftp_uploader_id) return 'SFTPUploader';
    if (unit.file_stream_sftp_downloader_id) return 'FileStreamSftpDownloader';
    if (unit.file_stream_sftp_uploader_id) return 'FileStreamSftpUploader';
    if (unit.zip_id) return 'Zip';
    if (unit.unzip_id) return 'Unzip';
    if (unit.pipeline_call_id) return 'PipelineCall';
    return 'Unknown';
  };
  
  // Función para determinar el estado de la unidad (simulado)
  const getUnitStatus = (unit: any, index: number) => {
    // En una aplicación real, esto se basaría en los datos de ejecución de los trabajos
    if (index === 0) return 'completed';
    if (index === 1) return 'completed';
    if (index === 2) return 'running';
    return 'pending';
  };

  // Query para obtener los pipelines disponibles
  const { data: pipelinesData, isLoading: isPipelinesLoading } = useQuery({
    queryKey: ['/api/pipelines'],
    queryFn: async () => {
      const result: any = await executeQuery(PIPELINE_QUERY);
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
      
      const result: any = await executeQuery(PIPELINE_UNITS_QUERY, { 
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

  // NUEVO: Efecto para recalcular conexiones inmediatamente durante el drag
  useEffect(() => {
    if (pipelineUnits?.length) {
      const newConnections = calculateSVGConnections(pipelineUnits);
      setDynamicConnections(newConnections);
    }
  }, [nodePositions, unitPositions, pipelineUnits]);

  // NUEVO: Efecto para calcular conexiones iniciales cuando las posiciones estén listas
  useEffect(() => {
    if (pipelineUnits?.length && Object.keys(nodePositions).length > 0) {
      const initialConnections = calculateSVGConnections(pipelineUnits);
      setDynamicConnections(initialConnections);
    }
  }, [pipelineUnits, nodePositions]);

  // NUEVO: Efecto para forzar el cálculo de posiciones repetidamente hasta que funcione
  useEffect(() => {
    if (pipelineUnits?.length) {
      let attempts = 0;
      const maxAttempts = 10;
      
      const forcePositionUpdate = () => {
        attempts++;
        updateNodePositions();
        
        // Si aún no tenemos posiciones y no hemos agotado los intentos, intentar de nuevo
        if (Object.keys(nodePositions).length === 0 && attempts < maxAttempts) {
          setTimeout(forcePositionUpdate, 100);
        }
      };
      
      // Iniciar el proceso de cálculo forzado
      setTimeout(forcePositionUpdate, 50);
    }
  }, [pipelineUnits]);
  
  // Función para manejar el cambio de pipeline seleccionado
  const handlePipelineChange = (value: string) => {
    setSelectedPipeline(value);
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
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Estado de error si no hay pipelines
  if (!pipelinesData || pipelinesData.length === 0) {
    return (
      <Card>
        <CardHeader className="border-b border-slate-200 dark:border-slate-700">
          <CardTitle>Visualización del Pipeline</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-64 text-slate-500 dark:text-slate-400">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 mx-auto mb-4" />
              <p>No hay pipelines disponibles</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="border-b border-slate-200 dark:border-slate-700">
        <div className="flex justify-between items-center">
          <CardTitle>Visualización del Pipeline</CardTitle>
          {showSelector && (
            <PipelineSearch
              pipelines={pipelinesData}
              selectedPipelineId={selectedPipeline}
              onSelectPipeline={handlePipelineChange}
              isLoading={isPipelinesLoading}
            />
          )}
        </div>
      </CardHeader>
      <CardContent className="p-3 sm:p-6">
        <div className="relative w-full h-[400px] overflow-auto pb-4">
          {isUnitsLoading ? (
            <div className="flex items-center justify-center h-full">
              <Skeleton className="h-full w-full rounded-lg" />
            </div>
          ) : !pipelineUnits || pipelineUnits.length === 0 ? (
            <div className="flex items-center justify-center h-full text-slate-500 dark:text-slate-400">
              No hay unidades definidas para este pipeline
            </div>
          ) : (
            <div ref={containerRef} className="relative w-full min-w-[400px] md:min-w-[600px] lg:min-w-[800px] h-full">
              {(() => {
                const { nodes, connections } = processUnits(pipelineUnits);
                
                // NUEVO: Usar conexiones dinámicas del estado que se actualiza durante el drag
                
                return (
                  <>
                    {/* NUEVO: Conexiones SVG curvas estilo n8n */}
                    <svg 
                      className="absolute inset-0 pointer-events-none z-10" 
                      style={{ width: '100%', height: '100%' }}
                    >
                      {/* Definir marcadores de flecha */}
                      <defs>
                        <marker
                          id="arrowhead"
                          markerWidth="10"
                          markerHeight="7"
                          refX="9"
                          refY="3.5"
                          orient="auto"
                        >
                          <polygon
                            points="0 0, 10 3.5, 0 7"
                            fill="#4f46e5"
                            stroke="#4f46e5"
                            strokeWidth="1"
                          />
                        </marker>
                        {/* Marcadores de flechas con colores dinámicos */}
                        {dynamicConnections.map((conn, idx) => (
                          <marker
                            key={`arrow-${idx}`}
                            id={`arrowhead-${idx}`}
                            markerWidth="10"
                            markerHeight="7"
                            refX="9"
                            refY="3.5"
                            orient="auto"
                          >
                            <polygon
                              points="0 0, 10 3.5, 0 7"
                              fill={conn.color}
                              stroke={conn.color}
                              strokeWidth="1"
                            />
                          </marker>
                        ))}
                      </defs>
                      
                      {/* Renderizar conexiones curvas */}
                      {dynamicConnections.map((connection, idx) => (
                        <g key={connection.id}>
                          {/* Sombra de la línea para mejor visibilidad */}
                          <path
                            d={connection.pathData}
                            stroke="rgba(0,0,0,0.15)"
                            strokeWidth={connection.strokeWidth + 2}
                            fill="none"
                            transform="translate(2,2)"
                          />
                          {/* Línea principal con curva */}
                          <path
                            d={connection.pathData}
                            stroke={connection.color}
                            strokeWidth={connection.strokeWidth}
                            fill="none"
                            markerEnd={connection.hasArrow ? `url(#arrowhead-${idx})` : undefined}
                            className="transition-all duration-200"
                            style={{
                              filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))'
                            }}
                          />
                          
                          {/* Punto de inicio (círculo pequeño) */}
                          <circle
                            cx={connection.startX}
                            cy={connection.startY}
                            r="3"
                            fill={connection.color}
                            stroke="white"
                            strokeWidth="2"
                            className="drop-shadow-sm"
                          />
                          
                          {/* Punto final (círculo pequeño) */}
                          <circle
                            cx={connection.endX}
                            cy={connection.endY}
                            r="3"
                            fill={connection.color}
                            stroke="white"
                            strokeWidth="2"
                            className="drop-shadow-sm"
                          />
                        </g>
                      ))}
                    </svg>
                    
                    {/* Debug: Mostrar cantidad de conexiones */}
                    <div className="absolute top-2 right-2 bg-black text-white p-2 rounded text-xs z-30">
                      Conexiones SVG: {dynamicConnections.length}
                    </div>
                    
                    {/* NUEVO: Renderizar nodos con referencias para obtener posiciones */}
                    {nodes.map((node, index) => {
                      const unitData = pipelineUnits.find(u => u.id === node.id);
                      if (!unitData) return null;
                      
                      return (
                        <div
                          key={node.id}
                          ref={el => nodeRefs.current[node.id] = el}
                          className={`absolute bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-3 hover:shadow-lg transition-all duration-200 ${isDragging && draggedUnit === node.id ? 'cursor-grabbing' : 'cursor-grab'}`}
                          style={{
                            left: unitPositions[node.id]?.x ?? node.posX,
                            top: unitPositions[node.id]?.y ?? node.posY,
                            width: '200px',
                            borderLeft: `4px solid ${getUnitTypeColor(node.type)}`,
                            zIndex: isDragging && draggedUnit === node.id ? 30 : 20,
                            transform: isDragging && draggedUnit === node.id ? 'scale(1.05)' : 'scale(1)'
                          }}
                          onMouseDown={(e) => handleMouseDown(unitData, e)}
                        >
                          {/* Tipo de unidad arriba a la derecha con color */}
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex-1"></div>
                            <span 
                              className="text-xs font-semibold px-2 py-1 rounded"
                              style={{ 
                                backgroundColor: getUnitTypeColor(node.type) + '20',
                                color: getUnitTypeColor(node.type)
                              }}
                            >
                              {node.type}
                            </span>
                          </div>
                          
                          {/* Nombre principal de la unidad */}
                          <div className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-1">
                            {node.displayName}
                          </div>
                          
                          {/* Descripción/subtipo de la unidad */}
                          <div className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                            {node.displayDescription}
                          </div>
                          
                          {/* Botón Details en la esquina inferior derecha */}
                          <div className="flex justify-end">
                            <button
                              onClick={(e) => handleUnitClick(unitData, e)}
                              className="px-3 py-1 text-xs bg-blue-100 hover:bg-blue-200 dark:bg-blue-900 dark:hover:bg-blue-800 text-blue-700 dark:text-blue-300 rounded-md transition-colors duration-200 flex items-center gap-1"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              Details
                            </button>
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
      
      {/* Diálogo unificado para mostrar detalles de la unidad */}
      <UnifiedPipelineUnitDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        unit={selectedUnit}
      />
    </Card>
  );
}