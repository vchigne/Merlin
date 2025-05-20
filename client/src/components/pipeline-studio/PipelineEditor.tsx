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
import NodeDetailsDialog from "./NodeDetailsDialog";

// Componente mejorado para el editor visual de flujos de pipeline
// Con canvas infinito y soporte completo para dispositivos móviles

interface PipelineEditorProps {
  flowData: {
    nodes: any[];
    edges: any[];
  };
  onChange: (updatedFlow: any, selectedNodeId?: string | null) => void;
  onNodeSelect?: (node: any) => void; // Propiedad para manejar la selección de nodos
  onNodeClick?: (nodeId: string) => void; // Para abrir detalles
  readOnly?: boolean;
  pipelineId?: string;
}

// Funciones auxiliares
const determineUnitType = (unit: any): string => {
  if (!unit) return 'unknown';
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
  onNodeClick,
  readOnly = false,
  pipelineId
}: PipelineEditorProps) {
  const { toast } = useToast();
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
    if (flowData?.nodes && flowData?.edges) {
      setNodes(flowData.nodes);
      setEdges(flowData.edges);
    }
    
    // Si hay nodos, intentar centrar el primer nodo
    if (flowData?.nodes && flowData.nodes.length > 0) {
      const firstNode = flowData.nodes.find(node => !node.data?.unit?.pipeline_unit_id);
      if (firstNode) {
        setPosition({
          x: -firstNode.position.x + window.innerWidth / 2 - 100,
          y: -firstNode.position.y + window.innerHeight / 2 - 100
        });
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
  
  // Manejar zoom
  const handleZoomIn = useCallback(() => {
    setZoom(current => Math.min(current * 1.2, 3));
  }, []);
  
  const handleZoomOut = useCallback(() => {
    setZoom(current => Math.max(current / 1.2, 0.3));
  }, []);
  
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey) {
      e.preventDefault();
      if (e.deltaY < 0) {
        handleZoomIn();
      } else {
        handleZoomOut();
      }
    }
  }, [handleZoomIn, handleZoomOut]);
  
  // Manejar selección de nodo
  const handleNodeClick = useCallback((e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    
    if (connecting) {
      // Si estamos en modo conexión, conectar con el nodo seleccionado
      if (connectionStart && connectionStart !== nodeId) {
        connectNodes(connectionStart, nodeId);
        setConnecting(false);
        setConnectionStart(null);
      }
      return;
    }
    
    // Establecer nodo seleccionado
    setSelectedNode(nodeId);
    
    // Notificar al padre sobre la selección
    if (onNodeSelect) {
      const selectedNodeData = nodes.find(node => node.id === nodeId);
      if (selectedNodeData) {
        onNodeSelect(selectedNodeData);
      }
    }
    
    // Si hay manejador para click en nodo, ejecutarlo
    if (onNodeClick) {
      onNodeClick(nodeId);
    } else {
      // Sino, mostrar el diálogo de detalles del nodo
      const nodeData = nodes.find(node => node.id === nodeId);
      if (nodeData?.data?.unit) {
        setSelectedUnit(nodeData.data.unit);
        setIsDialogOpen(true);
      }
    }
  }, [nodes, connecting, connectionStart, connectNodes, onNodeSelect, onNodeClick]);
  
  // Iniciar arrastre de un nodo
  const handleNodeMouseDown = useCallback((e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    
    // No permitir arrastre en modo solo lectura
    if (readOnly) return;
    
    // Iniciar arrastre del nodo
    setDraggingNode(nodeId);
    setNodeStart({ x: e.clientX, y: e.clientY });
  }, [readOnly]);
  
  // Iniciar modo conexión
  const handleStartConnection = useCallback((e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    
    // No permitir conexiones en modo solo lectura
    if (readOnly) return;
    
    // Iniciar modo conexión
    setConnecting(true);
    setConnectionStart(nodeId);
    
    // Obtener posición inicial para la vista previa de conexión
    const nodeData = nodes.find(node => node.id === nodeId);
    if (nodeData) {
      const sourceX = nodeData.position.x + 90; // Salida desde el lado derecho
      const sourceY = nodeData.position.y + 40; // Centro vertical del nodo
      
      setConnectionPreview({ 
        x: (sourceX * zoom) + position.x, 
        y: (sourceY * zoom) + position.y 
      });
    }
  }, [nodes, zoom, position, readOnly]);
  
  // Manejar inicio de arrastre de la vista
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Solo iniciar arrastre con click principal
    if (e.button !== 0) return;
    
    // Cancelar modo conexión si se hace click en el fondo
    if (connecting) {
      setConnecting(false);
      setConnectionStart(null);
      return;
    }
    
    // Limpiar selección de nodo si se hace click en el fondo
    setSelectedNode(null);
    
    // Iniciar modo arrastre
    setDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  }, [connecting]);
  
  // Manejar movimiento del cursor
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    // Si estamos en modo conexión, actualizar posición de la vista previa
    if (connecting) {
      setConnectionPreview({ x: e.clientX, y: e.clientY });
    }
    
    // Si estamos arrastrando el fondo, mover vista
    if (dragging) {
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      
      setPosition(prevPosition => ({
        x: prevPosition.x + dx,
        y: prevPosition.y + dy
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
  }, [dragging, dragStart, zoom, position, draggingNode, nodeStart, emitChanges, connecting]);
  
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
      // Determinar tipo de unidad
      const unitType = determineUnitType(unitData);
      let query = '';
      let variables: any = {};
      
      // Construir consulta apropiada basada en el tipo
      switch (unitType) {
        case 'command':
          query = COMMAND_QUERY;
          variables = { id: unitData.command_id };
          break;
        case 'query':
          query = QUERY_QUEUE_QUERY;
          variables = { id: unitData.query_queue_id };
          break;
        case 'sftp_download':
          query = SFTP_DOWNLOADER_QUERY;
          variables = { id: unitData.sftp_downloader_id };
          break;
        case 'sftp_upload':
          query = SFTP_UPLOADER_QUERY;
          variables = { id: unitData.sftp_uploader_id };
          break;
        case 'zip':
          query = ZIP_QUERY;
          variables = { id: unitData.zip_id };
          break;
        case 'unzip':
          query = UNZIP_QUERY;
          variables = { id: unitData.unzip_id };
          break;
        case 'pipeline':
          if (unitData.call_pipeline) {
            query = PIPELINE_QUERY;
            variables = { id: unitData.call_pipeline };
          }
          break;
      }
      
      // Ejecutar consulta si hay una válida
      if (query) {
        const response = await executeQuery(query, variables);
        
        if (response.errors) {
          toast({
            title: "Error",
            description: "No se pudieron cargar los detalles de la unidad",
            variant: "destructive",
          });
          setUnitDetails(null);
        } else {
          // Procesar resultados según tipo
          let details = null;
          let name = '';
          let description = '';
          
          switch (unitType) {
            case 'command':
              details = response.data?.merlin_agent_Command?.[0];
              name = details?.name || 'Comando';
              description = details?.description || 'Ejecuta un comando en el sistema';
              break;
            case 'query':
              details = response.data?.merlin_agent_QueryQueue?.[0];
              name = details?.name || 'Consulta SQL';
              description = details?.description || 'Ejecuta consultas en base de datos';
              if (unitData.query_queue_id) {
                // Cargar queries asociadas
                const queriesResponse = await executeQuery(QUERY_DETAILS_QUERY, { query_queue_id: unitData.query_queue_id });
                if (!queriesResponse.errors && queriesResponse.data?.merlin_agent_Query) {
                  details.queries = queriesResponse.data.merlin_agent_Query;
                }
              }
              break;
            case 'sftp_download':
              details = response.data?.merlin_agent_SFTPDownloader?.[0];
              name = details?.name || 'Descarga SFTP';
              description = 'Descarga archivos desde un servidor SFTP';
              break;
            case 'sftp_upload':
              details = response.data?.merlin_agent_SFTPUploader?.[0];
              name = details?.name || 'Subida SFTP';
              description = 'Sube archivos a un servidor SFTP';
              break;
            case 'zip':
              details = response.data?.merlin_agent_Zip?.[0];
              name = details?.name || 'Compresión ZIP';
              description = 'Comprime archivos en formato ZIP';
              break;
            case 'unzip':
              details = response.data?.merlin_agent_UnZip?.[0];
              name = details?.name || 'Extracción ZIP';
              description = 'Extrae archivos de formato ZIP';
              break;
            case 'pipeline':
              details = response.data?.merlin_agent_Pipeline?.[0];
              name = details?.name || 'Pipeline';
              description = details?.description || 'Ejecuta otro pipeline';
              break;
          }
          
          setUnitDetails({
            type: unitType,
            name,
            description,
            details
          });
        }
      } else {
        // Si no hay consulta disponible, usar datos básicos
        setUnitDetails({
          type: unitType,
          name: 'Unidad',
          description: 'Información limitada disponible',
          details: null
        });
      }
    } catch (error) {
      console.error("Error al cargar detalles de la unidad:", error);
      setUnitDetails(null);
      toast({
        title: "Error",
        description: "No se pudieron cargar los detalles de la unidad",
        variant: "destructive",
      });
    } finally {
      setIsLoadingDetails(false);
    }
  };
  
  return (
    <div className="flex flex-col h-full border rounded-md bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 relative overflow-hidden">
      {/* Barra de herramientas */}
      <div className="flex items-center justify-between p-2 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        <div className="flex items-center space-x-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleZoomIn}
                  className="w-8 h-8"
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>Acercar</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleZoomOut}
                  className="w-8 h-8"
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>Alejar</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <div className="text-xs text-slate-500 mx-1">
            {Math.round(zoom * 100)}%
          </div>
        </div>
        
        <div className="flex items-center space-x-1">
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
            const NODE_WIDTH = 180;
            const NODE_HEIGHT = 80;
            
            // Determinar tipo de unidad para estilo
            let unitType = 'default';
            let unitDescription = 'Unidad';
            
            if (node.data?.unit) {
              unitType = determineUnitType(node.data.unit);
              unitDescription = getUnitTypeDescription(node.data.unit);
            }
            
            // Estilos basados en el tipo
            let bgColor = 'bg-slate-100 dark:bg-slate-800';
            let borderColor = 'border-slate-300 dark:border-slate-700';
            let textColor = 'text-slate-800 dark:text-slate-200';
            let iconColor = 'text-slate-500';
            
            // Colores según tipo
            switch (unitType) {
              case 'command':
                bgColor = 'bg-amber-50 dark:bg-amber-950/30';
                borderColor = 'border-amber-200 dark:border-amber-800';
                iconColor = 'text-amber-500';
                break;
              case 'query':
                bgColor = 'bg-blue-50 dark:bg-blue-950/30';
                borderColor = 'border-blue-200 dark:border-blue-800';
                iconColor = 'text-blue-500';
                break;
              case 'sftp_download':
              case 'sftp_upload':
                bgColor = 'bg-green-50 dark:bg-green-950/30';
                borderColor = 'border-green-200 dark:border-green-800';
                iconColor = 'text-green-500';
                break;
              case 'zip':
              case 'unzip':
                bgColor = 'bg-purple-50 dark:bg-purple-950/30';
                borderColor = 'border-purple-200 dark:border-purple-800';
                iconColor = 'text-purple-500';
                break;
              case 'pipeline':
                bgColor = 'bg-cyan-50 dark:bg-cyan-950/30';
                borderColor = 'border-cyan-200 dark:border-cyan-800';
                iconColor = 'text-cyan-500';
                break;
            }
            
            // Si el nodo está seleccionado, destacar
            if (node.id === selectedNode) {
              borderColor = 'border-primary-500 dark:border-primary-400 border-2';
            }
            
            // Ícono según tipo
            let Icon = Settings2;
            switch (unitType) {
              case 'command': Icon = Wrench; break;
              case 'query': Icon = Database; break;
              case 'sftp_download': Icon = Download; break;
              case 'sftp_upload': Icon = Upload; break;
              case 'zip': 
              case 'unzip': Icon = ArrowRight; break;
              case 'pipeline': Icon = Link2; break;
            }
            
            return (
              <div
                key={node.id}
                className={`absolute ${bgColor} ${borderColor} ${textColor} border rounded-md shadow-sm overflow-hidden transition-shadow hover:shadow-md`}
                style={{
                  width: NODE_WIDTH,
                  height: NODE_HEIGHT,
                  left: node.position.x,
                  top: node.position.y,
                  zIndex: node.id === selectedNode ? 100 : 10,
                  cursor: readOnly ? 'pointer' : 'move'
                }}
                onClick={(e) => handleNodeClick(e, node.id)}
                onMouseDown={(e) => !readOnly && handleNodeMouseDown(e, node.id)}
              >
                <div className="flex items-center p-2 border-b border-slate-200 dark:border-slate-700">
                  <div className={`mr-2 ${iconColor}`}>
                    <Icon size={16} />
                  </div>
                  <div className="text-sm font-medium truncate flex-1">
                    {node.data?.label || unitDescription}
                  </div>
                  
                  {!readOnly && (
                    <div
                      className="flex items-center justify-center w-6 h-6 rounded-full bg-green-100 dark:bg-green-900 text-green-500 hover:bg-green-200 dark:hover:bg-green-800 transition-colors cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStartConnection(e, node.id);
                      }}
                    >
                      <Plus size={14} />
                    </div>
                  )}
                </div>
                
                <div className="p-2 text-xs">
                  <div className="truncate">
                    {node.data?.description || (node.data?.unit?.comment || 'Sin descripción')}
                  </div>
                </div>
              </div>
            );
          })}
          
          {/* Renderizado de conexiones entre nodos */}
          <svg className="absolute top-0 left-0 w-full h-full pointer-events-none">
            {edges.map(edge => {
              const sourceNode = nodes.find(node => node.id === edge.source);
              const targetNode = nodes.find(node => node.id === edge.target);
              
              if (!sourceNode || !targetNode) return null;
              
              const sourceX = sourceNode.position.x + 180; // Salida desde el lado derecho
              const sourceY = sourceNode.position.y + 40; // Centro vertical del nodo
              
              const targetX = targetNode.position.x; // Entrada desde el lado izquierdo
              const targetY = targetNode.position.y + 40; // Centro vertical del nodo
              
              // Puntos de control para la curva Bezier
              const controlPoint1X = sourceX + 50;
              const controlPoint1Y = sourceY;
              const controlPoint2X = targetX - 50;
              const controlPoint2Y = targetY;
              
              return (
                <g key={edge.id}>
                  <path
                    d={`M ${sourceX} ${sourceY} C ${controlPoint1X} ${controlPoint1Y}, ${controlPoint2X} ${controlPoint2Y}, ${targetX} ${targetY}`}
                    stroke="#10b981"
                    strokeWidth={2}
                    fill="none"
                    className={edge.animated ? 'animate-pulse' : ''}
                  />
                  {/* Marcador de flecha en el destino */}
                  <polygon
                    points={`${targetX},${targetY} ${targetX-8},${targetY-4} ${targetX-8},${targetY+4}`}
                    fill="#10b981"
                  />
                  
                  {/* Área para hacer click y eliminar la conexión */}
                  {!readOnly && (
                    <path
                      d={`M ${sourceX} ${sourceY} C ${controlPoint1X} ${controlPoint1Y}, ${controlPoint2X} ${controlPoint2Y}, ${targetX} ${targetY}`}
                      stroke="transparent"
                      strokeWidth={10}
                      fill="none"
                      style={{ cursor: 'pointer' }}
                      onClick={() => removeConnection(edge.id)}
                    />
                  )}
                </g>
              );
            })}
            
            {/* Renderizado de la vista previa de conexión en curso */}
            {connecting && connectionStart && (
              (() => {
                const sourceNode = nodes.find(node => node.id === connectionStart);
                if (!sourceNode) return null;
                
                const startX = sourceNode.position.x + 90; // Centro del nodo origen
                const startY = sourceNode.position.y + 40; // Centro vertical del nodo origen
                
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
      
      {/* Modal de detalles del nodo usando el componente compartido */}
      <NodeDetailsDialog 
        open={isDialogOpen} 
        onOpenChange={setIsDialogOpen} 
        nodeId={selectedNode} 
        nodes={nodes} 
      />
    </div>
  );
}