import React, { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ZoomIn, ZoomOut, Plus, Minus, Trash2, XCircle, Settings2, ArrowRight, Wrench, Database, Info, Link2, Download, Upload } from "lucide-react";

// Componentes para el editor visual de flujos
// Implementación mejorada con soporte para móviles y conectar nodos

interface PipelineVisualEditorProps {
  flowData: {
    nodes: any[];
    edges: any[];
  };
  onChange: (updatedFlow: any, selectedNodeId?: string | null) => void;
  onViewNodeDetails?: (nodeId: string) => void; // Callback para ver detalles de un nodo
  readOnly?: boolean;
}

export default function PipelineVisualEditor({
  flowData,
  onChange,
  onViewNodeDetails,
  readOnly = false,
}: PipelineVisualEditorProps) {
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
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [mousePosition, setMousePosition] = useState<{ x: number, y: number } | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  // Sincronizar estados con los datos de flujo
  useEffect(() => {
    if (flowData) {
      setNodes(flowData.nodes || []);
      setEdges(flowData.edges || []);
    }
  }, [flowData]);
  
  // Efecto para ajustar el tamaño del canvas al tamaño de la ventana
  useEffect(() => {
    const updateCanvasSize = () => {
      if (canvasRef.current) {
        const { width, height } = canvasRef.current.getBoundingClientRect();
        setCanvasSize({ width, height });
      }
    };
    
    // Actualizar tamaño inicial
    updateCanvasSize();
    
    // Añadir listener para redimensionar cuando cambie el tamaño de la ventana
    window.addEventListener('resize', updateCanvasSize);
    
    // Limpiar listener al desmontar
    return () => {
      window.removeEventListener('resize', updateCanvasSize);
    };
  }, []);

  // Notificar cambios en el flujo
  const notifyChange = useCallback((selectedId: string | null = null) => {
    if (readOnly) return;
    
    onChange({
      nodes,
      edges,
    }, selectedId !== undefined ? selectedId : selectedNode);
  }, [nodes, edges, onChange, readOnly, selectedNode]);

  // Manejar la selección de un nodo
  const handleNodeClick = (nodeId: string) => {
    if (readOnly) return;
    
    const newSelectedNode = nodeId === selectedNode ? null : nodeId;
    setSelectedNode(newSelectedNode);
    
    // Notificar el cambio de selección
    notifyChange(newSelectedNode);
  };

  // Manejar la eliminación de un nodo
  const handleDeleteNode = (nodeId: string) => {
    if (readOnly || nodeId === 'pipeline-start') return;
    
    // Eliminar el nodo
    const updatedNodes = nodes.filter(node => node.id !== nodeId);
    
    // Eliminar todas las conexiones asociadas
    const updatedEdges = edges.filter(edge => 
      edge.source !== nodeId && edge.target !== nodeId
    );
    
    setNodes(updatedNodes);
    setEdges(updatedEdges);
    setSelectedNode(null);
    
    // Notificar cambios
    setTimeout(() => {
      notifyChange();
    }, 0);
  };

  // Manejar el zoom
  const handleZoom = (delta: number) => {
    const newZoom = Math.max(0.1, Math.min(2, zoom + delta));
    setZoom(newZoom);
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
      
      setEdges([...edges, newEdge]);
      notifyChange();
    }
    
    setConnectingNode(null);
  };
  
  // Cancelar conexión
  const handleCancelConnecting = () => {
    setConnectingNode(null);
  };

  // Función para añadir un nuevo nodo
  const addNode = (type: string) => {
    if (readOnly) return;
    
    const nodeId = `node-${Date.now()}`;
    const nodeType = `${type}Node`;
    const nodeName = `Nuevo ${type}`;
    
    // Crear un nuevo nodo
    const newNode = {
      id: nodeId,
      type: nodeType,
      data: {
        label: nodeName,
        properties: {},
        options: {}
      },
      position: {
        x: 250,
        y: 150 + (nodes.length * 100)
      }
    };
    
    // Añadir el nodo
    const updatedNodes = [...nodes, newNode];
    setNodes(updatedNodes);
    
    // Conectar con el nodo seleccionado o el inicio
    if (selectedNode) {
      const newEdge = {
        id: `e-${selectedNode}-${nodeId}`,
        source: selectedNode,
        target: nodeId,
        animated: false
      };
      
      const updatedEdges = [...edges, newEdge];
      setEdges(updatedEdges);
    }
    
    // Seleccionar el nuevo nodo
    setSelectedNode(nodeId);
    
    // Notificar cambios
    setTimeout(() => {
      notifyChange();
    }, 0);
  };

  // Renderizar un nodo
  const renderNode = (node: any) => {
    const isSelected = node.id === selectedNode;
    const isPipelineStart = node.id === 'pipeline-start';
    
    let nodeColor = 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white';
    let iconComponent = <Settings2 className="h-4 w-4 mr-2 text-slate-500 dark:text-slate-400" />;
    let headerColor = 'bg-slate-200 dark:bg-slate-700';
    
    // Asignar color e ícono según el tipo de nodo
    switch (node.type) {
      case 'pipelineStart':
        nodeColor = 'bg-blue-50 dark:bg-blue-950 border-blue-400 dark:border-blue-800 text-blue-900 dark:text-blue-100';
        headerColor = 'bg-blue-200 dark:bg-blue-900';
        iconComponent = <Settings2 className="h-4 w-4 mr-2 text-blue-600 dark:text-blue-400" />;
        break;
      case 'commandNode':
        nodeColor = 'bg-amber-50 dark:bg-amber-950 border-amber-400 dark:border-amber-800 text-amber-900 dark:text-amber-100';
        headerColor = 'bg-amber-200 dark:bg-amber-900';
        iconComponent = <Wrench className="h-4 w-4 mr-2 text-amber-600 dark:text-amber-400" />;
        break;
      case 'queryNode':
        nodeColor = 'bg-green-50 dark:bg-green-950 border-green-400 dark:border-green-800 text-green-900 dark:text-green-100';
        headerColor = 'bg-green-200 dark:bg-green-900';
        iconComponent = <Database className="h-4 w-4 mr-2 text-green-600 dark:text-green-400" />;
        break;
      case 'sftpDownloaderNode':
        nodeColor = 'bg-purple-50 dark:bg-purple-950 border-purple-400 dark:border-purple-800 text-purple-900 dark:text-purple-100';
        headerColor = 'bg-purple-200 dark:bg-purple-900';
        iconComponent = <Download className="h-4 w-4 mr-2 text-purple-600 dark:text-purple-400" />;
        break;
      case 'sftpUploaderNode':
        nodeColor = 'bg-indigo-50 dark:bg-indigo-950 border-indigo-400 dark:border-indigo-800 text-indigo-900 dark:text-indigo-100';
        headerColor = 'bg-indigo-200 dark:bg-indigo-900';
        iconComponent = <Upload className="h-4 w-4 mr-2 text-indigo-600 dark:text-indigo-400" />;
        break;
      case 'zipNode':
        nodeColor = 'bg-red-50 dark:bg-red-950 border-red-400 dark:border-red-800 text-red-900 dark:text-red-100';
        headerColor = 'bg-red-200 dark:bg-red-900';
        iconComponent = <ArrowRight className="h-4 w-4 mr-2 text-red-600 dark:text-red-400" />;
        break;
      case 'unzipNode':
        nodeColor = 'bg-orange-50 dark:bg-orange-950 border-orange-400 dark:border-orange-800 text-orange-900 dark:text-orange-100';
        headerColor = 'bg-orange-200 dark:bg-orange-900';
        iconComponent = <ArrowRight className="h-4 w-4 mr-2 text-orange-600 dark:text-orange-400" />;
        break;
      case 'callPipelineNode':
        nodeColor = 'bg-emerald-50 dark:bg-emerald-950 border-emerald-400 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100';
        headerColor = 'bg-emerald-200 dark:bg-emerald-900';
        iconComponent = <Link2 className="h-4 w-4 mr-2 text-emerald-600 dark:text-emerald-400" />;
        break;
    }
    
    if (isSelected) {
      nodeColor += ' ring-2 ring-offset-1 ring-blue-500';
    }
    
    // Calcular posición con zoom y desplazamiento
    const nodeStyle = {
      left: `${(node.position.x * zoom) + position.x}px`,
      top: `${(node.position.y * zoom) + position.y}px`,
      transform: `scale(${zoom})`,
      transformOrigin: 'top left',
      width: '220px',
      zIndex: isSelected ? 10 : 1
    };
    
    // Obtener descripción según tipo de nodo
    const getNodeTypeName = () => {
      switch (node.type) {
        case 'commandNode': return 'Comando';
        case 'queryNode': return 'Consulta SQL';
        case 'sftpDownloaderNode': return 'SFTP Descarga';
        case 'sftpUploaderNode': return 'SFTP Subida';
        case 'zipNode': return 'Comprimir';
        case 'unzipNode': return 'Descomprimir';
        case 'callPipelineNode': return 'Llamar Pipeline';
        case 'pipelineStart': return 'Inicio Pipeline';
        default: return 'Nodo';
      }
    };
    
    return (
      <div
        key={node.id}
        className={`absolute rounded-md border p-0 ${nodeColor} shadow-md overflow-hidden`}
        style={nodeStyle}
        onClick={() => handleNodeClick(node.id)}
      >
        {/* Cabecera arrastrable */}
        <div 
          className={`flex items-center justify-between p-2 ${headerColor} ${!readOnly ? 'cursor-grab active:cursor-grabbing' : ''}`}
          onMouseDown={(e) => !readOnly && handleNodeMouseDown(e, node.id)}
          onTouchStart={(e) => !readOnly && handleNodeTouchStart(e, node.id)}
        >
          <div className="flex items-center">
            {iconComponent}
            <span className="font-medium truncate max-w-[120px]" title={node.data.label}>
              {node.data.label}
            </span>
          </div>
          
          <div className="flex space-x-1">
            {!readOnly && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      className="text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 bg-white/20 dark:bg-black/20 rounded p-0.5"
                      onClick={(e) => {
                        e.stopPropagation();
                        // Notificar al padre que el usuario quiere ver los detalles del nodo
                        if (onViewNodeDetails) {
                          onViewNodeDetails(node.id);
                        }
                      }}
                    >
                      <Info className="h-3.5 w-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p>Ver detalles</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            
            {isSelected && !readOnly && !isPipelineStart && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      className="text-red-500 hover:text-red-700 bg-white/20 dark:bg-black/20 rounded p-0.5"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteNode(node.id);
                      }}
                    >
                      <XCircle className="h-3.5 w-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p>Eliminar nodo</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </div>
        
        {/* Contenido del nodo */}
        <div className="p-2">
          <div className="flex items-center mb-1">
            <div className="text-xs px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium">
              {getNodeTypeName()}
            </div>
          </div>
          
          {node.data.description && (
            <div className="mt-1 text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
              {node.data.description}
            </div>
          )}
          
          {/* Características específicas por tipo de nodo */}
          {(node.type === 'sftpDownloaderNode' || node.type === 'sftpUploaderNode') && (
            <div className="mt-1 text-xs text-slate-500 flex flex-col gap-1">
              {node.data.details?.sftpDownloader?.output && (
                <span className="truncate" title={node.data.details.sftpDownloader.output}>
                  Salida: {node.data.details.sftpDownloader.output}
                </span>
              )}
              {node.data.details?.sftpUploader?.input && (
                <span className="truncate" title={node.data.details.sftpUploader.input}>
                  Entrada: {node.data.details.sftpUploader.input}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Renderizar una conexión entre nodos
  const renderEdge = (edge: any) => {
    // Encontrar los nodos de origen y destino
    const sourceNode = nodes.find(node => node.id === edge.source);
    const targetNode = nodes.find(node => node.id === edge.target);
    
    if (!sourceNode || !targetNode) return null;
    
    // Calcular los puntos de conexión
    const startX = (sourceNode.position.x * zoom) + position.x + 100; // Centro del nodo
    const startY = (sourceNode.position.y * zoom) + position.y + 25;  // Parte inferior del nodo
    const endX = (targetNode.position.x * zoom) + position.x + 100;   // Centro del nodo
    const endY = (targetNode.position.y * zoom) + position.y;         // Parte superior del nodo
    
    // Definir la curva de la línea
    const controlPointX1 = startX;
    const controlPointY1 = startY + 50;
    const controlPointX2 = endX;
    const controlPointY2 = endY - 50;
    
    // Generar el path
    const path = `M ${startX} ${startY} C ${controlPointX1} ${controlPointY1}, ${controlPointX2} ${controlPointY2}, ${endX} ${endY}`;
    
    // Estilo para la línea con mejor contraste para ambos temas
    const edgeStyle = {
      stroke: edge.animated ? '#2563eb' : '#64748b', // Azul más oscuro y gris más visible
      strokeWidth: 2.5, // Ligeramente más grueso para mejor visibilidad
      fill: 'none',
      strokeDasharray: edge.animated ? '5,5' : 'none'
    };
    
    return (
      <path
        key={edge.id}
        d={path}
        style={edgeStyle}
      />
    );
  };

  // Renderizar líneas entre nodos conectados
  const renderEdges = () => {
    return edges.map(edge => {
      const sourceNode = nodes.find(node => node.id === edge.source);
      const targetNode = nodes.find(node => node.id === edge.target);
      
      if (!sourceNode || !targetNode) return null;
      
      // Calcular posiciones de inicio y fin
      const startX = sourceNode.position.x + 100; // Ancho aproximado del nodo / 2
      const startY = sourceNode.position.y + 25; // Alto aproximado del nodo / 2
      const endX = targetNode.position.x + 100;
      const endY = targetNode.position.y + 25;
      
      // Añadir un ligero curvado a la línea
      const midX = (startX + endX) / 2;
      const midY = (startY + endY) / 2 - 30;
      
      const pathD = `M${startX},${startY} Q${midX},${midY} ${endX},${endY}`;
      
      return (
        <path 
          key={edge.id}
          d={pathD}
          stroke={edge.animated ? "#3b82f6" : "#888"}
          strokeWidth={edge.style?.strokeWidth || 2}
          fill="none"
          strokeDasharray={edge.animated ? "5,5" : "none"}
          className={edge.animated ? "animate-pulse" : ""}
        />
      );
    });
  };
  
  // Renderizar la línea temporal cuando se está conectando nodos
  const renderConnectionLine = () => {
    if (!connectingNode) return null;
    
    const sourceNode = nodes.find(node => node.id === connectingNode);
    if (!sourceNode) return null;
    
    // Calcular posición de inicio
    const startX = sourceNode.position.x + 100; // Ancho aproximado del nodo / 2
    const startY = sourceNode.position.y + 25; // Alto aproximado del nodo / 2
    
    // Obtener posición actual del cursor
    const endX = (mousePosition?.x || startX + 100) - position.x;
    const endY = (mousePosition?.y || startY + 50) - position.y;
    
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

  return (
    <div
      className="relative w-full h-[calc(100vh-150px)] min-h-[600px] border border-slate-300 dark:border-slate-700 rounded-md bg-slate-50 dark:bg-slate-900 overflow-hidden shadow-sm"
      ref={canvasRef}
      onMouseDown={handleMouseDown}
      onMouseMove={(e) => {
        handleMouseMove(e);
      }}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      {/* Grid de fondo para el canvas infinito */}
      <div 
        className="absolute top-0 left-0 w-[5000px] h-[5000px]"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(0,0,0,0.1) 1px, transparent 1px)',
          backgroundSize: '20px 20px',
          transform: `scale(${zoom}) translate(${position.x}px, ${position.y}px)`,
          transformOrigin: '0 0',
        }}
      />
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
      
      {/* El panel de nodos disponibles ahora está en PipelineStudio.tsx como panel flotante */}
      
      {/* SVG para renderizar las conexiones y líneas */}
      <svg className="absolute top-0 left-0 w-full h-full pointer-events-none">
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
      
      {/* Canvas para el editor de flujo */}
      <div className="absolute inset-0">
        {/* Renderizar los nodos */}
        {nodes.map(node => {
          const isSelected = node.id === selectedNode;
          const isPipelineStart = node.id === 'start';
          const isConnecting = connectingNode !== null;
          
          let nodeColor = 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600';
          let textColor = 'text-slate-900 dark:text-slate-100';
          
          // Determinar el color del nodo según su tipo
          switch (node.type) {
            case 'command':
              nodeColor = 'bg-blue-50 dark:bg-blue-950 border-blue-300 dark:border-blue-700';
              break;
            case 'sql':
              nodeColor = 'bg-green-50 dark:bg-green-950 border-green-300 dark:border-green-700';
              break;
            case 'sftp':
              nodeColor = 'bg-purple-50 dark:bg-purple-950 border-purple-300 dark:border-purple-700';
              break;
            case 'zip':
            case 'unzip':
              nodeColor = 'bg-yellow-50 dark:bg-yellow-950 border-yellow-300 dark:border-yellow-700';
              break;
            case 'pipeline':
              nodeColor = 'bg-red-50 dark:bg-red-950 border-red-300 dark:border-red-700';
              break;
            default:
              // Mantener el estilo por defecto
              break;
          }
          
          // Si es nodo seleccionado, agregar estilo adicional
          if (isSelected) {
            nodeColor += ' ring-2 ring-offset-2 ring-blue-500 dark:ring-blue-400';
          }
          
          // Si es nodo inicial, agregar estilo distintivo
          if (isPipelineStart) {
            nodeColor = 'bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600';
            textColor = 'text-gray-700 dark:text-gray-300';
          }
          
          // Determinar el ícono según el tipo de nodo
          let iconComponent;
          switch (node.type) {
            case 'command':
              iconComponent = <Wrench className="h-4 w-4 mr-2 text-blue-500 dark:text-blue-400" />;
              break;
            case 'sql':
              iconComponent = <Database className="h-4 w-4 mr-2 text-green-500 dark:text-green-400" />;
              break;
            case 'sftp':
              iconComponent = <ArrowRight className="h-4 w-4 mr-2 text-purple-500 dark:text-purple-400" />;
              break;
            case 'zip':
            case 'unzip':
              iconComponent = <Settings2 className="h-4 w-4 mr-2 text-yellow-500 dark:text-yellow-400" />;
              break;
            case 'pipeline':
              iconComponent = <Settings2 className="h-4 w-4 mr-2 text-red-500 dark:text-red-400" />;
              break;
            default:
              iconComponent = <Info className="h-4 w-4 mr-2 text-gray-500 dark:text-gray-400" />;
              break;
          }
          
          const nodeStyle = {
            left: `${node.position.x}px`,
            top: `${node.position.y}px`,
            minWidth: '200px',
            zIndex: isSelected ? 10 : 1
          };
          
          return (
            <div
              key={node.id}
              className={`absolute rounded-md border p-3 ${nodeColor} ${!readOnly ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'} shadow-sm`}
              style={nodeStyle}
              onClick={() => {
                if (isConnecting && connectingNode !== node.id) {
                  handleEndConnecting(node.id);
                } else {
                  handleNodeClick(node.id);
                }
              }}
              onMouseDown={(e) => {
                if (!isConnecting) {
                  handleNodeMouseDown(e, node.id);
                }
              }}
              onTouchStart={(e) => {
                if (!isConnecting) {
                  handleNodeTouchStart(e, node.id);
                }
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  {iconComponent}
                  <span className={`font-medium ${textColor}`}>{node.data.label}</span>
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
            </div>
          );
        })}
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