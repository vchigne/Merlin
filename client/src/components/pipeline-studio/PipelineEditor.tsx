import React, { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ZoomIn, ZoomOut, Plus, Minus, Trash2, XCircle, Settings2, ArrowRight, Wrench, Database, Info, Link2, Download, Upload, Save } from "lucide-react";
import { pipelineLayoutManager } from "@/lib/pipeline-layout-manager";
import { useToast } from "@/hooks/use-toast";
import { executeQuery } from "@/lib/hasura-client";
import { COMMAND_QUERY, QUERY_QUEUE_QUERY, QUERY_DETAILS_QUERY, SFTP_DOWNLOADER_QUERY, SFTP_UPLOADER_QUERY, ZIP_QUERY, UNZIP_QUERY, PIPELINE_QUERY } from "@shared/queries";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

// Componente mejorado para el editor visual de flujos de pipeline
// Con canvas infinito y soporte completo para dispositivos móviles

interface PipelineEditorProps {
  flowData: {
    nodes: any[];
    edges: any[];
  };
  onChange: (updatedFlow: any, selectedNodeId?: string | null) => void;
  onNodeSelect?: (node: any) => void; // Propiedad para manejar la selección de nodos
  readOnly?: boolean;
  pipelineId?: string; // ID del pipeline para guardar su layout
}

