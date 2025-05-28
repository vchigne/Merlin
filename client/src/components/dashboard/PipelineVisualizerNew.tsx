import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { executeQuery } from "@/lib/hasura-client";
import { PIPELINE_QUERY, PIPELINE_UNITS_QUERY } from "@shared/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle } from "lucide-react";
import PipelineSearch from "./PipelineSearch";
import UnifiedPipelineUnitDialog from "@/components/ui/UnifiedPipelineUnitDialog";

export default function PipelineVisualizerNew() {
  const [selectedPipeline, setSelectedPipeline] = useState<string | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<any>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  
  // NUEVO: Referencias y posiciones para conexiones CSS
  const containerRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const [nodePositions, setNodePositions] = useState<{ [key: string]: { x: number, y: number, width: number, height: number } }>({});

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

  // NUEVO: Función para calcular conexiones CSS entre nodos
  const calculateCSSConnections = (nodes: any[]) => {
    const connections = [];
    
    for (let i = 0; i < nodes.length - 1; i++) {
      const currentNode = nodes[i];
      const nextNode = nodes[i + 1];
      
      const currentPos = nodePositions[currentNode.id];
      const nextPos = nodePositions[nextNode.id];
      
      if (currentPos && nextPos) {
        // Calcular centro de cada nodo
        const startX = currentPos.x + currentPos.width / 2;
        const startY = currentPos.y + currentPos.height;
        const endX = nextPos.x + nextPos.width / 2;
        const endY = nextPos.y;
        
        // Calcular distancia y ángulo
        const distance = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
        const angle = Math.atan2(endY - startY, endX - startX) * 180 / Math.PI;
        
        connections.push({
          id: `css-line-${i}`,
          left: startX,
          top: startY,
          width: distance,
          rotation: angle,
          color: `hsl(${i * 40}, 70%, 50%)` // Color único por conexión
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
    if (unit.pipeline_call_id) return { type: 'Pipeline Call', category: 'standard' };
    return { type: 'Unknown', category: 'unknown' };
  };

  // Función para obtener el nombre para mostrar
  const getDisplayName = (unit: any) => {
    const type = detectUnitType(unit);
    
    if (unit.command_id && unit.command) {
      return unit.command.command || 'Comando sin definir';
    }
    if (unit.query_queue_id && unit.query_queue) {
      return unit.query_queue.query || 'Consulta sin definir';
    }
    if (unit.sftp_downloader_id && unit.sftp_downloader) {
      return `Descargar: ${unit.sftp_downloader.remote_path || 'Ruta no definida'}`;
    }
    if (unit.sftp_uploader_id && unit.sftp_uploader) {
      return `Subir: ${unit.sftp_uploader.remote_path || 'Ruta no definida'}`;
    }
    if (unit.zip_id && unit.zip) {
      return `Comprimir: ${unit.zip.path || 'Ruta no definida'}`;
    }
    if (unit.unzip_id && unit.unzip) {
      return `Descomprimir: ${unit.unzip.path || 'Ruta no definida'}`;
    }
    if (unit.pipeline_call_id && unit.pipeline_call) {
      return `Pipeline: ${unit.pipeline_call.call_pipeline || 'Pipeline no definido'}`;
    }
    
    return `${type.type} #${unit.index || 'N/A'}`;
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

    // Crear nodos con posiciones secuenciales verticales
    const nodes = sortedUnits.map((unit, index) => {
      const type = detectUnitType(unit);
      const yPosition = 50 + (index * 140); // Espaciado vertical de 140px
      
      return {
        id: unit.id,
        type: type.type,
        displayName: getDisplayName(unit),
        posX: 50,
        posY: yPosition,
        index,
        data: unit
      };
    });

    console.log('🎯 Nodos creados:', nodes.length, nodes.map(n => ({
      id: n.id,
      type: n.type,
      pos: `${n.posX},${n.posY}`
    })));

    // Crear conexiones secuenciales
    const connections: any[] = [];
    console.log('🔗 Creando conexiones para', nodes.length, 'nodos...');
    
    for (let i = 0; i < nodes.length - 1; i++) {
      const sourceNode = nodes[i];
      const targetNode = nodes[i + 1];
      
      const connectionId = `zapier-conn-${i}`;
      const fromPos = `${sourceNode.posX + 88},${sourceNode.posY + 96}`;
      const toPos = `${targetNode.posX + 88},${targetNode.posY}`;
      
      console.log(`🔗 Conexión ${i}:`, {
        from: sourceNode.type,
        to: targetNode.type,
        fromPos,
        toPos
      });
      
      connections.push({
        id: connectionId,
        source: sourceNode,
        target: targetNode,
        sourcePoint: {
          x: sourceNode.posX + 88,
          y: sourceNode.posY + 96
        },
        targetPoint: {
          x: targetNode.posX + 88,
          y: targetNode.posY
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
          <PipelineSearch
            pipelines={pipelinesData}
            selectedPipelineId={selectedPipeline}
            onSelectPipeline={handlePipelineChange}
            isLoading={isPipelinesLoading}
          />
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
                
                // NUEVO: Calcular conexiones CSS
                const cssConnections = calculateCSSConnections(nodes);
                
                return (
                  <>
                    {/* NUEVO: Conexiones CSS en lugar de SVG */}
                    {cssConnections.map(conn => (
                      <div
                        key={conn.id}
                        className="absolute border-t-2 origin-left z-10"
                        style={{
                          left: conn.left,
                          top: conn.top,
                          width: conn.width,
                          borderColor: conn.color,
                          transform: `rotate(${conn.rotation}deg)`,
                        }}
                      >
                        {/* Flecha CSS con pseudo-elemento */}
                        <div 
                          className="absolute right-0 top-0 w-0 h-0"
                          style={{
                            borderLeft: `8px solid ${conn.color}`,
                            borderTop: '4px solid transparent',
                            borderBottom: '4px solid transparent',
                            transform: 'translateY(-50%)'
                          }}
                        />
                      </div>
                    ))}
                    
                    {/* Debug: Mostrar cantidad de conexiones */}
                    <div className="absolute top-2 right-2 bg-black text-white p-2 rounded text-xs">
                      Conexiones CSS: {cssConnections.length}
                    </div>
                    
                    {/* NUEVO: Renderizar nodos con referencias para obtener posiciones */}
                    {nodes.map((node, index) => {
                      const unitData = pipelineUnits.find(u => u.id === node.id);
                      if (!unitData) return null;
                      
                      return (
                        <div
                          key={node.id}
                          ref={el => nodeRefs.current[node.id] = el}
                          className="absolute bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-3 cursor-pointer hover:shadow-lg transition-all duration-200"
                          style={{
                            left: node.posX,
                            top: node.posY,
                            width: '200px',
                            borderLeft: `4px solid ${getUnitTypeColor(node.type)}`,
                            zIndex: 20
                          }}
                          onClick={() => {
                            setSelectedUnit(unitData);
                            setDialogOpen(true);
                          }}
                        >
                          <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                            {node.displayName}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            {node.type}
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