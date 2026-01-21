import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { executeQuery } from "@/lib/hasura-client";
import { PIPELINE_QUERY, PIPELINE_UNITS_QUERY } from "@shared/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, Expand, X, Grid3X3, List, FileCode, TreePine, Link2Off } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PipelineSearch from "./PipelineSearch";
import UnifiedPipelineUnitDialog from "@/components/ui/UnifiedPipelineUnitDialog";
import { 
  usePipelinePositions, 
  useSavePipelinePositions, 
  convertPositionsToNodes,
  convertNodesToPositions 
} from "@/hooks/use-yaml-persistence";

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
  const [isMaximized, setIsMaximized] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "sequential" | "yaml">("grid");

  // Hooks para persistencia YAML
  const { data: savedPositions } = usePipelinePositions(selectedPipeline);
  const savePipelinePositions = useSavePipelinePositions();
  
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



  // Función para calcular conexiones CSS entre nodos basándose en relaciones padre-hijo (pipeline_unit_id)
  const calculateCSSConnections = (units: any[]) => {
    const connections: any[] = [];
    let connectionIndex = 0;
    
    // Iterar sobre todas las unidades y crear conexiones desde el padre hacia el hijo
    units.forEach((unit) => {
      // Si esta unidad tiene un padre (pipeline_unit_id), crear conexión padre -> hijo
      if (unit.pipeline_unit_id) {
        const parentUnit = units.find(u => u.id === unit.pipeline_unit_id);
        if (!parentUnit) return;
        
        const parentPos = nodePositions[parentUnit.id];
        const childPos = nodePositions[unit.id];
        
        if (!parentPos || !childPos) return;
        
        // Usar posiciones dinámicas si la unidad ha sido arrastrada
        const parentUnitPos = unitPositions[parentUnit.id];
        const childUnitPos = unitPositions[unit.id];
        
        // Calcular posiciones actuales de los nodos (padre = source, hijo = target)
        const sourceLeft = parentUnitPos?.x ?? parentPos.x;
        const sourceTop = parentUnitPos?.y ?? parentPos.y;
        const sourceRight = sourceLeft + parentPos.width;
        const sourceBottom = sourceTop + parentPos.height;
        const sourceCenterX = sourceLeft + parentPos.width / 2;
        const sourceCenterY = sourceTop + parentPos.height / 2;
        
        const targetLeft = childUnitPos?.x ?? childPos.x;
        const targetTop = childUnitPos?.y ?? childPos.y;
        const targetRight = targetLeft + childPos.width;
        const targetBottom = targetTop + childPos.height;
        const targetCenterX = targetLeft + childPos.width / 2;
        const targetCenterY = targetTop + childPos.height / 2;
        
        // Determinar el borde más cercano para la salida y entrada
        let startX, startY, endX, endY;
        
        // Calcular diferencias para determinar la dirección más directa
        const deltaX = targetCenterX - sourceCenterX;
        const deltaY = targetCenterY - sourceCenterY;
        
        // Determinar punto de salida del nodo padre (source)
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
          if (deltaX > 0) {
            startX = sourceRight;
            startY = sourceCenterY;
          } else {
            startX = sourceLeft;
            startY = sourceCenterY;
          }
        } else {
          if (deltaY > 0) {
            startX = sourceCenterX;
            startY = sourceBottom;
          } else {
            startX = sourceCenterX;
            startY = sourceTop;
          }
        }
        
        // Determinar punto de entrada del nodo hijo (target)
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
          if (deltaX > 0) {
            endX = targetLeft;
            endY = targetCenterY;
          } else {
            endX = targetRight;
            endY = targetCenterY;
          }
        } else {
          if (deltaY > 0) {
            endX = targetCenterX;
            endY = targetTop;
          } else {
            endX = targetCenterX;
            endY = targetBottom;
          }
        }
        
        // Calcular distancia y ángulo
        const distance = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
        const angle = Math.atan2(endY - startY, endX - startX) * 180 / Math.PI;
        
        // Puntos de control para curva Bezier suave
        const controlOffset = Math.min(Math.abs(endY - startY) * 0.5, Math.abs(endX - startX) * 0.5, 50);
        let control1X = startX;
        let control1Y = startY;
        let control2X = endX;
        let control2Y = endY;
        
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
          control1X = startX + (deltaX > 0 ? controlOffset : -controlOffset);
          control2X = endX + (deltaX > 0 ? -controlOffset : controlOffset);
        } else {
          control1Y = startY + (deltaY > 0 ? controlOffset : -controlOffset);
          control2Y = endY + (deltaY > 0 ? -controlOffset : controlOffset);
        }
        
        const pathData = `M ${startX} ${startY} C ${control1X} ${control1Y}, ${control2X} ${control2Y}, ${endX} ${endY}`;
        
        connections.push({
          id: `parent-child-${connectionIndex}`,
          left: startX,
          top: startY,
          width: distance,
          rotation: angle,
          color: `hsl(${connectionIndex * 40}, 80%, 45%)`,
          pathData,
          startX,
          startY,
          endX,
          endY,
          strokeWidth: 3,
          hasArrow: true,
          parentId: parentUnit.id,
          childId: unit.id
        });
        
        connectionIndex++;
      }
    });
    
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

        // Guardar posiciones en YAML cuando se termine de arrastrar
        if (selectedPipeline && draggedUnit) {
          const currentPositions = { ...unitPositions };
          if (currentPositions[draggedUnit]) {
            const positions = convertNodesToPositions(
              Object.entries(currentPositions).map(([id, pos]) => ({
                id,
                pos: `${pos.x},${pos.y}`
              }))
            );
            
            savePipelinePositions.mutate({
              pipelineId: selectedPipeline,
              positions
            });
          }
        }
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

  // Función para ordenar topológicamente las unidades basándose en pipeline_unit_id
  const topologicalSort = (units: any[]): any[] => {
    if (!units || units.length === 0) return [];
    
    // Crear mapa de unidades por ID
    const unitMap = new Map(units.map(u => [u.id, u]));
    
    // Encontrar la unidad raíz (pipeline_unit_id es null)
    const roots = units.filter(u => !u.pipeline_unit_id);
    
    if (roots.length === 0) {
      // Si no hay raíz, usar ordenamiento por posición como fallback
      console.log('⚠️ No se encontró unidad raíz, usando fallback por posición');
      return [...units].sort((a, b) => {
        if (a.posy !== b.posy) return (a.posy || 0) - (b.posy || 0);
        return (a.posx || 0) - (b.posx || 0);
      });
    }
    
    // Construir mapa de hijos: parent_id -> [children]
    const childrenMap = new Map<string, any[]>();
    units.forEach(u => {
      if (u.pipeline_unit_id) {
        const children = childrenMap.get(u.pipeline_unit_id) || [];
        children.push(u);
        childrenMap.set(u.pipeline_unit_id, children);
      }
    });
    
    // Recorrer el árbol en orden
    const result: any[] = [];
    const visited = new Set<string>();
    
    const traverse = (unit: any) => {
      if (visited.has(unit.id)) return;
      visited.add(unit.id);
      result.push(unit);
      
      // Obtener hijos y ordenarlos por posición para determinar orden entre hermanos
      const children = childrenMap.get(unit.id) || [];
      children.sort((a, b) => {
        if (a.posy !== b.posy) return (a.posy || 0) - (b.posy || 0);
        return (a.posx || 0) - (b.posx || 0);
      });
      
      children.forEach(child => traverse(child));
    };
    
    // Empezar desde las raíces (ordenadas por posición)
    roots.sort((a, b) => {
      if (a.posy !== b.posy) return (a.posy || 0) - (b.posy || 0);
      return (a.posx || 0) - (b.posx || 0);
    });
    roots.forEach(root => traverse(root));
    
    // Agregar unidades huérfanas que no fueron visitadas
    units.forEach(u => {
      if (!visited.has(u.id)) {
        result.push(u);
      }
    });
    
    return result;
  };

  // Función principal para procesar las unidades y crear nodos y conexiones
  const processUnits = (units: any[]) => {
    if (!units || units.length === 0) {
      return { nodes: [], connections: [] };
    }

    // Ordenar las unidades topológicamente usando pipeline_unit_id
    const sortedUnits = topologicalSort(units);
    console.log('📊 Unidades ordenadas topológicamente:', sortedUnits.map(u => ({
      id: u.id,
      parentId: u.pipeline_unit_id,
      type: detectUnitType(u)
    })));

    // Crear nodos en bloques de 3 columnas
    const nodes = sortedUnits.map((unit, index) => {
      const type = detectUnitType(unit);
      
      // Calcular posición en grid de 3 columnas (para row/col)
      const row = Math.floor(index / 3);
      const col = index % 3;
      
      // Verificar si hay posiciones guardadas para este nodo
      const savedPosition = savedPositions && savedPositions[unit.id];
      
      let xPosition, yPosition;
      
      if (savedPosition) {
        // Usar posición guardada
        xPosition = savedPosition.x;
        yPosition = savedPosition.y;
      } else {
        // Usar posición por defecto en grid de 3 columnas
        xPosition = 50 + (col * 220); // Espaciado horizontal de 220px
        yPosition = 50 + (row * 300); // Espaciado vertical de 300px
      }
      
      return {
        id: unit.id,
        type: type.type,
        displayName: getDisplayName(unit),
        displayDescription: getDisplayDescription(unit),
        posX: xPosition,
        posY: yPosition,
        index: index,
        row: row,
        col: col,
        data: unit
      };
    });

    console.log('🎯 Nodos creados:', nodes.length, nodes.map(n => ({
      id: n.id,
      type: n.type,
      pos: `${n.posX},${n.posY}`,
      parentId: n.data.pipeline_unit_id
    })));

    // Crear conexiones basadas en relaciones padre-hijo (pipeline_unit_id)
    const connections: any[] = [];
    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    let connectionIndex = 0;
    
    console.log('🔗 Creando conexiones padre-hijo para', nodes.length, 'nodos...');
    
    // Cada unidad que tiene pipeline_unit_id se conecta DESDE su padre
    nodes.forEach((node) => {
      const parentId = node.data.pipeline_unit_id;
      if (parentId) {
        const parentNode = nodeMap.get(parentId);
        if (parentNode) {
          const connectionId = `parent-child-conn-${connectionIndex}`;
          console.log(`🔗 Conexión ${connectionIndex}:`, {
            from: `${parentNode.type} (padre)`,
            to: `${node.type} (hijo)`,
            parentId: parentId,
            childId: node.id
          });
          
          connections.push({
            id: connectionId,
            source: parentNode,
            target: node,
            sourcePoint: {
              x: parentNode.posX + 100,
              y: parentNode.posY + 48
            },
            targetPoint: {
              x: node.posX + 100,
              y: node.posY + 48
            }
          });
          
          connectionIndex++;
        }
      }
    });

    const result = { nodes, connections };
    console.log('🔥 RESULTADO FINAL:', {
      nodes: result.nodes.length,
      connections: result.connections.length,
      raices: nodes.filter(n => !n.data.pipeline_unit_id).length
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
      const newConnections = calculateCSSConnections(pipelineUnits);
      setDynamicConnections(newConnections);
    }
  }, [nodePositions, unitPositions, pipelineUnits]);

  // NUEVO: Efecto para calcular conexiones iniciales cuando las posiciones estén listas
  useEffect(() => {
    if (pipelineUnits?.length && Object.keys(nodePositions).length > 0) {
      const initialConnections = calculateCSSConnections(pipelineUnits);
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
    <Card className={isMaximized ? "fixed inset-4 z-50 shadow-2xl" : ""}>
      <CardHeader className="border-b border-slate-200 dark:border-slate-700">
        <div className="flex justify-between items-center">
          <CardTitle>
            {(() => {
              const currentPipeline = pipelinesData?.find((p: any) => p.id === selectedPipeline);
              return currentPipeline ? `Pipeline: ${currentPipeline.name}` : 'Visualización del Pipeline';
            })()}
          </CardTitle>
          <div className="flex items-center gap-3">
            {showSelector && (
              <PipelineSearch
                pipelines={pipelinesData}
                selectedPipelineId={selectedPipeline}
                onSelectPipeline={handlePipelineChange}
                isLoading={isPipelinesLoading}
              />
            )}
            {/* Tabs para cambiar vista */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-2 rounded-md transition-colors ${viewMode === "grid" ? "bg-white dark:bg-slate-700 shadow-sm" : "hover:bg-slate-200 dark:hover:bg-slate-700"}`}
                title="Vista Grid"
              >
                <Grid3X3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("sequential")}
                className={`p-2 rounded-md transition-colors ${viewMode === "sequential" ? "bg-white dark:bg-slate-700 shadow-sm" : "hover:bg-slate-200 dark:hover:bg-slate-700"}`}
                title="Vista Secuencial"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("yaml")}
                className={`p-2 rounded-md transition-colors ${viewMode === "yaml" ? "bg-white dark:bg-slate-700 shadow-sm" : "hover:bg-slate-200 dark:hover:bg-slate-700"}`}
                title="Vista YAML"
              >
                <FileCode className="w-4 h-4" />
              </button>
            </div>
            {/* Botón de maximizar/minimizar */}
            <button
              onClick={() => setIsMaximized(!isMaximized)}
              className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors duration-200"
              title={isMaximized ? "Minimizar" : "Maximizar"}
            >
              {isMaximized ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-3 sm:p-6">
        <div className={`relative w-full overflow-auto pb-4 ${isMaximized ? 'h-[calc(100vh-120px)]' : 'h-[400px]'}`}>
          {isUnitsLoading ? (
            <div className="flex items-center justify-center h-full">
              <Skeleton className="h-full w-full rounded-lg" />
            </div>
          ) : !pipelineUnits || pipelineUnits.length === 0 ? (
            <div className="flex items-center justify-center h-full text-slate-500 dark:text-slate-400">
              No hay unidades definidas para este pipeline
            </div>
          ) : viewMode === "sequential" ? (
            <div className="space-y-3 p-2">
              {(() => {
                const sortedUnits = topologicalSort(pipelineUnits);
                return sortedUnits.map((unit: any, index: number) => {
                  const type = detectUnitType(unit);
                  return (
                    <div key={unit.id} className="relative">
                      {index > 0 && (
                        <div className="absolute left-8 -top-3 w-0.5 h-3 bg-slate-300 dark:bg-slate-600"></div>
                      )}
                      <div 
                        className="flex items-start gap-4 p-4 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow cursor-pointer"
                        style={{ borderLeft: `4px solid ${getUnitTypeColor(type.type)}` }}
                        onClick={() => {
                          setSelectedUnit(unit);
                          setDialogOpen(true);
                        }}
                      >
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-sm font-bold text-slate-600 dark:text-slate-300">
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span 
                              className="text-xs font-semibold px-2 py-0.5 rounded"
                              style={{ 
                                backgroundColor: getUnitTypeColor(type.type) + '20',
                                color: getUnitTypeColor(type.type)
                              }}
                            >
                              {type.type}
                            </span>
                            {!unit.pipeline_unit_id && (
                              <span 
                                className="text-xs px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 flex items-center gap-1"
                                title="Unidad raíz - No tiene dependencia de otra unidad"
                              >
                                <TreePine className="w-3 h-3" />
                                Raíz
                              </span>
                            )}
                          </div>
                          <h4 className="font-medium text-slate-900 dark:text-slate-100 truncate">
                            {getDisplayName(unit)}
                          </h4>
                          <p className="text-sm text-slate-500 dark:text-slate-400 truncate">
                            {getDisplayDescription(unit)}
                          </p>
                          <p className="text-xs font-mono text-slate-400 dark:text-slate-500 mt-1 truncate">
                            ID: {unit.id}
                          </p>
                        </div>
                      </div>
                      {index < sortedUnits.length - 1 && (
                        <div className="absolute left-8 -bottom-3 w-0.5 h-3 bg-slate-300 dark:bg-slate-600"></div>
                      )}
                    </div>
                  );
                });
              })()}
            </div>
          ) : viewMode === "yaml" ? (
            <div className="h-full">
              <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg overflow-auto h-full text-xs font-mono">
                {(() => {
                  const sortedUnits = topologicalSort(pipelineUnits);
                  const currentPipeline = pipelinesData?.find((p: any) => p.id === selectedPipeline);
                  
                  const yamlContent = `pipeline:
  id: "${currentPipeline?.id || ''}"
  name: "${currentPipeline?.name || ''}"
  description: "${currentPipeline?.description || ''}"
  abort_on_error: ${currentPipeline?.abort_on_error ?? false}
  
units:
${sortedUnits.map((unit: any, index: number) => {
  const type = detectUnitType(unit);
  const lines = [
    `  - step: ${index + 1}`,
    `    id: "${unit.id}"`,
    `    type: "${type.type}"`,
    `    name: "${getDisplayName(unit)}"`,
    `    comment: "${unit.comment || ''}"`,
    unit.pipeline_unit_id ? `    depends_on: "${unit.pipeline_unit_id}"` : null,
    `    retry_count: ${unit.retry_count || 0}`,
    `    timeout_ms: ${unit.timeout_milliseconds || 0}`,
    `    abort_on_timeout: ${unit.abort_on_timeout ?? false}`,
    `    continue_on_error: ${unit.continue_on_error ?? false}`,
  ];
  
  if (unit.command_id && unit.Command) {
    lines.push(`    command:`);
    lines.push(`      id: "${unit.Command.id}"`);
    lines.push(`      name: "${unit.Command.name || ''}"`);
    lines.push(`      target: "${unit.Command.target || ''}"`);
    lines.push(`      args: "${unit.Command.args || ''}"`);
    lines.push(`      working_directory: "${unit.Command.working_directory || ''}"`);
  }
  
  if (unit.query_queue_id && unit.QueryQueue) {
    lines.push(`    query_queue:`);
    lines.push(`      id: "${unit.QueryQueue.id}"`);
    lines.push(`      name: "${unit.QueryQueue.name || ''}"`);
    if (unit.QueryQueue.Queries) {
      lines.push(`      queries: ${unit.QueryQueue.Queries.length}`);
    }
  }
  
  if (unit.sftp_downloader_id && unit.SFTPDownloader) {
    lines.push(`    sftp_downloader:`);
    lines.push(`      id: "${unit.SFTPDownloader.id}"`);
    lines.push(`      name: "${unit.SFTPDownloader.name || ''}"`);
  }
  
  if (unit.sftp_uploader_id && unit.SFTPUploader) {
    lines.push(`    sftp_uploader:`);
    lines.push(`      id: "${unit.SFTPUploader.id}"`);
    lines.push(`      name: "${unit.SFTPUploader.name || ''}"`);
  }
  
  if (unit.call_pipeline && unit.Pipeline) {
    lines.push(`    call_pipeline:`);
    lines.push(`      id: "${unit.Pipeline.id}"`);
    lines.push(`      name: "${unit.Pipeline.name || ''}"`);
  }
  
  return lines.filter(Boolean).join('\n');
}).join('\n\n')}`;
                  
                  return yamlContent;
                })()}
              </pre>
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

                      
                      {/* Renderizar conexiones curvas */}
                      {dynamicConnections.map((connection, idx) => (
                        <g key={connection.id}>
                          {/* Línea principal con curva */}
                          <path
                            d={connection.pathData}
                            stroke={connection.color}
                            strokeWidth={connection.strokeWidth}
                            fill="none"
                            className="transition-all duration-200"
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
                      const unitData = pipelineUnits.find((u: any) => u.id === node.id);
                      if (!unitData) return null;
                      
                      return (
                        <div
                          key={node.id}
                          ref={el => nodeRefs.current[node.id] = el}
                          className={`absolute bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-3 transition-all duration-200 ${isDragging && draggedUnit === node.id ? 'cursor-grabbing' : 'cursor-grab'}`}
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
                          {/* Tipo de unidad arriba con indicador de raíz */}
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex-1">
                              {!unitData.pipeline_unit_id && (
                                <span 
                                  className="text-xs px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 flex items-center gap-1 w-fit"
                                  title="Unidad raíz - No depende de otra unidad"
                                >
                                  <TreePine className="w-3 h-3" />
                                </span>
                              )}
                            </div>
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