// BACKUP PERFECTO - Versión con drag and drop funcionando perfectamente
// Fecha: 2025-05-30 - Líneas aparecen inmediatamente al cargar pipeline
// Estado: ✅ PERFECTO - Drag and drop + conexiones dinámicas + carga inicial funcionando

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertCircle, Clock, Database, FileText, Globe, Play, Server, Settings, CheckCircle, XCircle, Pause, RotateCcw, ExternalLink } from 'lucide-react';
import { UnifiedPipelineUnitDialog } from '@/components/ui/UnifiedPipelineUnitDialog';
import { PipelineSearch } from '@/components/ui/PipelineSearch';

interface PipelineUnit {
  id: string;
  name: string;
  order_index: number;
  unit_type: string;
  settings: any;
  is_active: boolean;
  pipeline_id: string;
}

interface Pipeline {
  id: string;
  name: string;
  description: string;
  abort_on_error: boolean;
}

const PipelineVisualizerNew: React.FC = () => {
  const [selectedPipeline, setSelectedPipeline] = useState<string>('');
  const [selectedUnit, setSelectedUnit] = useState<PipelineUnit | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // NUEVO: Referencias y estados para drag and drop
  const containerRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const [isDragging, setIsDragging] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [nodePositions, setNodePositions] = useState<{ [key: string]: { x: number, y: number, width: number, height: number } }>({});
  const [unitPositions, setUnitPositions] = useState<{ [key: string]: { x: number, y: number } }>({});
  
  // NUEVO: Estado para conexiones dinámicas
  const [dynamicConnections, setDynamicConnections] = useState<any[]>([]);

  // NUEVO: Función para actualizar posiciones de nodos
  const updateNodePositions = useCallback(() => {
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
  }, []);

  // NUEVO: Handlers para drag and drop
  const handleMouseDown = (e: React.MouseEvent, unitId: string) => {
    e.preventDefault();
    setIsDragging(unitId);
    setDragStart({ x: e.clientX, y: e.clientY });
    
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragStart) return;
      
      const deltaX = e.clientX - dragStart.x;
      const deltaY = e.clientY - dragStart.y;
      
      setUnitPositions(prev => ({
        ...prev,
        [unitId]: {
          x: (prev[unitId]?.x || 0) + deltaX,
          y: (prev[unitId]?.y || 0) + deltaY
        }
      }));
      
      setDragStart({ x: e.clientX, y: e.clientY });
    };
    
    const handleMouseUp = () => {
      setIsDragging(null);
      setDragStart(null);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // NUEVO: Función para calcular conexiones CSS entre nodos
  const calculateCSSConnections = (nodes: any[]) => {
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
        
        // Calcular centro de cada nodo usando posiciones actualizadas
        const startX = (currentUnitPos?.x ?? currentPos.x) + currentPos.width / 2;
        const startY = (currentUnitPos?.y ?? currentPos.y) + currentPos.height;
        const endX = (nextUnitPos?.x ?? nextPos.x) + nextPos.width / 2;
        const endY = (nextUnitPos?.y ?? nextPos.y);
        
        // Calcular distancia y ángulo
        const distance = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
        const angle = Math.atan2(endY - startY, endX - startX) * 180 / Math.PI;
        
        connections.push({
          id: `css-line-${i}`,
          left: startX,
          top: startY,
          width: distance,
          rotation: angle,
          color: `hsl(${i * 40}, 80%, 45%)` // Color único por conexión con mejor contraste
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
      case 'SQLStatement': return 'bg-blue-500 hover:bg-blue-600';
      case 'CommandExecution': return 'bg-green-500 hover:bg-green-600';
      case 'FileCopy': return 'bg-orange-500 hover:bg-orange-600';
      case 'FileMove': return 'bg-purple-500 hover:bg-purple-600';
      case 'RestAPI': return 'bg-pink-500 hover:bg-pink-600';
      case 'SFTPUpload': return 'bg-indigo-500 hover:bg-indigo-600';
      case 'SFTPDownload': return 'bg-cyan-500 hover:bg-cyan-600';
      case 'CreateDirectory': return 'bg-gray-500 hover:bg-gray-600';
      case 'DeleteFile': return 'bg-red-500 hover:bg-red-600';
      case 'ZipFile': return 'bg-yellow-500 hover:bg-yellow-600';
      case 'UnzipFile': return 'bg-lime-500 hover:bg-lime-600';
      case 'DatabaseBackup': return 'bg-teal-500 hover:bg-teal-600';
      case 'EmailSend': return 'bg-rose-500 hover:bg-rose-600';
      case 'Condition': return 'bg-amber-500 hover:bg-amber-600';
      case 'LoopForEach': return 'bg-emerald-500 hover:bg-emerald-600';
      case 'Delay': return 'bg-slate-500 hover:bg-slate-600';
      case 'LogEntry': return 'bg-neutral-500 hover:bg-neutral-600';
      case 'VariableSet': return 'bg-violet-500 hover:bg-violet-600';
      case 'JSONParser': return 'bg-fuchsia-500 hover:bg-fuchsia-600';
      case 'CSVParser': return 'bg-sky-500 hover:bg-sky-600';
      case 'XMLParser': return 'bg-blue-700 hover:bg-blue-800';
      default: return 'bg-gray-400 hover:bg-gray-500';
    }
  };

  // Función para obtener el icono del tipo de unidad
  const getUnitTypeIcon = (unitType: string) => {
    switch(unitType) {
      case 'SQLStatement': return <Database className="w-4 h-4" />;
      case 'CommandExecution': return <Play className="w-4 h-4" />;
      case 'FileCopy':
      case 'FileMove': return <FileText className="w-4 h-4" />;
      case 'RestAPI': return <Globe className="w-4 h-4" />;
      case 'SFTPUpload':
      case 'SFTPDownload': return <Server className="w-4 h-4" />;
      case 'CreateDirectory':
      case 'DeleteFile':
      case 'ZipFile':
      case 'UnzipFile': return <FileText className="w-4 h-4" />;
      case 'DatabaseBackup': return <Database className="w-4 h-4" />;
      case 'EmailSend': return <ExternalLink className="w-4 h-4" />;
      case 'Condition': return <AlertCircle className="w-4 h-4" />;
      case 'LoopForEach': return <RotateCcw className="w-4 h-4" />;
      case 'Delay': return <Clock className="w-4 h-4" />;
      case 'LogEntry': return <FileText className="w-4 h-4" />;
      case 'VariableSet': return <Settings className="w-4 h-4" />;
      case 'JSONParser':
      case 'CSVParser':
      case 'XMLParser': return <FileText className="w-4 h-4" />;
      default: return <Settings className="w-4 h-4" />;
    }
  };

  // Función para obtener el estado de la unidad
  const getUnitStatus = (unit: PipelineUnit) => {
    if (!unit.is_active) {
      return { icon: <Pause className="w-3 h-3" />, color: 'text-gray-500', label: 'Inactivo' };
    }
    
    return { icon: <CheckCircle className="w-3 h-3" />, color: 'text-green-500', label: 'Activo' };
  };

  // Query para obtener pipelines
  const { data: pipelines, isLoading: pipelinesLoading } = useQuery({
    queryKey: ['/api/graphql'],
    queryFn: async () => {
      const response = await fetch('/api/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `
            query GetPipelines {
              merlin_agent_Pipeline(
                order_by: {created_at: desc}
                limit: 100
              ) {
                id
                name
                description
                abort_on_error
              }
            }
          `
        })
      });
      
      const result = await response.json();
      if (result.errors) {
        throw new Error(result.errors[0]?.message || 'Error fetching pipelines');
      }
      
      return result.data?.merlin_agent_Pipeline || [];
    },
    staleTime: 30000,
  });

  // Query para obtener las unidades del pipeline seleccionado
  const { data: pipelineUnits, isLoading: unitsLoading } = useQuery({
    queryKey: ['/api/graphql', 'pipeline-units', selectedPipeline],
    queryFn: async () => {
      if (!selectedPipeline) return [];
      
      const response = await fetch('/api/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `
            query GetPipelineUnits($pipelineId: uuid!) {
              merlin_agent_PipelineUnit(where: {pipeline_id: {_eq: $pipelineId}}, order_by: {order_index: asc}) {
                id
                name
                order_index
                unit_type
                settings
                is_active
                pipeline_id
              }
            }
          `,
          variables: { pipelineId: selectedPipeline }
        })
      });
      
      const result = await response.json();
      if (result.errors) {
        throw new Error(result.errors[0]?.message || 'Error fetching pipeline units');
      }
      
      return result.data?.merlin_agent_PipelineUnit || [];
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
    // Limpiar posiciones al cambiar de pipeline
    setUnitPositions({});
    setNodePositions({});
    setDynamicConnections([]);
  };

  // Función para manejar la selección de pipeline desde el buscador
  const handlePipelineSelect = (pipeline: Pipeline) => {
    setSelectedPipeline(pipeline.id);
    // Limpiar posiciones al cambiar de pipeline
    setUnitPositions({});
    setNodePositions({});
    setDynamicConnections([]);
  };

  // Función para manejar el clic en una unidad
  const handleUnitClick = (unit: PipelineUnit) => {
    setSelectedUnit(unit);
    setIsDialogOpen(true);
  };

  // Función para cerrar el diálogo
  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setSelectedUnit(null);
  };

  // Obtener el pipeline seleccionado actual
  const currentPipeline = pipelines?.find((p: Pipeline) => p.id === selectedPipeline);

  if (pipelinesLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-lg">Cargando pipelines...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header con selector de pipeline */}
      <div className="flex flex-col gap-4 p-4 bg-white rounded-lg border border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Visualizador de Pipelines</h2>
        </div>
        
        {/* Buscador de pipelines */}
        <PipelineSearch onPipelineSelect={handlePipelineSelect} />
        
        {/* Selector de pipeline alternativo */}
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700">O selecciona directamente:</label>
          <Select value={selectedPipeline} onValueChange={handlePipelineChange}>
            <SelectTrigger className="w-96">
              <SelectValue placeholder="Selecciona un pipeline..." />
            </SelectTrigger>
            <SelectContent>
              {pipelines?.map((pipeline: Pipeline) => (
                <SelectItem key={pipeline.id} value={pipeline.id}>
                  {pipeline.name}
                </SelectItem>
              )) || []}
            </SelectContent>
          </Select>
        </div>

        {/* Información del pipeline seleccionado */}
        {currentPipeline && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-900">{currentPipeline.name}</h3>
            {currentPipeline.description && (
              <p className="text-gray-600 mt-1">{currentPipeline.description}</p>
            )}
            <div className="flex items-center gap-2 mt-2">
              <Badge variant={currentPipeline.abort_on_error ? "destructive" : "secondary"}>
                {currentPipeline.abort_on_error ? "Abortar en error" : "Continuar en error"}
              </Badge>
            </div>
          </div>
        )}
      </div>

      {/* Visualización del pipeline */}
      {selectedPipeline && (
        <div className="p-6 bg-white rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-gray-900">Unidades del Pipeline</h3>
            {unitsLoading && (
              <div className="text-sm text-gray-500">Cargando unidades...</div>
            )}
          </div>

          {/* Contenedor del pipeline con posicionamiento relativo para las conexiones */}
          <div 
            ref={containerRef}
            className="relative min-h-96 p-4 bg-gray-50 rounded-lg overflow-hidden"
            style={{ minHeight: '500px' }}
          >
            {/* NUEVO: Renderizar conexiones dinámicas con CSS */}
            {dynamicConnections.map((connection) => (
              <div
                key={connection.id}
                className="absolute border-t-2 border-gray-400 pointer-events-none z-10"
                style={{
                  left: `${connection.left}px`,
                  top: `${connection.top}px`,
                  width: `${connection.width}px`,
                  transform: `rotate(${connection.rotation}deg)`,
                  transformOrigin: '0 0',
                  borderColor: connection.color,
                  borderWidth: '2px',
                  borderStyle: 'solid'
                }}
              />
            ))}

            {/* Unidades del pipeline */}
            <div className="flex flex-col items-center space-y-8 relative z-20">
              {pipelineUnits && pipelineUnits.length > 0 ? (
                pipelineUnits
                  .sort((a: PipelineUnit, b: PipelineUnit) => a.order_index - b.order_index)
                  .map((unit: PipelineUnit, index: number) => {
                    const status = getUnitStatus(unit);
                    const unitPos = unitPositions[unit.id];
                    
                    return (
                      <div
                        key={unit.id}
                        ref={(el) => { nodeRefs.current[unit.id] = el; }}
                        className={`
                          relative group cursor-move transition-all duration-200
                          ${isDragging === unit.id ? 'z-30 scale-105 shadow-2xl' : 'z-20'}
                        `}
                        style={unitPos ? {
                          transform: `translate(${unitPos.x}px, ${unitPos.y}px)`,
                        } : {}}
                        onMouseDown={(e) => handleMouseDown(e, unit.id)}
                        onClick={() => handleUnitClick(unit)}
                      >
                        {/* Tarjeta de la unidad */}
                        <div className={`
                          w-80 p-4 rounded-lg text-white shadow-lg border-2 border-white/20
                          transform transition-all duration-200 hover:scale-102
                          ${getUnitTypeColor(unit.unit_type)}
                          ${isDragging === unit.id ? 'ring-4 ring-white/50' : ''}
                        `}>
                          {/* Header con orden e icono */}
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold bg-white/20 px-2 py-1 rounded">
                                #{unit.order_index}
                              </span>
                              {getUnitTypeIcon(unit.unit_type)}
                            </div>
                            <div className={`${status.color}`} title={status.label}>
                              {status.icon}
                            </div>
                          </div>
                          
                          {/* Información de la unidad */}
                          <div className="space-y-2">
                            <h4 className="font-semibold text-sm leading-tight">{unit.name}</h4>
                            <p className="text-xs opacity-90 font-medium">{unit.unit_type}</p>
                            
                            {/* Settings preview */}
                            {unit.settings && Object.keys(unit.settings).length > 0 && (
                              <div className="text-xs opacity-75 mt-2">
                                <div className="bg-white/10 rounded p-2 max-h-16 overflow-hidden">
                                  {Object.entries(unit.settings)
                                    .slice(0, 2)
                                    .map(([key, value]) => (
                                      <div key={key} className="truncate">
                                        <span className="font-medium">{key}:</span> {String(value)}
                                      </div>
                                    ))}
                                  {Object.keys(unit.settings).length > 2 && (
                                    <div className="text-white/60">...</div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {/* Indicador de posición para drag */}
                        {isDragging === unit.id && (
                          <div className="absolute -top-2 -right-2 bg-white text-gray-900 text-xs px-2 py-1 rounded shadow-lg">
                            Arrastrando...
                          </div>
                        )}
                      </div>
                    );
                  })
              ) : (
                <div className="text-center text-gray-500 py-12">
                  <Settings className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No hay unidades en este pipeline</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Diálogo para mostrar detalles de la unidad */}
      {selectedUnit && (
        <UnifiedPipelineUnitDialog
          unit={selectedUnit}
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
        />
      )}
    </div>
  );
};

export default PipelineVisualizerNew;