export default function PipelineEditor({
  flowData,
  onChange,
  onNodeSelect,
  readOnly = false,
  pipelineId,
}: PipelineEditorProps) {
  const { toast } = useToast();
  // Estados para el editor
  const [nodes, setNodes] = useState<any[]>([]);
  const [edges, setEdges] = useState<any[]>([]);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [draggingNode, setDraggingNode] = useState<string | null>(null);
  const [nodeDragStart, setNodeDragStart] = useState({ x: 0, y: 0 });
  const [connectingNode, setConnectingNode] = useState<string | null>(null);
  const [mousePosition, setMousePosition] = useState<{ x: number, y: number } | null>(null);
  const [minimizedNodes, setMinimizedNodes] = useState<Set<string>>(new Set());
  
  // Estados para el diálogo de detalles de nodo
  const [showNodeDetails, setShowNodeDetails] = useState(false);
  const [nodeDetailsLoading, setNodeDetailsLoading] = useState(false);
  const [selectedNodeDetails, setSelectedNodeDetails] = useState<any>(null);
  const [nodeDetailsData, setNodeDetailsData] = useState<any>(null);
  
  // Referencias
  const canvasRef = useRef<HTMLDivElement>(null);

  // Aplicar espaciado automático a los nodos si no tienen posiciones definidas
  const applyAutoLayout = (nodes: any[]): any[] => {
    // Solo espaciar nodos si no hay posiciones guardadas
    // Coordenadas iniciales - más separadas para evitar solapamiento
    let x = 150;
    let y = 150;
    
    // Espaciado entre nodos - aumentado drásticamente para evitar solapamiento
    const spacingX = 800;
    const spacingY = 400;
    
    // Máximo de nodos por fila - limitado a uno por fila para mayor claridad
    const maxNodesPerRow = 1;
    
    return nodes.map((node, index) => {
      // Si el nodo ya tiene una posición definida pero está superpuesto con otro nodo,
      // forzar una nueva posición
      const hasOverlap = nodes.some((otherNode, i) => {
        if (i === index) return false;
        if (!node.position || !otherNode.position) return false;
        
        // Detectar si hay nodos muy cercanos (menos de 50px de diferencia)
        const xDiff = Math.abs((node.position?.x || 0) - (otherNode.position?.x || 0));
        const yDiff = Math.abs((node.position?.y || 0) - (otherNode.position?.y || 0));
        
        return xDiff < 100 && yDiff < 50;
      });
      
      // Aplicar posición automática si no hay posición o hay solapamiento
      if (!node.position || hasOverlap) {
        // Calcular la posición en la cuadrícula
        const row = Math.floor(index / maxNodesPerRow);
        const col = index % maxNodesPerRow;
        
        // Aplicar la posición
        return {
          ...node,
          position: {
            x: x + col * spacingX,
            y: y + row * spacingY
          }
        };
      }
      
      return node;
    });
  };

  // Sincronizar estados con los datos de flujo y cargar layout guardado si existe
  useEffect(() => {
    if (flowData) {
      let updatedNodes = flowData.nodes || [];
      
      // Asegurarse de que todos los nodos tengan posiciones iniciales espaciadas
      updatedNodes = updatedNodes.map((node, index) => {
        if (!node.position) {
          // Posición inicial para evitar superposición
          return {
            ...node,
            position: { 
              x: 150 + (index * 250), 
              y: 150 + (Math.floor(index / 2) * 150) 
            }
          };
        }
        return node;
      });
      
      // Si hay un ID de pipeline, intentar cargar posiciones guardadas
      if (pipelineId) {
        try {
          // Aplicar layout guardado si existe
          const nodesWithLayout = pipelineLayoutManager.applyLayoutToNodes(pipelineId, updatedNodes);
          updatedNodes = nodesWithLayout || updatedNodes;
          
          // Cargar nodos minimizados
          const minimizedNodeIds = pipelineLayoutManager.getMinimizedNodes(pipelineId);
          if (minimizedNodeIds && minimizedNodeIds.length > 0) {
            setMinimizedNodes(new Set(minimizedNodeIds));
          }
        } catch (error) {
          console.error('Error al cargar layout guardado:', error);
        }
      }
      
      // Aplicar espaciado automático en todos los casos para garantizar que no haya solapamiento
      // Verificar si hay nodos con posiciones muy cercanas o idénticas
      const needsAutoLayout = updatedNodes.some((node, index, array) => {
        if (index === 0) return false;
        
        return array.some((otherNode, otherIndex) => {
          if (otherIndex === index) return false;
          if (!node.position || !otherNode.position) return true;
          
          // Detectar nodos demasiado cercanos (menos de un umbral específico)
          const xDiff = Math.abs(node.position.x - otherNode.position.x);
          const yDiff = Math.abs(node.position.y - otherNode.position.y);
          
          // Aumentamos el umbral para garantizar más espacio entre nodos
          return xDiff < 200 && yDiff < 100;
        });
      });
      
      // Aplicar siempre el diseño automático durante la carga inicial
      updatedNodes = applyAutoLayout(updatedNodes);
      
      setNodes(updatedNodes);
      setEdges(flowData.edges || []);
      
      // Guardar layout inmediatamente si hay un ID de pipeline
      if (pipelineId && updatedNodes.length > 0) {
        try {
          const positions = pipelineLayoutManager.extractPositionsFromNodes(updatedNodes);
          const minimizedNodesArray = Array.from(minimizedNodes);
          pipelineLayoutManager.saveLayout(pipelineId, positions, minimizedNodesArray);
        } catch (error) {
          console.error('Error al guardar layout inicial:', error);
        }
      }
    }
  }, [flowData, pipelineId]);
  
  // Notificar cambios al componente padre y guardar layout
  const notifyChange = useCallback(() => {
    // Notificar cambios al componente padre
    onChange({ nodes, edges }, selectedNode);
    
    // Si hay un ID de pipeline, guardar layout actual
    if (pipelineId) {
      try {
        // Extraer posiciones para guardar
        const positions = pipelineLayoutManager.extractPositionsFromNodes(nodes);
        
        // Convertir Set a Array para guardar nodos minimizados
        const minimizedNodesArray = Array.from(minimizedNodes);
        
        // Guardar layout
        pipelineLayoutManager.saveLayout(pipelineId, positions, minimizedNodesArray);
      } catch (error) {
        console.error('Error al guardar layout:', error);
      }
    }
  }, [nodes, edges, selectedNode, onChange, pipelineId, minimizedNodes]);

  // Manejar el zoom
  const handleZoom = (delta: number) => {
    const newZoom = Math.max(0.1, Math.min(2, zoom + delta));
    setZoom(newZoom);
  };

  // Manejar clics en nodos
  const handleNodeClick = (nodeId: string) => {
    const newSelectedNodeId = nodeId === selectedNode ? null : nodeId;
    setSelectedNode(newSelectedNodeId);
    
    // Notificar al componente padre sobre el nodo seleccionado
    if (onNodeSelect) {
      if (newSelectedNodeId) {
        const selectedNodeData = nodes.find(node => node.id === newSelectedNodeId);
        onNodeSelect(selectedNodeData || null);
      } else {
        onNodeSelect(null);
      }
    }
    
    // Si se seleccionó un nodo, mostrar sus detalles
    if (newSelectedNodeId) {
      fetchNodeDetails(newSelectedNodeId);
    }
  };
  
  // Función para obtener los detalles completos de un nodo
  const fetchNodeDetails = async (nodeId: string) => {
    const selectedNodeData = nodes.find(node => node.id === nodeId);
    if (!selectedNodeData) return;
    
    setSelectedNodeDetails(selectedNodeData);
    setShowNodeDetails(true);
    setNodeDetailsLoading(true);
    
    try {
      const unitData = selectedNodeData.data.unit;
      let query = '';
      let variables = {};
      
      // Determinar qué tipo de unidad es y obtener los detalles
      if (unitData.command_id) {
        query = COMMAND_QUERY;
        variables = { id: unitData.command_id };
      } else if (unitData.query_queue_id) {
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
          setNodeDetailsData({
            type: 'pipeline',
            name: result.data.merlin_agent_Pipeline[0]?.name || 'Pipeline',
            description: result.data.merlin_agent_Pipeline[0]?.description || 'Llamada a otro pipeline',
            details: result.data.merlin_agent_Pipeline[0]
          });
        }
        setNodeDetailsLoading(false);
        return;
      }
      
      if (query) {
        const result = await executeQuery(query, variables);
        if (result.data && !result.errors) {
          const nodeType = unitData.command_id ? 'command' : 
                          unitData.query_queue_id ? 'query' : 
                          unitData.sftp_downloader_id ? 'sftp_download' : 
                          unitData.sftp_uploader_id ? 'sftp_upload' : 
                          unitData.zip_id ? 'zip' : 
                          unitData.unzip_id ? 'unzip' : 'unknown';
                          
          // Determinar el objeto de datos según el tipo
          let detailsData = null;
          let name = '';
          let description = '';
          
          if (nodeType === 'command' && result.data.merlin_agent_Command) {
            detailsData = result.data.merlin_agent_Command[0];
            name = detailsData?.name || 'Comando';
            description = detailsData?.description || 'Ejecuta un comando en el sistema';
          } else if (nodeType === 'query' && result.data.merlin_agent_QueryQueue) {
            detailsData = result.data.merlin_agent_QueryQueue[0];
            name = detailsData?.name || 'Consulta SQL';
            description = detailsData?.description || 'Ejecuta una consulta en base de datos';
          } else if (nodeType === 'sftp_download' && result.data.merlin_agent_SFTPDownloader) {
            detailsData = result.data.merlin_agent_SFTPDownloader[0];
            name = 'Descarga SFTP';
            description = 'Descarga archivos desde un servidor SFTP';
          } else if (nodeType === 'sftp_upload' && result.data.merlin_agent_SFTPUploader) {
            detailsData = result.data.merlin_agent_SFTPUploader[0];
            name = 'Subida SFTP';
            description = 'Sube archivos a un servidor SFTP';
          } else if (nodeType === 'zip' && result.data.merlin_agent_Zip) {
            detailsData = result.data.merlin_agent_Zip[0];
            name = detailsData?.name || 'Compresión ZIP';
            description = 'Comprime archivos en formato ZIP';
          } else if (nodeType === 'unzip' && result.data.merlin_agent_UnZip) {
            detailsData = result.data.merlin_agent_UnZip[0];
            name = detailsData?.name || 'Extracción ZIP';
            description = 'Extrae archivos de formato ZIP';
          }
          
          setNodeDetailsData({
            type: nodeType,
            name,
            description,
            details: detailsData
          });
        }
      }
    } catch (error) {
      console.error('Error al cargar detalles del nodo:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los detalles del nodo',
        variant: 'destructive'
      });
    } finally {
      setNodeDetailsLoading(false);
    }
  };
  
  // Manejar eliminación de nodos
  const handleDeleteNode = (nodeId: string) => {
    if (readOnly) return;
    
    // Eliminar nodo
    const updatedNodes = nodes.filter(node => node.id !== nodeId);
    setNodes(updatedNodes);
    
    // Eliminar conexiones relacionadas
    const updatedEdges = edges.filter(
      edge => edge.source !== nodeId && edge.target !== nodeId
    );
    setEdges(updatedEdges);
    
    // Deseleccionar si era el nodo seleccionado
    if (selectedNode === nodeId) {
      setSelectedNode(null);
    }
    
    // Notificar cambios
    onChange({ nodes: updatedNodes, edges: updatedEdges }, null);
  };
  
  // Manejar minimización de nodos
  const toggleMinimizeNode = (nodeId: string) => {
    setMinimizedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      
      // Si hay un ID de pipeline, guardar estado minimizado
      if (pipelineId) {
        try {
          const minimizedNodesArray = Array.from(newSet);
          pipelineLayoutManager.saveMinimizedNodes(pipelineId, minimizedNodesArray);
        } catch (error) {
          console.error('Error al guardar nodos minimizados:', error);
        }
      }
      
      return newSet;
    });
  };
  
  // Exportar layout como YAML
  const handleExportLayout = () => {
    if (!pipelineId) {
      toast({
        title: "Error",
        description: "No se puede exportar el layout sin un ID de pipeline",
        variant: "destructive"
      });
      return;
    }
    
    try {
      // Extraer posiciones actuales
      const positions = pipelineLayoutManager.extractPositionsFromNodes(nodes);
      
      // Convertir Set a Array
      const minimizedNodesArray = Array.from(minimizedNodes);
      
      // Guardar antes de exportar
      pipelineLayoutManager.saveLayout(pipelineId, positions, minimizedNodesArray);
      
      // Obtener YAML
      const yamlContent = pipelineLayoutManager.exportLayoutYAML(pipelineId);
      
      if (!yamlContent) {
        toast({
          title: "Error",
          description: "No se pudo generar el archivo YAML",
          variant: "destructive"
        });
        return;
      }
      
      // Crear blob y enlace de descarga
      const blob = new Blob([yamlContent], { type: 'application/yaml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pipeline-layout-${pipelineId}.yaml`;
      document.body.appendChild(a);
      a.click();
      
      // Limpiar
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 0);
      
      toast({
        title: "Éxito",
        description: "Layout exportado correctamente",
        variant: "default"
      });
    } catch (error) {
      console.error('Error al exportar layout:', error);
      toast({
        title: "Error",
        description: "No se pudo exportar el layout",
        variant: "destructive"
      });
    }
  };
  
  // Manejar el inicio del arrastre del canvas (Mouse)
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 1 && e.button !== 0) return; // Solo botón central o izquierdo
    if (e.button === 0 && !e.altKey) return; // Botón izquierdo solo con Alt
    if (connectingNode) return; // No arrastrar si estamos conectando nodos
    
    setDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  // Manejar el inicio del arrastre del canvas (Touch)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (connectingNode) return; // No arrastrar si estamos conectando nodos
    if (e.touches.length === 2) { // Requiere dos dedos para mover el canvas
      setDragging(true);
      if (e.touches.length > 0) {
        const touch = e.touches[0];
        setDragStart({ x: touch.clientX, y: touch.clientY });
      }
    }
  };
  
  // Manejar el movimiento durante el arrastre del canvas (Mouse)
  const handleMouseMove = (e: React.MouseEvent) => {
    // Actualizar la posición del mouse para la conexión de nodos
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
      setMousePosition({
        x: e.clientX - rect.left + position.x,
        y: e.clientY - rect.top + position.y
      });
    }
    
    // Manejar el arrastre del nodo si hay uno seleccionado
    if (draggingNode) {
      handleNodeDrag(e);
      return;
    }
    
    // Manejar el arrastre del canvas
    if (!dragging) return;
    
    const dx = (e.clientX - dragStart.x) * 0.5;
    const dy = (e.clientY - dragStart.y) * 0.5;
    
    setPosition({
      x: position.x + dx,
      y: position.y + dy,
    });
    
    setDragStart({ x: e.clientX, y: e.clientY });
  };
  
  // Manejar el movimiento durante el arrastre del canvas (Touch)
  const handleTouchMove = (e: React.TouchEvent) => {
    // Actualizar la posición del mouse para la conexión de nodos
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect && e.touches.length > 0) {
      const touch = e.touches[0];
      setMousePosition({
        x: touch.clientX - rect.left + position.x,
        y: touch.clientY - rect.top + position.y
      });
    }
    
    // Si estamos conectando, no hacer nada
    if (connectingNode) return;
    
    // Manejar el arrastre del nodo si hay uno seleccionado
    if (draggingNode && e.touches.length === 1) {
      const touch = e.touches[0];
      handleNodeDrag({
        clientX: touch.clientX,
        clientY: touch.clientY
      } as any);
      return;
    }
    
    // Manejar el arrastre del canvas
    if (!dragging || e.touches.length !== 2) return;
    
    if (e.touches.length > 0) {
      const touch = e.touches[0];
      const dx = (touch.clientX - dragStart.x) * 0.5;
      const dy = (touch.clientY - dragStart.y) * 0.5;
      
      setPosition({
        x: position.x + dx,
        y: position.y + dy
      });
      
      setDragStart({ x: touch.clientX, y: touch.clientY });
    }
  };

  // Manejar el fin del arrastre (Mouse y Touch)
  const handleMouseUp = () => {
    if (draggingNode) {
      // Notificar el cambio de posición del nodo
      notifyChange();
      setDraggingNode(null);
    }
    setDragging(false);
  };
  
  const handleTouchEnd = () => {
    if (draggingNode) {
      // Notificar el cambio de posición del nodo
      notifyChange();
      setDraggingNode(null);
    }
    setDragging(false);
  };
  
  // Manejar el arrastre de nodos individuales (Mouse)
  const handleNodeMouseDown = (e: React.MouseEvent, nodeId: string) => {
    if (readOnly) return;
    e.stopPropagation();
    setDraggingNode(nodeId);
    setNodeDragStart({
      x: e.clientX,
      y: e.clientY
    });
  };
  
  // Manejar el arrastre de nodos individuales (Touch)
  const handleNodeTouchStart = (e: React.TouchEvent, nodeId: string) => {
    if (readOnly) return;
    e.stopPropagation();
    
    if (e.touches.length === 1) {
      setDraggingNode(nodeId);
      const touch = e.touches[0];
      setNodeDragStart({
        x: touch.clientX,
        y: touch.clientY
      });
    }
  };
  
  // Manejar el movimiento de nodos durante el arrastre (común para Mouse y Touch)
  const handleNodeDrag = (e: React.MouseEvent | { clientX: number; clientY: number }) => {
    if (!draggingNode || readOnly) return;
    
    const dx = (e.clientX - nodeDragStart.x) / zoom;
    const dy = (e.clientY - nodeDragStart.y) / zoom;
    
    // Actualizar la posición del nodo
    const updatedNodes = nodes.map(node => {
      if (node.id === draggingNode) {
        return {
          ...node,
          position: {
            x: node.position.x + dx,
            y: node.position.y + dy
          }
        };
      }
      return node;
    });
    
    setNodes(updatedNodes);
    setNodeDragStart({
      x: e.clientX,
      y: e.clientY
    });
  };
  
  // Iniciar conexión entre nodos
  const handleStartConnecting = (e: React.MouseEvent | React.TouchEvent, nodeId: string) => {
    if (readOnly) return;
    e.stopPropagation();
    setConnectingNode(nodeId);
  };
  
  // Finalizar conexión entre nodos
  const handleEndConnecting = (targetNodeId: string) => {
    if (!connectingNode || readOnly || connectingNode === targetNodeId) return;
    
    // Evitar conexiones duplicadas
    const isDuplicate = edges.some(
      edge => edge.source === connectingNode && edge.target === targetNodeId
    );
    
    if (!isDuplicate) {
      // Crear nueva conexión
      const newEdge = {
        id: `e-${connectingNode}-${targetNodeId}`,
        source: connectingNode,
        target: targetNodeId,
        animated: true,
        style: { strokeWidth: 2 }
      };
      
      const updatedEdges = [...edges, newEdge];
      setEdges(updatedEdges);
      onChange({ nodes, edges: updatedEdges }, selectedNode);
    }
    
    setConnectingNode(null);
  };
  
  // Cancelar conexión
  const handleCancelConnecting = () => {
    setConnectingNode(null);
  };

  // Renderizar líneas entre nodos conectados
  const renderEdges = () => {
    return edges.map(edge => {
      const sourceNode = nodes.find(node => node.id === edge.source);
      const targetNode = nodes.find(node => node.id === edge.target);
      
      if (!sourceNode || !targetNode) return null;
      
      // Calculamos posiciones basadas en minimización
      const isSourceMinimized = minimizedNodes.has(sourceNode.id);
      const isTargetMinimized = minimizedNodes.has(targetNode.id);
      
      // Dimensiones para calcular puntos de conexión
      const sourceWidth = isSourceMinimized ? 150 : 220;
      const targetWidth = isTargetMinimized ? 150 : 220;
      const sourceHeight = isSourceMinimized ? 40 : 70;
      const targetHeight = isTargetMinimized ? 40 : 70;
      
      // Calcular posiciones de inicio y fin
      // Puntos de salida y entrada optimizados
      const startX = sourceNode.position.x + sourceWidth;
      const startY = sourceNode.position.y + sourceHeight / 2;
      const endX = targetNode.position.x;
      const endY = targetNode.position.y + targetHeight / 2;
      
      // Calcular puntos de curvatura para evitar líneas rectas
      // Esto crea una curva más natural entre los nodos
      const dx = Math.abs(endX - startX);
      const dy = Math.abs(endY - startY);
      
      // Factores para la curvatura
      const curveFactor = Math.min(dx * 0.5, 100);
      
      // Puntos de control para la curva Bezier
      const controlPoint1X = startX + curveFactor;
      const controlPoint1Y = startY;
      const controlPoint2X = endX - curveFactor;
      const controlPoint2Y = endY;
      
      // Crear path con curva Bezier más natural
      const pathD = `M${startX},${startY} C${controlPoint1X},${controlPoint1Y} ${controlPoint2X},${controlPoint2Y} ${endX},${endY}`;
      
      return (
        <path 
          key={edge.id}
          d={pathD}
          stroke={edge.animated ? "#3b82f6" : "#64748b"}
          strokeWidth={edge.style?.strokeWidth || 2}
          fill="none"
          strokeDasharray={edge.animated ? "5,5" : "none"}
          className={edge.animated ? "animate-pulse" : ""}
          markerEnd="url(#arrowhead)"
        />
      );
    });
  };
  
  // Renderizar la línea temporal cuando se está conectando nodos
  const renderConnectionLine = () => {
    if (!connectingNode || !mousePosition) return null;
    
    const sourceNode = nodes.find(node => node.id === connectingNode);
    if (!sourceNode) return null;
    
    const isSourceMinimized = minimizedNodes.has(sourceNode.id);
    
    // Calcular posición de inicio
    const startX = sourceNode.position.x + (isSourceMinimized ? 50 : 100);
    const startY = sourceNode.position.y + (isSourceMinimized ? 25 : 25);
    
    // Obtener posición actual del cursor
    const endX = mousePosition.x / zoom - position.x;
    const endY = mousePosition.y / zoom - position.y;
    
    return (
      <path 
        d={`M${startX},${startY} L${endX},${endY}`}
        stroke="#3b82f6"
        strokeWidth={2}
        fill="none"
        strokeDasharray="5,5"
        className="animate-pulse"
      />
    );
  };

  // Determinar el ícono según el tipo de nodo
  const getNodeIcon = (nodeType: string) => {
    switch (nodeType) {
      case 'command':
        return <Wrench className="h-4 w-4 mr-2 text-blue-500 dark:text-blue-400" />;
      case 'sql':
        return <Database className="h-4 w-4 mr-2 text-green-500 dark:text-green-400" />;
      case 'sftp':
        return <ArrowRight className="h-4 w-4 mr-2 text-purple-500 dark:text-purple-400" />;
      case 'zip':
      case 'unzip':
        return <Settings2 className="h-4 w-4 mr-2 text-yellow-500 dark:text-yellow-400" />;
      case 'pipeline':
        return <Settings2 className="h-4 w-4 mr-2 text-red-500 dark:text-red-400" />;
      default:
        return <Info className="h-4 w-4 mr-2 text-gray-500 dark:text-gray-400" />;
    }
  };

  // Renderizar un nodo
  const renderNode = (node: any) => {
    const isSelected = node.id === selectedNode;
    const isPipelineStart = node.id === 'start' || node.id === 'pipeline-start';
    const isMinimized = minimizedNodes.has(node.id);
    
    // Aumentar el tamaño de los nodos para que se vean mejor en pantalla
    const nodeWidth = isMinimized ? 220 : 280; // Aumentado para mostrar más del nombre
    const nodeHeight = isMinimized ? 60 : 80;  // Aumentado para mejorar visualización
    
    let nodeColor = 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600';
    let headerColor = 'bg-slate-100 dark:bg-slate-700';
    let textColor = 'text-slate-900 dark:text-slate-100';
    let typeLabel = 'Nodo';
    
    // Determinar el color del nodo y la etiqueta según su tipo
    switch (node.type) {
      case 'command':
      case 'commandNode':
        nodeColor = 'bg-blue-50 dark:bg-blue-950 border-blue-300 dark:border-blue-700';
        headerColor = 'bg-blue-100 dark:bg-blue-900';
        typeLabel = 'Comando';
        break;
      case 'sql':
      case 'sqlNode':
        nodeColor = 'bg-green-50 dark:bg-green-950 border-green-300 dark:border-green-700';
        headerColor = 'bg-green-100 dark:bg-green-900';
        typeLabel = 'SQL';
        break;
      case 'sftp':
      case 'sftpNode':
      case 'sftpDownloaderNode':
      case 'sftpUploaderNode':
        nodeColor = 'bg-purple-50 dark:bg-purple-950 border-purple-300 dark:border-purple-700';
        headerColor = 'bg-purple-100 dark:bg-purple-900';
        typeLabel = node.type.includes('Downloader') ? 'SFTP ↓' : 'SFTP ↑';
        break;
      case 'zip':
      case 'zipNode':
        nodeColor = 'bg-yellow-50 dark:bg-yellow-950 border-yellow-300 dark:border-yellow-700';
        headerColor = 'bg-yellow-100 dark:bg-yellow-900';
        typeLabel = 'ZIP';
        break;
      case 'unzip':
      case 'unzipNode':
        nodeColor = 'bg-yellow-50 dark:bg-yellow-950 border-yellow-300 dark:border-yellow-700';
        headerColor = 'bg-yellow-100 dark:bg-yellow-900';
        typeLabel = 'UNZIP';
        break;
      case 'pipeline':
      case 'callPipelineNode':
        nodeColor = 'bg-red-50 dark:bg-red-950 border-red-300 dark:border-red-700';
        headerColor = 'bg-red-100 dark:bg-red-900';
        typeLabel = 'PIPELINE';
        break;
      default:
        // Mantener el estilo por defecto
        if (isPipelineStart) {
          nodeColor = 'bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600';
          headerColor = 'bg-gray-200 dark:bg-gray-800';
          textColor = 'text-gray-700 dark:text-gray-300';
          typeLabel = 'INICIO';
        }
        break;
    }
    
    // Si es nodo seleccionado, agregar estilo adicional
    if (isSelected) {
      nodeColor += ' ring-2 ring-offset-2 ring-blue-500 dark:ring-blue-400';
    }
    
    // Obtener el ícono según el tipo de nodo
    const iconComponent = getNodeIcon(node.type);
    
    // Estilo y tamaño basado en si está minimizado
    const nodeStyle = {
      left: `${node.position.x}px`,
      top: `${node.position.y}px`,
      width: isMinimized ? 'auto' : '220px',
      zIndex: isSelected ? 10 : 1
    };
    
    return (
      <div
        key={node.id}
        className={`absolute rounded-md border ${nodeColor} ${!readOnly ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'} shadow-sm overflow-hidden`}
        style={nodeStyle}
        onClick={() => {
          if (connectingNode && connectingNode !== node.id) {
            handleEndConnecting(node.id);
          } else {
            handleNodeClick(node.id);
          }
        }}
        onMouseDown={(e) => {
          if (!connectingNode) {
            handleNodeMouseDown(e, node.id);
          }
        }}
        onTouchStart={(e) => {
          if (!connectingNode) {
            handleNodeTouchStart(e, node.id);
          }
        }}
      >
        {/* Encabezado del nodo con tipo */}
        <div className={`text-xs font-bold px-2 py-1 ${headerColor} uppercase flex justify-between items-center`}>
          <span>{typeLabel}</span>
          {!readOnly && (
            <button
              className="text-slate-500 hover:text-slate-700"
              onClick={(e) => {
                e.stopPropagation();
                toggleMinimizeNode(node.id);
              }}
              title={isMinimized ? "Expandir" : "Minimizar"}
            >
              {isMinimized ? <Plus className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
            </button>
          )}
        </div>
        
        {/* Contenido del nodo */}
        <div className="p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              {iconComponent}
              {/* Siempre mostrar el nombre del nodo, incluso cuando está minimizado */}
              <span className={`font-medium ${textColor} truncate max-w-[170px]`}>
                {node.data.label}
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              {!readOnly && !isPipelineStart && (
                <button
                  className="text-blue-500 hover:text-blue-700"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStartConnecting(e, node.id);
                  }}
                  title="Conectar nodo"
                >
                  <Link2 className="h-4 w-4" />
                </button>
              )}
              
              {isSelected && !readOnly && !isPipelineStart && (
                <button
                  className="text-red-500 hover:text-red-700"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteNode(node.id);
                  }}
                  title="Eliminar nodo"
                >
                  <XCircle className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
          
          {/* Descripción del nodo */}
          {!isMinimized && node.data.description && (
            <div className="mt-2 text-xs text-slate-600 dark:text-slate-300 italic">
              {node.data.description}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Función para manejar la importación de layout
  const handleImportLayout = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!pipelineId) {
      toast({
        title: "Error",
        description: "No se puede importar el layout sin un ID de pipeline",
        variant: "destructive"
      });
      return;
    }
    
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const success = pipelineLayoutManager.importLayoutFromYAML(content);
        
        if (success) {
          // Recargar el layout
          const savedLayout = pipelineLayoutManager.getLayout(pipelineId);
          if (savedLayout) {
            const updatedNodes = nodes.map(node => {
              const savedPos = savedLayout.find(pos => pos.id === node.id);
              if (savedPos) {
                return {
                  ...node,
                  position: {
                    x: savedPos.x,
                    y: savedPos.y
                  }
                };
              }
              return node;
            });
            
            setNodes(updatedNodes);
            
            // Cargar nodos minimizados
            const minimizedNodeIds = pipelineLayoutManager.getMinimizedNodes(pipelineId);
            if (minimizedNodeIds && minimizedNodeIds.length > 0) {
              setMinimizedNodes(new Set(minimizedNodeIds));
            }
            
            toast({
              title: "Éxito",
              description: "Layout importado correctamente",
              variant: "default"
            });
            
            // Notificar cambios
            onChange({ nodes: updatedNodes, edges }, selectedNode);
          }
        } else {
          toast({
            title: "Error",
            description: "El archivo YAML no tiene el formato correcto",
            variant: "destructive"
          });
        }
      } catch (error) {
        console.error('Error al importar layout:', error);
        toast({
          title: "Error",
          description: "No se pudo importar el layout",
          variant: "destructive"
        });
      }
    };
    
    reader.readAsText(file);
    
    // Limpiar el input
    e.target.value = '';
  };

  return (
    <div
      className="relative w-[100vw] h-full border border-slate-300 dark:border-slate-700 rounded-md bg-slate-50 dark:bg-slate-900 overflow-hidden shadow-sm"
      ref={canvasRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      style={{
        maxWidth: '100%'
      }}
    >
      {/* Grid de fondo para el canvas infinito - ocupa todo el espacio disponible */}
      <div 
        className="absolute top-0 left-0 right-0 bottom-0 w-[50000px] h-[50000px]"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(0,0,0,0.05) 1px, transparent 1px)',
          backgroundSize: '20px 20px',
          transform: `scale(${zoom}) translate(${position.x}px, ${position.y}px)`,
          transformOrigin: '0 0',
          zIndex: 0
        }}
      />
      
      {/* SVG para renderizar las conexiones y líneas */}
      <svg className="absolute top-0 left-0 w-full h-full pointer-events-none">
        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="7"
            refX="0"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill="#64748b" />
          </marker>
        </defs>
        <g 
          transform={`scale(${zoom}) translate(${position.x}, ${position.y})`}
          style={{ transformOrigin: '0 0' }}
        >
          {renderEdges()}
          {renderConnectionLine()}
        </g>
      </svg>
      
      {/* Herramientas para conectar nodos */}
      {connectingNode && (
        <div className="fixed top-4 right-4 z-50 bg-white dark:bg-slate-800 rounded-md shadow-md border border-slate-200 dark:border-slate-700 p-2">
          <div className="flex flex-row items-center gap-2">
            <span className="text-sm font-medium">Conectando nodo...</span>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleCancelConnecting} 
              className="h-6 w-6 p-0"
            >
              <XCircle className="h-4 w-4 text-red-500" />
            </Button>
          </div>
        </div>
      )}
      
      {/* Controles de zoom y herramientas */}
      <div className="absolute bottom-4 left-4 z-50 bg-white dark:bg-slate-800 rounded-md shadow-md border border-slate-200 dark:border-slate-700 p-1">
        <div className="flex flex-row gap-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleZoom(0.1)}
                  className="h-8 w-8 p-0"
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Acercar</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleZoom(-0.1)}
                  className="h-8 w-8 p-0"
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Alejar</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setZoom(1);
                    setPosition({ x: 0, y: 0 });
                  }}
                  className="h-8 w-8 p-0"
                >
                  <Minus className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Reiniciar vista</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
      
      {/* Canvas para el editor de flujo */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute w-full h-full"
          style={{
            transform: `scale(${zoom}) translate(${position.x}px, ${position.y}px)`,
            transformOrigin: '0 0',
          }}
        >
          {/* Renderizar los nodos con pointer-events para que sean interactivos */}
          <div className="pointer-events-auto">
            {nodes.map(renderNode)}
          </div>
        </div>
      </div>
      
      {/* Mensaje de ayuda */}
      {nodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          {readOnly ? (
            <div className="text-center bg-slate-200/50 dark:bg-slate-800/50 p-4 rounded-lg max-w-md">
              <Info className="h-10 w-10 mx-auto mb-2 text-blue-500 dark:text-blue-400" />
              <p className="text-slate-700 dark:text-slate-300 font-medium">Este pipeline no tiene nodos configurados.</p>
            </div>
          ) : (
            <div className="text-center bg-slate-200/50 dark:bg-slate-800/50 p-4 rounded-lg max-w-md">
              <Info className="h-10 w-10 mx-auto mb-2 text-blue-500 dark:text-blue-400" />
              <p className="text-slate-700 dark:text-slate-300 font-medium">Usa los controles de la izquierda para añadir nodos al pipeline.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function PipelineEditor({
  flowData,
  onChange,
  onNodeSelect,
  readOnly = false,
  pipelineId,
}: PipelineEditorProps) {
      <DialogContent className="max-w-xl">
        {nodeDetailsLoading ? (
          <div className="py-8 space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : nodeDetailsData ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {nodeDetailsData.name}
                <span className="text-xs bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded-full">
                  {getTypeReadableLabel(nodeDetailsData.type)}
                </span>
              </DialogTitle>
              <DialogDescription>
                {nodeDetailsData.description}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-2">
              {/* Contenido específico basado en el tipo de nodo */}
              {nodeDetailsData.type === 'command' && nodeDetailsData.details && (
                <div className="space-y-3">
                  <div>
                    <h4 className="text-sm font-medium mb-1">Comando</h4>
                    <div className="bg-slate-50 dark:bg-slate-800 rounded-md p-3 text-xs font-mono border border-slate-200 dark:border-slate-700">
                      {nodeDetailsData.details.target} {nodeDetailsData.details.args}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium mb-1">Directorio de trabajo</h4>
                    <div className="bg-slate-50 dark:bg-slate-800 rounded-md p-3 text-xs">
                      {nodeDetailsData.details.working_directory || 'Directorio por defecto'}
                    </div>
                  </div>
                  {nodeDetailsData.details.raw_script && (
                    <div>
                      <h4 className="text-sm font-medium mb-1">Script</h4>
                      <div className="bg-slate-50 dark:bg-slate-800 rounded-md p-3 text-xs font-mono border border-slate-200 dark:border-slate-700 max-h-40 overflow-y-auto">
                        <pre>{nodeDetailsData.details.raw_script}</pre>
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {nodeDetailsData.type === 'query' && nodeDetailsData.details && (
                <div className="space-y-3">
                  <div>
                    <h4 className="text-sm font-medium mb-1">Descripción</h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {nodeDetailsData.details.description || 'Sin descripción'}
                    </p>
                  </div>
                  <Separator />
                  {nodeDetailsData.details.queries && nodeDetailsData.details.queries.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-1">Consultas SQL</h4>
                      <div className="space-y-2">
                        {nodeDetailsData.details.queries.map((query: any, index: number) => (
                          <div key={index} className="bg-slate-50 dark:bg-slate-800 rounded-md p-3 text-xs font-mono border border-slate-200 dark:border-slate-700">
                            <div className="flex justify-between mb-1">
                              <span className="font-medium">{query.name || `Consulta ${index + 1}`}</span>
                              <span className="text-slate-500">{query.enabled ? 'Activa' : 'Inactiva'}</span>
                            </div>
                            <div className="mt-2 max-h-32 overflow-y-auto">
                              <pre>{query.query_string}</pre>
                            </div>
                            <div className="mt-1">
                              <span className="text-slate-500">Archivo: </span>
                              {query.path || 'No especificado'}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {(nodeDetailsData.type === 'sftp_download' || nodeDetailsData.type === 'sftp_upload') && nodeDetailsData.details && (
                <div className="space-y-3">
                  <div>
                    <h4 className="text-sm font-medium mb-1">Servidor SFTP</h4>
                    {nodeDetailsData.details.sftp_link && (
                      <div className="bg-slate-50 dark:bg-slate-800 rounded-md p-3 text-xs">
                        <div><span className="font-medium">Servidor: </span>{nodeDetailsData.details.sftp_link.server}:{nodeDetailsData.details.sftp_link.port}</div>
                        <div><span className="font-medium">Usuario: </span>{nodeDetailsData.details.sftp_link.user}</div>
                      </div>
                    )}
                  </div>
                  <div>
                    <h4 className="text-sm font-medium mb-1">{nodeDetailsData.type === 'sftp_download' ? 'Ruta de salida' : 'Ruta de entrada'}</h4>
                    <div className="bg-slate-50 dark:bg-slate-800 rounded-md p-3 text-xs font-mono">
                      {nodeDetailsData.type === 'sftp_download' ? nodeDetailsData.details.output : nodeDetailsData.details.input}
                    </div>
                  </div>
                </div>
              )}
              
              {(nodeDetailsData.type === 'zip' || nodeDetailsData.type === 'unzip') && nodeDetailsData.details && (
                <div className="space-y-3">
                  {nodeDetailsData.type === 'zip' ? (
                    <div>
                      <h4 className="text-sm font-medium mb-1">Ruta de salida (archivo ZIP)</h4>
                      <div className="bg-slate-50 dark:bg-slate-800 rounded-md p-3 text-xs font-mono">
                        {nodeDetailsData.details.output}
                      </div>
                    </div>
                  ) : (
                    <>
                      <div>
                        <h4 className="text-sm font-medium mb-1">Archivo ZIP a extraer</h4>
                        <div className="bg-slate-50 dark:bg-slate-800 rounded-md p-3 text-xs font-mono">
                          {nodeDetailsData.details.input}
                        </div>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium mb-1">Directorio de extracción</h4>
                        <div className="bg-slate-50 dark:bg-slate-800 rounded-md p-3 text-xs font-mono">
                          {nodeDetailsData.details.output}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
              
              {nodeDetailsData.type === 'pipeline' && nodeDetailsData.details && (
                <div className="space-y-3">
                  <div>
                    <h4 className="text-sm font-medium mb-1">Pipeline llamado</h4>
                    <div className="bg-slate-50 dark:bg-slate-800 rounded-md p-3 border border-slate-200 dark:border-slate-700">
                      <p className="text-sm font-medium">{nodeDetailsData.details.name}</p>
                      <p className="text-xs text-slate-500 mt-1">{nodeDetailsData.details.description || 'Sin descripción'}</p>
                    </div>
                  </div>
                  <Separator />
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="font-medium">ID: </span>
                      <span className="font-mono">{nodeDetailsData.details.id.substring(0, 10)}...</span>
                    </div>
                    <div>
                      <span className="font-medium">Agente: </span>
                      <span>{nodeDetailsData.details.agent_passport_id?.substring(0, 10)}...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <DialogFooter>
              <Button onClick={() => setShowNodeDetails(false)}>Cerrar</Button>
            </DialogFooter>
          </>
        ) : (
          <div className="text-center py-8">
            <p className="text-slate-500">No se pudieron cargar los detalles del nodo</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}