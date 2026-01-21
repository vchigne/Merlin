import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Info } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import UnifiedPipelineUnitDialog from "@/components/ui/UnifiedPipelineUnitDialog";

interface PipelineVisualizerStudioProps {
  pipelineUnits: any[];
  isLoading?: boolean;
}

export default function PipelineVisualizerStudio({ 
  pipelineUnits = [], 
  isLoading = false 
}: PipelineVisualizerStudioProps) {
  const [selectedUnit, setSelectedUnit] = useState<any>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Determinar el tipo de unidad basado en qué campo ID tiene valor
  const getUnitType = (unit: any) => {
    if (unit.command_id) return { type: 'Command', category: 'standard' };
    if (unit.query_queue_id) return { type: 'SQL Query', category: 'standard' };
    if (unit.sftp_downloader_id) return { type: 'SFTP Download', category: 'standard' };
    if (unit.sftp_uploader_id) return { type: 'SFTP Upload', category: 'standard' };
    if (unit.zip_id) return { type: 'Zip Files', category: 'standard' };
    if (unit.unzip_id) return { type: 'Unzip Files', category: 'standard' };
    if (unit.call_pipeline) return { type: 'Pipeline Call', category: 'standard' };
    return { type: 'Unknown', category: 'standard' };
  };

  // Obtener color por tipo de unidad
  const getUnitColor = (type: string) => {
    const colors = {
      'Command': '#10B981', // green
      'SQL Query': '#3B82F6', // blue
      'SFTP Download': '#8B5CF6', // purple
      'SFTP Upload': '#F59E0B', // orange
      'Zip Files': '#EF4444', // red
      'Unzip Files': '#EC4899', // pink
      'Pipeline Call': '#6366F1', // indigo
    };
    return colors[type as keyof typeof colors] || '#6B7280';
  };

  // Obtener nombre descriptivo de la unidad
  const getDisplayName = (unit: any) => {
    const type = getUnitType(unit);
    const typeNames = {
      'Command': 'Comando del sistema',
      'SQL Query': 'Cola de consultas SQL',
      'SFTP Download': 'Descarga SFTP',
      'SFTP Upload': 'Subida SFTP',
      'Zip Files': 'Compresión ZIP',
      'Unzip Files': 'Extracción ZIP',
      'Pipeline Call': 'Llamada a Pipeline',
    };
    return typeNames[type.type as keyof typeof typeNames] || 'Unidad desconocida';
  };

  // Obtener descripción de la unidad
  const getDisplayDescription = (unit: any) => {
    const type = getUnitType(unit);
    const descriptions = {
      'Command': 'Ejecución de comando de sistema',
      'SQL Query': 'Procesa consultas SQL en secuencia',
      'SFTP Download': 'Descarga archivos via SFTP',
      'SFTP Upload': 'Sube archivos via SFTP',
      'Zip Files': 'Comprime archivos en ZIP',
      'Unzip Files': 'Extrae archivos de ZIP',
      'Pipeline Call': 'Ejecuta otro pipeline',
    };
    return descriptions[type.type as keyof typeof descriptions] || 'Descripción no disponible';
  };

  // Procesar las unidades para visualización
  const processUnits = (units: any[]) => {
    if (!units || units.length === 0) {
      return { nodes: [], connections: [] };
    }

    // Ordenar unidades por posición o índice
    const sortedUnits = [...units].sort((a, b) => {
      if (a.posx !== undefined && b.posx !== undefined) {
        return a.posx - b.posx;
      }
      return 0;
    });

    console.log('📊 Unidades ordenadas:', sortedUnits.map(u => ({ 
      id: u.id, 
      type: getUnitType(u) 
    })));

    // Crear nodos con posiciones en grid de 3 columnas
    const nodes = sortedUnits.map((unit, index) => {
      const type = getUnitType(unit);
      
      // Calcular posición en grid de 3 columnas
      const row = Math.floor(index / 3);
      const col = index % 3;
      
      const xPosition = 50 + (col * 220); // Espaciado horizontal de 220px
      const yPosition = 50 + (row * 180); // Espaciado vertical de 180px
      
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
      pos: `${n.posX},${n.posY}`,
      parentId: n.data.pipeline_unit_id
    })));

    // Crear conexiones basadas en relaciones padre-hijo (pipeline_unit_id)
    const connections: any[] = [];
    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    let connectionIndex = 0;
    
    console.log('🔗 Creando conexiones padre-hijo para', nodes.length, 'nodos...');
    
    nodes.forEach((node) => {
      const parentId = node.data.pipeline_unit_id;
      if (parentId) {
        const parentNode = nodeMap.get(parentId);
        if (parentNode) {
          const connectionId = `parent-child-conn-${connectionIndex}`;
          
          connections.push({
            id: connectionId,
            from: parentNode.id,
            to: node.id,
            fromX: parentNode.posX + 100,
            fromY: parentNode.posY + 48,
            toX: node.posX + 100,
            toY: node.posY + 48
          });
          
          connectionIndex++;
        }
      }
    });

    console.log('🔥 RESULTADO FINAL:', {
      nodes: nodes.length,
      connections: connections.length,
      raices: nodes.filter(n => !n.data.pipeline_unit_id).length
    });

    return { nodes, connections };
  };

  // Manejar clic en botón Details
  const handleDetailsClick = (unit: any) => {
    setSelectedUnit(unit);
    setDialogOpen(true);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="border-b border-slate-200 dark:border-slate-700">
          <CardTitle>Visualización del Pipeline</CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-6">
          <div className="relative w-full h-[400px] overflow-auto pb-4">
            <div className="flex items-center justify-center h-full">
              <Skeleton className="h-full w-full rounded-lg" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!pipelineUnits || pipelineUnits.length === 0) {
    return (
      <Card>
        <CardHeader className="border-b border-slate-200 dark:border-slate-700">
          <CardTitle>Visualización del Pipeline</CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-6">
          <div className="relative w-full h-[400px] overflow-auto pb-4">
            <div className="flex items-center justify-center h-full text-slate-500 dark:text-slate-400">
              No hay unidades definidas para este pipeline
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="border-b border-slate-200 dark:border-slate-700">
          <CardTitle>Visualización del Pipeline</CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-6">
          <div className="relative w-full h-[400px] overflow-auto pb-4">
            <div ref={containerRef} className="relative w-full min-w-[400px] md:min-w-[600px] lg:min-w-[800px] h-full">
              {(() => {
                const { nodes, connections } = processUnits(pipelineUnits);
                const nodeMap = new Map(nodes.map(n => [n.id, n]));
                
                // Calcular conexiones CSS basadas en relaciones padre-hijo
                const cssConnections: any[] = [];
                let connIndex = 0;
                
                nodes.forEach((node) => {
                  const parentId = node.data.pipeline_unit_id;
                  if (parentId) {
                    const parentNode = nodeMap.get(parentId);
                    if (parentNode) {
                      const startX = parentNode.posX + 100;
                      const startY = parentNode.posY + 48;
                      const endX = node.posX + 100;
                      const endY = node.posY + 48;
                      
                      const deltaX = endX - startX;
                      const deltaY = endY - startY;
                      const length = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
                      const angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);
                      
                      cssConnections.push({
                        id: `css-conn-${connIndex}`,
                        left: startX,
                        top: startY - 1,
                        width: length,
                        angle: angle,
                        color: getUnitColor(parentNode.type)
                      });
                      connIndex++;
                    }
                  }
                });
                
                return (
                  <>
                    {/* Conexiones CSS */}
                    {cssConnections.map((conn) => (
                      <div
                        key={conn.id}
                        className="absolute border-t-2 origin-left opacity-70"
                        style={{
                          left: `${conn.left}px`,
                          top: `${conn.top}px`,
                          width: `${conn.width}px`,
                          transform: `rotate(${conn.angle}deg)`,
                          borderColor: conn.color,
                          zIndex: 1
                        }}
                      />
                    ))}
                    
                    {/* Nodos */}
                    {nodes.map((node) => (
                      <div
                        key={node.id}
                        className="absolute bg-white dark:bg-slate-800 border-2 rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
                        style={{
                          left: `${node.posX}px`,
                          top: `${node.posY}px`,
                          width: '200px',
                          height: '96px',
                          borderColor: getUnitColor(node.type),
                          zIndex: 2
                        }}
                      >
                        {/* Header con tipo y color */}
                        <div 
                          className="px-3 py-1 text-white text-xs font-medium rounded-t-md"
                          style={{ backgroundColor: getUnitColor(node.type) }}
                        >
                          {node.type}
                        </div>
                        
                        {/* Contenido */}
                        <div className="p-3 h-[calc(100%-24px)] flex flex-col justify-between">
                          <div>
                            <h4 className="font-medium text-sm text-slate-900 dark:text-slate-100 leading-tight">
                              {node.displayName}
                            </h4>
                            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-tight">
                              {node.displayDescription}
                            </p>
                          </div>
                          
                          {/* Botón Details en la esquina inferior derecha */}
                          <div className="flex justify-end">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDetailsClick(node.data)}
                              className="h-6 px-2 text-xs bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 dark:border-blue-800 dark:text-blue-400"
                            >
                              <Info className="h-3 w-3 mr-1" />
                              Details
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </>
                );
              })()}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dialog para mostrar detalles de la unidad */}
      <UnifiedPipelineUnitDialog
        unit={selectedUnit}
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setSelectedUnit(null);
        }}
      />
    </>
  );
}