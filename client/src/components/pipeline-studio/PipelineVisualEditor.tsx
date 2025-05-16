import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ZoomIn, ZoomOut, Plus, Minus, Trash2, XCircle, Settings2, ArrowRight, Wrench, Database } from "lucide-react";

// Componentes ficticios para el editor visual de flujos
// En una implementación real deberías usar una librería como react-flow o similar

interface PipelineVisualEditorProps {
  flowData: {
    nodes: any[];
    edges: any[];
  };
  onChange: (updatedFlow: any) => void;
  readOnly?: boolean;
}

export default function PipelineVisualEditor({
  flowData,
  onChange,
  readOnly = false,
}: PipelineVisualEditorProps) {
  const [nodes, setNodes] = useState<any[]>([]);
  const [edges, setEdges] = useState<any[]>([]);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Sincronizar estados con los datos de flujo
  useEffect(() => {
    if (flowData) {
      setNodes(flowData.nodes || []);
      setEdges(flowData.edges || []);
    }
  }, [flowData]);

  // Notificar cambios en el flujo
  const notifyChange = useCallback(() => {
    if (readOnly) return;
    
    onChange({
      nodes,
      edges,
    });
  }, [nodes, edges, onChange, readOnly]);

  // Manejar la selección de un nodo
  const handleNodeClick = (nodeId: string) => {
    if (readOnly) return;
    
    setSelectedNode(nodeId === selectedNode ? null : nodeId);
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

  // Manejar el inicio del arrastre (pan)
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 1 && e.button !== 0) return; // Solo botón central o izquierdo
    if (e.button === 0 && !e.altKey) return; // Botón izquierdo solo con Alt
    
    setDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  // Manejar el movimiento durante el arrastre
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging) return;
    
    const dx = (e.clientX - dragStart.x) * 0.5;
    const dy = (e.clientY - dragStart.y) * 0.5;
    
    setPosition({
      x: position.x + dx,
      y: position.y + dy,
    });
    
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  // Manejar el fin del arrastre
  const handleMouseUp = () => {
    setDragging(false);
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
    
    let nodeColor = 'bg-slate-100 border-slate-300';
    let iconComponent = <Settings2 className="h-4 w-4 mr-2" />;
    
    // Asignar color e ícono según el tipo de nodo
    switch (node.type) {
      case 'pipelineStart':
        nodeColor = 'bg-blue-50 border-blue-300';
        iconComponent = <Settings2 className="h-4 w-4 mr-2 text-blue-500" />;
        break;
      case 'commandNode':
        nodeColor = 'bg-amber-50 border-amber-300';
        iconComponent = <Wrench className="h-4 w-4 mr-2 text-amber-500" />;
        break;
      case 'queryNode':
        nodeColor = 'bg-green-50 border-green-300';
        iconComponent = <Database className="h-4 w-4 mr-2 text-green-500" />;
        break;
      case 'sftpDownloaderNode':
      case 'sftpUploaderNode':
        nodeColor = 'bg-purple-50 border-purple-300';
        iconComponent = <ArrowRight className="h-4 w-4 mr-2 text-purple-500" />;
        break;
      case 'zipNode':
      case 'unzipNode':
        nodeColor = 'bg-red-50 border-red-300';
        iconComponent = <ArrowRight className="h-4 w-4 mr-2 text-red-500" />;
        break;
      case 'callPipelineNode':
        nodeColor = 'bg-emerald-50 border-emerald-300';
        iconComponent = <ArrowRight className="h-4 w-4 mr-2 text-emerald-500" />;
        break;
    }
    
    if (isSelected) {
      nodeColor += ' ring-2 ring-offset-2 ring-blue-500';
    }
    
    // Calcular posición con zoom y desplazamiento
    const nodeStyle = {
      left: `${(node.position.x * zoom) + position.x}px`,
      top: `${(node.position.y * zoom) + position.y}px`,
      transform: `scale(${zoom})`,
      transformOrigin: 'top left',
      width: '200px',
      zIndex: isSelected ? 10 : 1
    };
    
    return (
      <div
        key={node.id}
        className={`absolute rounded-md border p-3 ${nodeColor} cursor-pointer shadow-sm`}
        style={nodeStyle}
        onClick={() => handleNodeClick(node.id)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            {iconComponent}
            <span className="font-medium">{node.data.label}</span>
          </div>
          
          {isSelected && !readOnly && !isPipelineStart && (
            <button
              className="text-red-500 hover:text-red-700"
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteNode(node.id);
              }}
            >
              <XCircle className="h-4 w-4" />
            </button>
          )}
        </div>
        
        {node.data.description && (
          <div className="mt-1 text-xs text-slate-500">
            {node.data.description}
          </div>
        )}
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
    
    // Estilo para la línea
    const edgeStyle = {
      stroke: edge.animated ? '#3b82f6' : '#94a3b8',
      strokeWidth: 2,
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

  return (
    <div
      className="relative w-full h-[600px] border rounded-md bg-slate-50 overflow-hidden"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Controles de zoom y herramientas */}
      <div className="absolute top-2 right-2 z-50 bg-white rounded-md shadow-sm border p-1">
        <div className="flex flex-col gap-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleZoom(0.1)}
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
                >
                  <Minus className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Reiniciar vista</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
      
      {/* Panel de nodos disponibles */}
      {!readOnly && (
        <div className="absolute top-2 left-2 z-50 bg-white rounded-md shadow-sm border p-2">
          <div className="text-sm font-medium mb-2">Añadir nodos</div>
          <div className="flex flex-col gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => addNode('command')}
            >
              <Wrench className="h-4 w-4 mr-2" />
              Comando
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => addNode('query')}
            >
              <Database className="h-4 w-4 mr-2" />
              Consulta SQL
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => addNode('sftpDownloader')}
            >
              <ArrowRight className="h-4 w-4 mr-2" />
              SFTP Descarga
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => addNode('sftpUploader')}
            >
              <ArrowRight className="h-4 w-4 mr-2" />
              SFTP Subida
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => addNode('zip')}
            >
              <ArrowRight className="h-4 w-4 mr-2" />
              Comprimir
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => addNode('unzip')}
            >
              <ArrowRight className="h-4 w-4 mr-2" />
              Descomprimir
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => addNode('callPipeline')}
            >
              <ArrowRight className="h-4 w-4 mr-2" />
              Llamar Pipeline
            </Button>
          </div>
        </div>
      )}
      
      {/* Canvas para el editor de flujo */}
      <div className="absolute inset-0">
        {/* Renderizar las conexiones */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
          {edges.map(renderEdge)}
        </svg>
        
        {/* Renderizar los nodos */}
        {nodes.map(renderNode)}
      </div>
      
      {/* Mensaje de ayuda */}
      {nodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center text-slate-400">
          {readOnly ? (
            <p>Este pipeline no tiene nodos configurados.</p>
          ) : (
            <p>Usa los controles de la izquierda para añadir nodos al pipeline.</p>
          )}
        </div>
      )}
    </div>
  );
}