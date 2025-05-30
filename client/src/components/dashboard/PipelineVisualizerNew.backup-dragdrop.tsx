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

  // Efecto para actualizar el pipeline seleccionado cuando cambia la prop
  useEffect(() => {
    if (propPipelineId) {
      setSelectedPipeline(propPipelineId);
    }
  }, [propPipelineId]);

  // Query para obtener los detalles del pipeline seleccionado
  const { 
    data: pipelineData, 
    isLoading: pipelineLoading, 
    error: pipelineError 
  } = useQuery({
    queryKey: ["/api/graphql", "pipeline", selectedPipeline],
    queryFn: () => executeQuery(PIPELINE_QUERY, { id: selectedPipeline }),
    enabled: !!selectedPipeline,
  });

  // Query para obtener las unidades del pipeline
  const { 
    data: unitsData, 
    isLoading: unitsLoading, 
    error: unitsError 
  } = useQuery({
    queryKey: ["/api/graphql", "pipeline-units", selectedPipeline],
    queryFn: () => executeQuery(PIPELINE_UNITS_QUERY, { pipelineId: selectedPipeline }),
    enabled: !!selectedPipeline,
  });

  // NUEVO: Función para actualizar posiciones de nodos
  const updateNodePositions = () => {
    if (!containerRef.current) return;
    
    const containerRect = containerRef.current.getBoundingClientRect();
    const newPositions: { [key: string]: { x: number, y: number, width: number, height: number } } = {};
    
    Object.entries(nodeRefs.current).forEach(([nodeId, ref]) => {
      if (ref) {
        const rect = ref.getBoundingClientRect();
        newPositions[nodeId] = {
          x: rect.left - containerRect.left + rect.width / 2,
          y: rect.top - containerRect.top + rect.height / 2,
          width: rect.width,
          height: rect.height
        };
      }
    });
    
    setNodePositions(newPositions);
  };

  // NUEVO: Efecto para actualizar posiciones cuando cambian las unidades
  useEffect(() => {
    if (unitsData?.merlin_agent_PipelineUnit) {
      // Pequeño delay para asegurar que los nodos estén renderizados
      const timer = setTimeout(updateNodePositions, 100);
      return () => clearTimeout(timer);
    }
  }, [unitsData]);

  // NUEVO: Efecto para actualizar posiciones en resize
  useEffect(() => {
    const handleResize = () => updateNodePositions();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handlePipelineSelect = (pipeline: any) => {
    setSelectedPipeline(pipeline.id);
  };

  const handleUnitClick = (unit: any) => {
    setSelectedUnit(unit);
    setDialogOpen(true);
  };

  const getUnitColor = (unit: any) => {
    if (unit.command_id) return "bg-green-100 border-green-300 text-green-800";
    if (unit.query_queue_id) return "bg-blue-100 border-blue-300 text-blue-800";
    if (unit.sftp_downloader_id) return "bg-purple-100 border-purple-300 text-purple-800";
    if (unit.sftp_uploader_id) return "bg-orange-100 border-orange-300 text-orange-800";
    if (unit.zip_id) return "bg-red-100 border-red-300 text-red-800";
    if (unit.unzip_id) return "bg-pink-100 border-pink-300 text-pink-800";
    if (unit.call_pipeline) return "bg-indigo-100 border-indigo-300 text-indigo-800";
    return "bg-gray-100 border-gray-300 text-gray-800";
  };

  const getUnitDisplayName = (unit: any) => {
    if (unit.Command) return unit.Command.name || `Command: ${unit.Command.command || 'Unknown'}`;
    if (unit.QueryQueue) return unit.QueryQueue.name || `Query Queue`;
    if (unit.SFTPDownloader) return unit.SFTPDownloader.name || `SFTP Download`;
    if (unit.SFTPUploader) return unit.SFTPUploader.name || `SFTP Upload`;
    if (unit.Zip) return unit.Zip.name || `Zip Files`;
    if (unit.Unzip) return unit.Unzip.name || `Unzip Files`;
    if (unit.CallPipeline) return unit.CallPipeline.Pipeline?.name || `Call Pipeline: ${unit.CallPipeline.pipeline_id || 'Unknown'}`;
    return `Unit ${unit.id}`;
  };

  const getUnitIconName = (unit: any) => {
    if (unit.command_id) return "Terminal";
    if (unit.query_queue_id) return "Database";
    if (unit.sftp_downloader_id) return "Download";
    if (unit.sftp_uploader_id) return "Upload";
    if (unit.zip_id) return "Archive";
    if (unit.unzip_id) return "FolderOpen";
    if (unit.call_pipeline) return "GitBranch";
    return "Box";
  };

  // NUEVO: Función para renderizar conexiones CSS usando posiciones reales
  const renderConnectionsCSS = () => {
    if (!unitsData?.merlin_agent_PipelineUnit) return null;
    
    const units = unitsData.merlin_agent_PipelineUnit;
    const connections: JSX.Element[] = [];
    
    units.forEach((unit: any) => {
      if (unit.pipeline_unit_id) {
        const fromPos = nodePositions[unit.pipeline_unit_id];
        const toPos = nodePositions[unit.id];
        
        if (fromPos && toPos) {
          const dx = toPos.x - fromPos.x;
          const dy = toPos.y - fromPos.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const angle = Math.atan2(dy, dx) * 180 / Math.PI;
          
          // Ajustes para que la línea no se superponga con los nodos
          const startPadding = 50; // Espacio desde el borde del nodo origen
          const endPadding = 50;   // Espacio antes del borde del nodo destino
          const adjustedDistance = Math.max(0, distance - startPadding - endPadding);
          
          const startX = fromPos.x + (dx / distance) * startPadding;
          const startY = fromPos.y + (dy / distance) * startPadding;
          
          connections.push(
            <div
              key={`connection-${unit.pipeline_unit_id}-${unit.id}`}
              className="absolute bg-gray-400 h-0.5 origin-left pointer-events-none z-10"
              style={{
                left: startX,
                top: startY,
                width: adjustedDistance,
                transform: `rotate(${angle}deg)`,
              }}
            />
          );
          
          // Flecha al final de la línea
          const arrowX = startX + (dx / distance) * (distance - endPadding + 10);
          const arrowY = startY + (dy / distance) * (distance - endPadding + 10);
          
          connections.push(
            <div
              key={`arrow-${unit.pipeline_unit_id}-${unit.id}`}
              className="absolute w-0 h-0 pointer-events-none z-10"
              style={{
                left: arrowX,
                top: arrowY,
                borderLeft: '6px solid #9CA3AF',
                borderTop: '4px solid transparent',
                borderBottom: '4px solid transparent',
                transform: `rotate(${angle}deg)`,
              }}
            />
          );
        }
      }
    });
    
    return connections;
  };

  // NUEVO: Función para calcular el grid basado en las posiciones
  const calculateGridLayout = (units: any[]) => {
    // Agrupar por nivel (unidades sin padre en nivel 0, sus hijos en nivel 1, etc.)
    const levels: { [key: number]: any[] } = {};
    const unitLevels: { [key: string]: number } = {};
    
    // Encontrar unidades raíz (sin padre)
    const rootUnits = units.filter((u: any) => !u.pipeline_unit_id);
    rootUnits.forEach((unit: any) => {
      unitLevels[unit.id] = 0;
      if (!levels[0]) levels[0] = [];
      levels[0].push(unit);
    });
    
    // Calcular niveles para el resto de unidades
    let currentLevel = 0;
    let hasChanges = true;
    
    while (hasChanges && currentLevel < 10) { // Límite de seguridad
      hasChanges = false;
      units.forEach((unit: any) => {
        if (unit.pipeline_unit_id && unitLevels[unit.id] === undefined) {
          const parentLevel = unitLevels[unit.pipeline_unit_id];
          if (parentLevel !== undefined) {
            const newLevel = parentLevel + 1;
            unitLevels[unit.id] = newLevel;
            if (!levels[newLevel]) levels[newLevel] = [];
            levels[newLevel].push(unit);
            hasChanges = true;
          }
        }
      });
      currentLevel++;
    }
    
    return { levels, unitLevels };
  };

  // Verificar si hay datos cargados
  const units = unitsData?.merlin_agent_PipelineUnit || [];
  const pipeline = pipelineData?.merlin_agent_Pipeline_by_pk;

  // Calcular layout del grid
  const { levels } = calculateGridLayout(units);

  return (
    <div className="w-full h-full bg-background">
      {/* Selector de Pipeline */}
      {showSelector && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Pipeline Visualizer</CardTitle>
          </CardHeader>
          <CardContent>
            <PipelineSearch onPipelineSelect={handlePipelineSelect} />
          </CardContent>
        </Card>
      )}

      {/* Información del Pipeline Seleccionado */}
      {selectedPipeline && (
        <Card className="mb-6">
          <CardContent className="pt-6">
            {pipelineLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ) : pipelineError ? (
              <div className="text-red-600 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Error loading pipeline
              </div>
            ) : pipeline ? (
              <div>
                <h3 className="text-lg font-semibold">{pipeline.name}</h3>
                {pipeline.description && (
                  <p className="text-muted-foreground">{pipeline.description}</p>
                )}
                <div className="mt-2 text-sm text-muted-foreground">
                  Agent: {pipeline.agent_passport_id}
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      )}

      {/* Visualización de las Unidades */}
      {selectedPipeline && (
        <Card>
          <CardHeader>
            <CardTitle>Pipeline Units</CardTitle>
          </CardHeader>
          <CardContent>
            {unitsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
            ) : unitsError ? (
              <div className="text-red-600 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Error loading pipeline units
              </div>
            ) : units.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No units found for this pipeline
              </div>
            ) : (
              <div className="relative" ref={containerRef}>
                {/* NUEVO: Renderizar conexiones CSS */}
                {renderConnectionsCSS()}
                
                {/* NUEVO: Layout por niveles */}
                <div className="space-y-16">
                  {Object.entries(levels).map(([level, levelUnits]) => (
                    <div key={level} className="space-y-4">
                      <div className="text-sm font-medium text-muted-foreground">
                        Level {level}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {levelUnits.map((unit: any) => (
                          <div
                            key={unit.id}
                            ref={(el) => { nodeRefs.current[unit.id] = el; }}
                            className={`
                              p-4 rounded-lg border-2 cursor-pointer transition-all
                              hover:shadow-md hover:scale-105 relative z-20
                              ${getUnitColor(unit)}
                            `}
                            onClick={() => handleUnitClick(unit)}
                          >
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-2 h-2 rounded-full bg-current opacity-60" />
                              <span className="font-medium text-sm">
                                {getUnitIconName(unit)}
                              </span>
                            </div>
                            <div className="font-semibold text-sm mb-1">
                              {getUnitDisplayName(unit)}
                            </div>
                            <div className="text-xs opacity-75">
                              ID: {unit.id.substring(0, 8)}...
                            </div>
                            {unit.pipeline_unit_id && (
                              <div className="text-xs opacity-60 mt-1">
                                Parent: {unit.pipeline_unit_id.substring(0, 8)}...
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Dialog para mostrar detalles de la unidad */}
      <UnifiedPipelineUnitDialog
        unit={selectedUnit}
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
      />
    </div>
  );
}