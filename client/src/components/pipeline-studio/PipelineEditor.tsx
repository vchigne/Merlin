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
import { Badge } from "@/components/ui/badge";

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

// Función auxiliar para determinar el tipo de nodo
const determineUnitType = (unit: any): string => {
  if (unit.command_id) return 'command';
  if (unit.query_queue_id) return 'query';
  if (unit.sftp_downloader_id) return 'sftp_download';
  if (unit.sftp_uploader_id) return 'sftp_upload';
  if (unit.zip_id) return 'zip';
  if (unit.unzip_id) return 'unzip';
  if (unit.call_pipeline) return 'pipeline';
  return 'unknown';
};

// Función auxiliar para obtener una descripción legible del tipo de unidad
const getUnitTypeDescription = (unit: any): string => {
  if (unit.command_id) return 'Comando';
  if (unit.query_queue_id) return 'Consulta SQL';
  if (unit.sftp_downloader_id) return 'Descarga SFTP';
  if (unit.sftp_uploader_id) return 'Subida SFTP';
  if (unit.zip_id) return 'Compresión ZIP';
  if (unit.unzip_id) return 'Extracción ZIP';
  if (unit.call_pipeline) return 'Llamada a Pipeline';
  return 'Unidad desconocida';
};

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
  
  // Estados para el diálogo de detalles del nodo
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<any>(null);
  const [unitDetails, setUnitDetails] = useState<any>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [nodeStart, setNodeStart] = useState({ x: 0, y: 0 });
  const [connecting, setConnecting] = useState<boolean>(false);
  const [connectionStart, setConnectionStart] = useState<string | null>(null);
  const [connectionPreview, setConnectionPreview] = useState({ x: 0, y: 0 });
  const [showControls, setShowControls] = useState(true);
  const canvasRef = useRef<HTMLDivElement>(null);
  
  // Inicializar nodes y edges cuando cambia flowData
  useEffect(() => {
    if (flowData) {
      setNodes(flowData.nodes || []);
      setEdges(flowData.edges || []);
      
      // Si hay nodos, centrar el canvas en el primer nodo
      if (flowData.nodes && flowData.nodes.length > 0 && position.x === 0 && position.y === 0) {
        const firstNode = flowData.nodes[0];
        
        if (firstNode.position) {
          setPosition({
            x: -firstNode.position.x + window.innerWidth / 2 - 100,
            y: -firstNode.position.y + window.innerHeight / 2 - 100
          });
        }
      }
    }
  }, [flowData]);
  
  // Manejar actualizaciones del layout (posiciones de nodos)
  useEffect(() => {
    if (pipelineId && nodes.length > 0) {
      // Aquí podríamos guardar el layout del pipeline (posiciones de nodos)
      // en el sistema de plantillas o en la base de datos.
      
      // Por ahora, simplemente usamos el pipeline layout manager para almacenar en memoria
      pipelineLayoutManager.saveLayout(pipelineId, nodes);
    }
  }, [nodes, pipelineId]);
  
  // Informar al padre de los cambios
  const emitChanges = useCallback(() => {
    onChange({ nodes, edges }, selectedNode);
  }, [nodes, edges, onChange, selectedNode]);
  
  // Añadir un nuevo nodo al editor
  const addNode = useCallback((nodeData: any) => {
    // Obtener posición relativa al centro de la vista actual
    const offsetX = window.innerWidth / 2 - position.x;
    const offsetY = window.innerHeight / 2 - position.y;
    
    const newNode = {
      id: nodeData.id,
      type: nodeData.type,
      data: nodeData.data,
      position: {
        x: offsetX,
        y: offsetY
      }
    };
    
    setNodes(current => [...current, newNode]);
    setSelectedNode(newNode.id);
    
    // Después de añadir el nodo, emitir cambios
    setTimeout(() => {
      emitChanges();
    }, 0);
  }, [position, emitChanges]);
  
  // Eliminar un nodo del editor
  const removeNode = useCallback((nodeId: string) => {
    // Eliminar nodo
    setNodes(current => current.filter(node => node.id !== nodeId));
    
    // Eliminar conexiones relacionadas con este nodo
    setEdges(current => 
      current.filter(edge => edge.source !== nodeId && edge.target !== nodeId)
    );
    
    // Limpiar selección si era el nodo seleccionado
    if (selectedNode === nodeId) {
      setSelectedNode(null);
    }
    
    // Emitir cambios
    setTimeout(() => {
      emitChanges();
    }, 0);
  }, [selectedNode, emitChanges]);
  
  // Establecer una conexión entre dos nodos
  const connectNodes = useCallback((sourceId: string, targetId: string) => {
    // No permitir conexiones al mismo nodo
    if (sourceId === targetId) return;
    
    // Verificar si ya existe la conexión
    const connectionExists = edges.some(
      edge => edge.source === sourceId && edge.target === targetId
    );
    
    if (!connectionExists) {
      const newEdge = {
        id: `e${sourceId}-${targetId}`,
        source: sourceId,
        target: targetId,
        animated: true,
        style: { stroke: '#10b981', strokeWidth: 2 }
      };
      
      setEdges(current => [...current, newEdge]);
      
      // Emitir cambios
      setTimeout(() => {
        emitChanges();
      }, 0);
    }
  }, [edges, emitChanges]);
  
  // Eliminar una conexión
  const removeConnection = useCallback((edgeId: string) => {
    setEdges(current => current.filter(edge => edge.id !== edgeId));
    
    // Emitir cambios
    setTimeout(() => {
      emitChanges();
    }, 0);
  }, [emitChanges]);
  
  // Manejar el zoom
  const handleZoom = useCallback((delta: number) => {
    setZoom(current => {
      const newZoom = Math.max(0.1, Math.min(2, current + delta * 0.1));
      return newZoom;
    });
  }, []);
  
  // Manejar eventos de rueda del mouse para zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 1 : -1;
      handleZoom(delta);
    }
  }, [handleZoom]);
  
  // Manejar eventos de teclado
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Si estamos editando un campo, no procesamos teclas
      if (
        document.activeElement &&
        (document.activeElement.tagName === "INPUT" ||
         document.activeElement.tagName === "TEXTAREA")
      ) {
        return;
      }
      
      switch (e.key) {
        case "Delete":
        case "Backspace":
          if (selectedNode && !readOnly) {
            removeNode(selectedNode);
          }
          break;
        case "+":
          handleZoom(1);
          break;
        case "-":
          handleZoom(-1);
          break;
        case "Escape":
          if (connecting) {
            setConnecting(false);
            setConnectionStart(null);
          } else {
            setSelectedNode(null);
          }
          break;
        default:
          break;
      }
    };
    
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedNode, removeNode, handleZoom, connecting, readOnly]);
  
  // Manejar inicio de arrastre del canvas
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Solo iniciamos arrastre con clic principal y sin nodo seleccionado
    if (e.button === 0 && !selectedNode && !connecting) {
      setDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  }, [selectedNode, connecting]);
  
  // Manejar movimiento durante arrastre
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    // Actualizar posición del cursor para la vista previa de conexiones
    if (connecting && connectionStart) {
      const bounds = canvasRef.current?.getBoundingClientRect();
      if (bounds) {
        setConnectionPreview({
          x: (e.clientX - bounds.left) / zoom - position.x / zoom,
          y: (e.clientY - bounds.top) / zoom - position.y / zoom
        });
      }
    }
    
    // Actualizar posición durante arrastre del canvas
    if (dragging) {
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      
      setPosition(current => ({
        x: current.x + dx,
        y: current.y + dy
      }));
      
      setDragStart({ x: e.clientX, y: e.clientY });
    }
    
    // Actualizar posición durante arrastre de un nodo
    if (draggingNode) {
      const dx = (e.clientX - nodeStart.x) / zoom;
      const dy = (e.clientY - nodeStart.y) / zoom;
      
      setNodes(current => 
        current.map(node => 
          node.id === draggingNode
            ? { 
                ...node, 
                position: { 
                  x: node.position.x + dx, 
                  y: node.position.y + dy 
                } 
              }
            : node
        )
      );
      
      setNodeStart({ x: e.clientX, y: e.clientY });
      
      // Emitir cambios después de terminar el arrastre
      setTimeout(() => {
        emitChanges();
      }, 100);
    }
  }, [dragging, dragStart, zoom, position, draggingNode, nodeStart, emitChanges, connecting, connectionStart]);
  
  // Manejar fin de arrastre
  const handleMouseUp = useCallback(() => {
    if (dragging) {
      setDragging(false);
    }
    
    if (draggingNode) {
      setDraggingNode(null);
    }
  }, [dragging, draggingNode]);
  
  // Función para obtener los detalles de una unidad específica
  const fetchUnitDetails = async (unitData: any) => {
    setSelectedUnit(unitData);
    setIsDialogOpen(true);
    setIsLoadingDetails(true);
    
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
        setIsLoadingDetails(false);
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
      setIsLoadingDetails(false);
    }
  };
  
  // Manejar clics en nodos
  const handleNodeClick = (nodeId: string) => {
    const newSelectedNodeId = nodeId === selectedNode ? null : nodeId;
    setSelectedNode(newSelectedNodeId);
    
    // Notificar al componente padre sobre el nodo seleccionado
    if (onNodeSelect) {
      if (newSelectedNodeId) {
        const selectedNodeData = nodes.find(node => node.id === newSelectedNodeId);
        
        // Mostrar diálogo con detalles del nodo
        if (selectedNodeData?.data?.unit) {
          fetchUnitDetails(selectedNodeData.data.unit);
        }
        
        onNodeSelect(selectedNodeData);
      } else {
        onNodeSelect(null);
      }
    }
  };
  
  // Cerrar el diálogo de detalles
  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setTimeout(() => {
      setSelectedUnit(null);
      setUnitDetails(null);
    }, 200);
  };
  
  // Manejar inicio de arrastre de nodo
  const handleNodeMouseDown = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation(); // Prevenir propagación al canvas
    
    if (e.button === 0) { // Clic principal
      if (connecting) {
        // Finalizar conexión si estamos en modo conexión
        if (connectionStart && connectionStart !== nodeId) {
          connectNodes(connectionStart, nodeId);
        }
        setConnecting(false);
        setConnectionStart(null);
      } else if (e.ctrlKey || e.metaKey) {
        // Iniciar conexión con Ctrl+clic
        setConnecting(true);
        setConnectionStart(nodeId);
      } else if (!readOnly) {
        // Iniciar arrastre de nodo
        setDraggingNode(nodeId);
        setNodeStart({ x: e.clientX, y: e.clientY });
      }
      
      // Seleccionar el nodo
      setSelectedNode(nodeId);
    }
  };
  
  // Manejar clic en borde
  const handleEdgeClick = (e: React.MouseEvent, edgeId: string) => {
    e.stopPropagation();
    
    if (!readOnly) {
      removeConnection(edgeId);
    }
  };
  
  // Renderizado del canvas y sus elementos
  return (
    <div className="w-full h-full flex flex-col overflow-hidden relative bg-slate-50 dark:bg-slate-900">
      {/* Barra de herramientas flotante */}
      <div 
        className={`absolute top-4 right-4 bg-white dark:bg-slate-800 rounded-lg shadow-lg p-1 z-50 transition-all duration-300 ${
          showControls ? "opacity-100" : "opacity-40"
        }`}
        onMouseEnter={() => setShowControls(true)}
        onMouseLeave={() => setShowControls(false)}
      >
        <div className="flex flex-col gap-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleZoom(1)}
                  className="w-8 h-8"
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">
                <p>Acercar (Zoom In)</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleZoom(-1)}
                  className="w-8 h-8"
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">
                <p>Alejar (Zoom Out)</p>
              </TooltipContent>
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
                  className="w-8 h-8"
                >
                  <Save className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">
                <p>Restablecer vista</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          {connecting && connectionStart && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setConnecting(false);
                      setConnectionStart(null);
                    }}
                    className="w-8 h-8 text-red-500"
                  >
                    <XCircle className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left">
                  <p>Cancelar conexión</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          
          {selectedNode && !readOnly && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeNode(selectedNode)}
                    className="w-8 h-8 text-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left">
                  <p>Eliminar nodo</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>
      
      {/* Información de ayuda */}
      <div className="absolute bottom-2 left-2 text-xs text-slate-500 dark:text-slate-400 bg-white/80 dark:bg-slate-800/80 p-1 rounded">
        Zoom: {(zoom * 100).toFixed(0)}% | {connecting ? "Conectando nodos..." : dragging ? "Moviendo vista..." : "Click para seleccionar, arrastrar para mover"}
      </div>
      
      {/* El canvas principal */}
      <div
        ref={canvasRef}
        className="flex-1 overflow-hidden relative cursor-grab"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        style={{ touchAction: "none" }} // Desactivar gestos táctiles por defecto
      >
        {/* Área de trabajo escalable y desplazable */}
        <div
          className="w-full h-full absolute top-0 left-0"
          style={{
            transform: `scale(${zoom}) translate(${position.x / zoom}px, ${position.y / zoom}px)`,
            transformOrigin: "0 0",
          }}
        >
          {/* Renderizado de nodos */}
          {nodes.map(node => {
            // Determinar el tipo de nodo para mostrar el icono adecuado
            let Icon = Settings2;
            let nodeType = "Unidad";
            const unit = node.data.unit;
            
            if (unit) {
              if (unit.command_id) {
                Icon = Wrench;
                nodeType = "Comando";
              } else if (unit.query_queue_id) {
                Icon = Database;
                nodeType = "Consulta SQL";
              } else if (unit.sftp_downloader_id) {
                Icon = Download;
                nodeType = "Descarga SFTP";
              } else if (unit.sftp_uploader_id) {
                Icon = Upload;
                nodeType = "Subida SFTP";
              } else if (unit.zip_id) {
                Icon = ArrowRight;
                nodeType = "Compresión ZIP";
              } else if (unit.unzip_id) {
                Icon = ArrowRight;
                nodeType = "Extracción ZIP";
              } else if (unit.call_pipeline) {
                Icon = Link2;
                nodeType = "Llamada Pipeline";
              }
            }
            
            return (
              <div
                key={node.id}
                className={`absolute cursor-pointer transition-shadow duration-200 ${
                  selectedNode === node.id
                    ? "shadow-lg ring-2 ring-blue-500"
                    : "shadow hover:shadow-md"
                }`}
                style={{
                  left: node.position.x,
                  top: node.position.y,
                  minWidth: "180px",
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleNodeClick(node.id);
                }}
                onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
              >
                <div className={`bg-white dark:bg-slate-800 rounded-lg overflow-hidden border ${
                  selectedNode === node.id 
                    ? "border-blue-500" 
                    : "border-slate-200 dark:border-slate-700"
                }`}>
                  <div className="p-3">
                    <div className="flex items-center gap-2">
                      <div className="bg-slate-100 dark:bg-slate-700 p-1.5 rounded-md">
                        <Icon className="h-4 w-4 text-slate-700 dark:text-slate-300" />
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <h3 className="text-sm font-medium truncate">{node.data.label}</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                          {nodeType}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Punto de conexión en la parte inferior del nodo */}
                  <div 
                    className="w-3 h-3 rounded-full bg-green-500 absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 cursor-crosshair"
                    title="Ctrl+click para conectar"
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      if ((e.ctrlKey || e.metaKey) && !readOnly) {
                        setConnecting(true);
                        setConnectionStart(node.id);
                      }
                    }}
                  />
                </div>
              </div>
            );
          })}
          
          {/* Renderizado de conexiones entre nodos */}
          <svg className="absolute top-0 left-0 w-full h-full pointer-events-none">
            <defs>
              <marker
                id="arrowhead"
                markerWidth="10"
                markerHeight="7"
                refX="9"
                refY="3.5"
                orient="auto"
              >
                <polygon points="0 0, 10 3.5, 0 7" fill="#10b981" />
              </marker>
            </defs>
            {edges.map(edge => {
              // Encontrar posiciones de los nodos origen y destino
              const sourceNode = nodes.find(node => node.id === edge.source);
              const targetNode = nodes.find(node => node.id === edge.target);
              
              if (!sourceNode || !targetNode) return null;
              
              // Calcular puntos de inicio y fin de la conexión
              const startX = sourceNode.position.x + 90; // Centro del nodo origen
              const startY = sourceNode.position.y + 70; // Punto inferior del nodo origen
              const endX = targetNode.position.x + 90; // Centro del nodo destino
              const endY = targetNode.position.y; // Punto superior del nodo destino
              
              return (
                <g key={edge.id} onClick={(e) => handleEdgeClick(e, edge.id)}>
                  <path
                    d={`M ${startX} ${startY} C ${startX} ${startY + 50}, ${endX} ${endY - 50}, ${endX} ${endY}`}
                    stroke={edge.style?.stroke || "#10b981"}
                    strokeWidth={edge.style?.strokeWidth || 2}
                    fill="none"
                    strokeDasharray={edge.animated ? "5,5" : "none"}
                    markerEnd="url(#arrowhead)"
                    className="cursor-pointer"
                    pointerEvents="stroke"
                  />
                </g>
              );
            })}
            
            {/* Renderizado de la vista previa de conexión en curso */}
            {connecting && connectionStart && (
              (() => {
                const sourceNode = nodes.find(node => node.id === connectionStart);
                if (!sourceNode) return null;
                
                const startX = sourceNode.position.x + 90; // Centro del nodo origen
                const startY = sourceNode.position.y + 70; // Punto inferior del nodo origen
                
                return (
                  <path
                    d={`M ${startX} ${startY} C ${startX} ${startY + 50}, ${connectionPreview.x} ${connectionPreview.y - 50}, ${connectionPreview.x} ${connectionPreview.y}`}
                    stroke="#10b981"
                    strokeWidth={2}
                    fill="none"
                    strokeDasharray="5,5"
                    opacity={0.6}
                  />
                );
              })()
            )}
          </svg>
        </div>
      </div>
      
      {/* Modal de detalles del nodo */}
      {isDialogOpen && selectedUnit && (
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[640px] max-h-[85vh] overflow-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                {(() => {
                  const unitType = determineUnitType(selectedUnit);
                  let Icon;
                  
                  switch (unitType) {
                    case 'command':
                      Icon = Wrench;
                      break;
                    case 'query':
                      Icon = Database;
                      break;
                    case 'sftp_download':
                      Icon = Download;
                      break;
                    case 'sftp_upload':
                      Icon = Upload;
                      break;
                    case 'zip':
                      Icon = ArrowRight;
                      break;
                    case 'unzip':
                      Icon = ArrowRight;
                      break;
                    case 'pipeline':
                      Icon = Link2;
                      break;
                    default:
                      Icon = Settings2;
                  }
                  
                  return <Icon className="h-5 w-5 text-primary" />;
                })()}
                <span>{unitDetails?.name || "Detalles de la Unidad"}</span>
              </DialogTitle>
              <DialogDescription>
                {unitDetails?.description || "Información detallada sobre esta unidad del pipeline"}
              </DialogDescription>
            </DialogHeader>
            
            {isLoadingDetails ? (
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
                
                {/* Contenido específico basado en el tipo de unidad */}
                {unitDetails && unitDetails.type === 'command' && unitDetails.details && (
                  <div className="space-y-3">
                    <div>
                      <h4 className="text-sm font-medium mb-1">Comando</h4>
                      <div className="bg-slate-50 dark:bg-slate-800 rounded-md p-3 text-xs font-mono border border-slate-200 dark:border-slate-700">
                        {unitDetails.details.target} {unitDetails.details.args}
                      </div>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium mb-1">Directorio de trabajo</h4>
                      <div className="bg-slate-50 dark:bg-slate-800 rounded-md p-3 text-xs">
                        {unitDetails.details.working_directory || 'Directorio por defecto'}
                      </div>
                    </div>
                    {unitDetails.details.raw_script && (
                      <div>
                        <h4 className="text-sm font-medium mb-1">Script</h4>
                        <div className="bg-slate-50 dark:bg-slate-800 rounded-md p-3 text-xs font-mono border border-slate-200 dark:border-slate-700 max-h-40 overflow-y-auto">
                          <pre>{unitDetails.details.raw_script}</pre>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                {unitDetails && unitDetails.type === 'query' && unitDetails.details && (
                  <div className="space-y-3">
                    <div>
                      <h4 className="text-sm font-medium mb-1">Descripción</h4>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        {unitDetails.details.description || 'Sin descripción'}
                      </p>
                    </div>
                    <Separator />
                    {unitDetails.details.Queries && unitDetails.details.Queries.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium mb-1">Consultas SQL</h4>
                        <div className="space-y-2">
                          {unitDetails.details.Queries.map((query: any, index: number) => (
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
                
                {unitDetails && (unitDetails.type === 'sftp_download' || unitDetails.type === 'sftp_upload') && unitDetails.details && (
                  <div className="space-y-3">
                    <div>
                      <h4 className="text-sm font-medium mb-1">Servidor SFTP</h4>
                      {unitDetails.details.sftp_link && (
                        <div className="bg-slate-50 dark:bg-slate-800 rounded-md p-3 text-xs">
                          <div><span className="font-medium">Servidor: </span>{unitDetails.details.sftp_link.server}:{unitDetails.details.sftp_link.port}</div>
                          <div><span className="font-medium">Usuario: </span>{unitDetails.details.sftp_link.user}</div>
                        </div>
                      )}
                    </div>
                    <div>
                      <h4 className="text-sm font-medium mb-1">{unitDetails.type === 'sftp_download' ? 'Ruta de salida' : 'Ruta de entrada'}</h4>
                      <div className="bg-slate-50 dark:bg-slate-800 rounded-md p-3 text-xs font-mono">
                        {unitDetails.type === 'sftp_download' ? unitDetails.details.output : unitDetails.details.input}
                      </div>
                    </div>
                  </div>
                )}
                
                {unitDetails && (unitDetails.type === 'zip' || unitDetails.type === 'unzip') && unitDetails.details && (
                  <div className="space-y-3">
                    {unitDetails.type === 'zip' ? (
                      <div>
                        <h4 className="text-sm font-medium mb-1">Ruta de salida (archivo ZIP)</h4>
                        <div className="bg-slate-50 dark:bg-slate-800 rounded-md p-3 text-xs font-mono">
                          {unitDetails.details.output}
                        </div>
                      </div>
                    ) : (
                      <>
                        <div>
                          <h4 className="text-sm font-medium mb-1">Archivo ZIP a extraer</h4>
                          <div className="bg-slate-50 dark:bg-slate-800 rounded-md p-3 text-xs font-mono">
                            {unitDetails.details.input}
                          </div>
                        </div>
                        <div>
                          <h4 className="text-sm font-medium mb-1">Directorio de extracción</h4>
                          <div className="bg-slate-50 dark:bg-slate-800 rounded-md p-3 text-xs font-mono">
                            {unitDetails.details.output}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}
                
                {unitDetails && unitDetails.type === 'pipeline' && unitDetails.details && (
                  <div className="space-y-3">
                    <div>
                      <h4 className="text-sm font-medium mb-1">Pipeline llamado</h4>
                      <div className="bg-slate-50 dark:bg-slate-800 rounded-md p-3 border border-slate-200 dark:border-slate-700">
                        <p className="text-sm font-medium">{unitDetails.details.name}</p>
                        <p className="text-xs text-slate-500 mt-1">{unitDetails.details.description || 'Sin descripción'}</p>
                      </div>
                    </div>
                    <Separator />
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="font-medium">ID: </span>
                        <span className="font-mono">{unitDetails.details.id.substring(0, 10)}...</span>
                      </div>
                      <div>
                        <span className="font-medium">Agente: </span>
                        <span>{unitDetails.details.agent_passport_id?.substring(0, 10)}...</span>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Información adicional de configuración */}
                <Separator />
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  {selectedUnit.timeout_milliseconds > 0 && (
                    <div>
                      <span className="font-medium">Timeout: </span>
                      <span>{selectedUnit.timeout_milliseconds}ms</span>
                    </div>
                  )}
                  
                  {selectedUnit.retry_count > 0 && (
                    <div>
                      <span className="font-medium">Reintentos: </span>
                      <span>{selectedUnit.retry_count}</span>
                    </div>
                  )}
                  
                  {selectedUnit.retry_after_milliseconds > 0 && (
                    <div>
                      <span className="font-medium">Espera entre reintentos: </span>
                      <span>{selectedUnit.retry_after_milliseconds}ms</span>
                    </div>
                  )}
                  
                  <div>
                    <span className="font-medium">Continuar en error: </span>
                    <Badge variant={selectedUnit.continue_on_error ? "success" : "destructive"}>
                      {selectedUnit.continue_on_error ? "Sí" : "No"}
                    </Badge>
                  </div>
                  
                  <div>
                    <span className="font-medium">Abortar en timeout: </span>
                    <Badge variant={selectedUnit.abort_on_timeout ? "destructive" : "outline"}>
                      {selectedUnit.abort_on_timeout ? "Sí" : "No"}
                    </Badge>
                  </div>
                </div>
              </div>
            )}
            
            <DialogFooter>
              <Button onClick={handleCloseDialog}>Cerrar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
