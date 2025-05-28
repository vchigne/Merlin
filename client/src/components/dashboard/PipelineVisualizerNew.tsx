import { useState, useEffect } from "react";
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

  // Función para obtener el nombre de la unidad
  const getUnitName = (unit: any): string => {
    if (unit.command_id && unit.Command) {
      return unit.Command.target || 'Command';
    }
    if (unit.query_queue_id && unit.QueryQueue?.Queries?.[0]?.SQLConn) {
      return unit.QueryQueue.Queries[0].SQLConn.name || 'Query Queue';
    }
    if (unit.sftp_downloader_id && unit.SFTPDownloader?.SFTPLink) {
      return unit.SFTPDownloader.SFTPLink.name || 'SFTP Download';
    }
    if (unit.sftp_uploader_id && unit.SFTPUploader?.SFTPLink) {
      return unit.SFTPUploader.SFTPLink.name || 'SFTP Upload';
    }
    if (unit.zip_id && unit.Zip) {
      return unit.Zip.zip_name || 'Zip Files';
    }
    if (unit.unzip_id && unit.Unzip?.FileStreamUnzips?.[0]) {
      return unit.Unzip.FileStreamUnzips[0].input || 'Unzip Files';
    }
    if (unit.call_pipeline && unit.CallPipeline?.Pipeline) {
      return unit.CallPipeline.Pipeline.name || 'Pipeline Call';
    }
    return getUnitType(unit);
  };

  // Función para obtener la descripción de la unidad
  const getUnitDescription = (unit: any): string => {
    if (unit.command_id && unit.Command) {
      if (unit.Command.args) return unit.Command.args;
      if (unit.Command.working_directory) return `Working dir: ${unit.Command.working_directory}`;
      return 'Ejecuta comandos del sistema';
    }
    if (unit.query_queue_id && unit.QueryQueue?.Queries) {
      const queryCount = unit.QueryQueue.Queries.length;
      return queryCount > 0 ? `${queryCount} consulta${queryCount > 1 ? 's' : ''} SQL` : 'Cola de consultas SQL';
    }
    if (unit.sftp_downloader_id && unit.SFTPDownloader?.FileStreamSftpDownloaders) {
      const downloadCount = unit.SFTPDownloader.FileStreamSftpDownloaders.length;
      return downloadCount > 0 ? `${downloadCount} archivo${downloadCount > 1 ? 's' : ''} para descargar` : 'Descarga archivos SFTP';
    }
    if (unit.sftp_uploader_id && unit.SFTPUploader?.FileStreamSftpUploaders) {
      const uploadCount = unit.SFTPUploader.FileStreamSftpUploaders.length;
      return uploadCount > 0 ? `${uploadCount} archivo${uploadCount > 1 ? 's' : ''} para subir` : 'Sube archivos SFTP';
    }
    if (unit.zip_id && unit.Zip?.FileStreamZips) {
      const zipCount = unit.Zip.FileStreamZips.length;
      return zipCount > 0 ? `Comprime ${zipCount} archivo${zipCount > 1 ? 's' : ''}` : 'Comprime archivos';
    }
    if (unit.unzip_id && unit.Unzip?.FileStreamUnzips) {
      const unzipCount = unit.Unzip.FileStreamUnzips.length;
      return unzipCount > 0 ? `Extrae ${unzipCount} archivo${unzipCount > 1 ? 's' : ''}` : 'Extrae archivos';
    }
    if (unit.call_pipeline && unit.CallPipeline?.Pipeline) {
      return unit.CallPipeline.Pipeline.description || 'Llama a otro pipeline';
    }
    return 'Unidad de pipeline';
  };

  // Función mejorada para detectar el tipo y categoría de unidad
  const detectUnitType = (unit: any) => {
    if (!unit) return { type: 'Unknown', category: 'unknown' };
    
    // SFTP Estándar
    if (unit.sftp_downloader_id) return { type: 'SFTP Download', category: 'standard' };
    if (unit.sftp_uploader_id) return { type: 'SFTP Upload', category: 'standard' };
    
    // SFTP FileStream (las unidades problemáticas)
    if (unit.file_stream_sftp_downloader_id) return { type: 'SFTP Download', category: 'filestream' };
    if (unit.file_stream_sftp_uploader_id) return { type: 'SFTP Upload', category: 'filestream' };
    
    // Otros tipos estándar
    if (unit.command_id) return { type: 'Command', category: 'standard' };
    if (unit.query_queue_id) return { type: 'SQL Query', category: 'standard' };
    if (unit.zip_id) return { type: 'Zip Files', category: 'standard' };
    if (unit.unzip_id) return { type: 'Unzip Files', category: 'standard' };
    if (unit.call_pipeline) return { type: 'Call Pipeline', category: 'standard' };
    
    return { type: 'Unit', category: 'unknown' };
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
  
  // Sistema de estilos diferenciados para conexiones
  const getConnectionStyle = (sourceUnit: any, targetUnit: any) => {
    const sourceType = detectUnitType(sourceUnit);
    const targetType = detectUnitType(targetUnit);
    
    // Conexiones principales (verde continuo) - flujo estándar
    if (sourceType.category === 'standard' && targetType.category === 'standard') {
      return { 
        color: '#10b981', 
        style: 'solid', 
        width: 2,
        strokeDasharray: 'none'
      };
    }
    
    // Conexiones FileStream (naranja continuo)
    if (sourceType.category === 'filestream' || targetType.category === 'filestream') {
      return { 
        color: '#f97316', 
        style: 'solid', 
        width: 2,
        strokeDasharray: 'none'
      };
    }
    
    // Conexiones mixtas (azul continuo)
    if (sourceType.category !== targetType.category) {
      return { 
        color: '#3b82f6', 
        style: 'solid', 
        width: 2,
        strokeDasharray: 'none'
      };
    }
    
    // Conexiones auxiliares (gris discontinuo) - por defecto
    return { 
      color: '#6b7280', 
      style: 'dashed', 
      width: 1,
      strokeDasharray: '5,5'
    };
  };

  // Sistema de construcción de conexiones jerárquicas
  const buildHierarchicalConnections = (units: any[]) => {
    const connections = [];
    const unitMap = new Map(units.map(unit => [unit.id, unit]));
    
    // Crear conexiones basadas en pipeline_unit_id (el campo correcto)
    units.forEach(unit => {
      if (unit.pipeline_unit_id && unitMap.has(unit.pipeline_unit_id)) {
        const parentUnit = unitMap.get(unit.pipeline_unit_id);
        const connectionStyle = getConnectionStyle(parentUnit, unit);
        
        connections.push({
          id: `conn-${parentUnit.id}-${unit.id}`,
          source: parentUnit,
          target: unit,
          type: 'hierarchical',
          style: connectionStyle
        });
      }
    });
    
    // Si no hay suficientes conexiones jerárquicas, crear conexiones por orden lógico
    if (connections.length < units.length - 1) {
      const unconnectedUnits = units.filter(unit => 
        !connections.some(conn => conn.target.id === unit.id)
      );
      
      for (let i = 0; i < unconnectedUnits.length - 1; i++) {
        const source = unconnectedUnits[i];
        const target = unconnectedUnits[i + 1];
        const connectionStyle = getConnectionStyle(source, target);
        
        // Solo agregar si no existe ya una conexión
        if (!connections.some(conn => 
          conn.source.id === source.id && conn.target.id === target.id
        )) {
          connections.push({
            id: `conn-${source.id}-${target.id}`,
            source,
            target,
            type: 'sequential',
            style: connectionStyle
          });
        }
      }
    }
    
    return connections;
  };

  // Función para ordenar unidades según jerarquía
  const sortUnitsByHierarchy = (units: any[]) => {
    const unitMap = new Map(units.map(unit => [unit.id, unit]));
    const visited = new Set();
    const result = [];
    
    // Función recursiva para construir orden jerárquico
    const buildHierarchy = (unitId: string, depth = 0) => {
      if (visited.has(unitId) || !unitMap.has(unitId)) return;
      
      const unit = unitMap.get(unitId);
      visited.add(unitId);
      unit.hierarchyDepth = depth;
      result.push(unit);
      
      // Buscar hijos de esta unidad
      const children = units.filter(u => u.pipeline_unit_id === unitId);
      children.forEach(child => buildHierarchy(child.id, depth + 1));
    };
    
    // Encontrar unidades raíz (sin parent)
    const rootUnits = units.filter(unit => !unit.pipeline_unit_id);
    
    // Construir jerarquía desde cada raíz
    rootUnits.forEach(root => buildHierarchy(root.id, 0));
    
    // Agregar unidades sin jerarquía al final
    units.forEach(unit => {
      if (!visited.has(unit.id)) {
        unit.hierarchyDepth = 999;
        result.push(unit);
      }
    });
    
    return result;
  };

  // Algoritmo mejorado de posicionamiento y procesamiento
  const processUnits = (units: any[]) => {
    if (!units || units.length === 0) return { nodes: [], connections: [] };
    
    // 1. Detectar tipos y categorías de todas las unidades
    const unitsWithTypes = units.map(unit => ({
      ...unit,
      unitType: detectUnitType(unit),
      displayType: getUnitType(unit),
      status: getUnitStatus(unit, units.indexOf(unit))
    }));
    
    // 2. Ordenar por jerarquía en lugar de por categorías
    const orderedUnits = sortUnitsByHierarchy(unitsWithTypes);
    
    // 3. Posicionamiento jerárquico horizontal
    const SPACING_X = window.innerWidth < 640 ? 200 : 220; // Más espacio para las conexiones
    const SPACING_Y = 50;
    
    // Posicionar todas las unidades en orden jerárquico horizontal
    const allNodes = orderedUnits.map((unit, index) => ({
      ...unit,
      posX: index * SPACING_X + 10,
      posY: 50, // Una sola fila horizontal para mostrar el flujo secuencial
      type: unit.displayType,
      index
    }));
    
    // 4. Construir conexiones secuenciales simples
    const connections = [];
    for (let i = 0; i < allNodes.length - 1; i++) {
      connections.push({
        id: `conn-${i}`,
        source: allNodes[i],
        target: allNodes[i + 1],
        type: 'sequential'
      });
    }
    
    return { nodes: allNodes, connections };
  };
  
  // Consulta para obtener la lista de pipelines
  const { data: pipelinesData, isLoading: isPipelinesLoading } = useQuery({
    queryKey: ['/api/pipelines'],
    queryFn: async () => {
      const result = await executeQuery(PIPELINE_QUERY);
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
      
      const result = await executeQuery(PIPELINE_UNITS_QUERY, { 
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
          <div className="h-[300px] w-full flex items-center justify-center">
            <Skeleton className="h-full w-full rounded-lg" />
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // Estado de sin pipelines
  if (!pipelinesData || pipelinesData.length === 0) {
    return (
      <Card>
        <CardHeader className="border-b border-slate-200 dark:border-slate-700">
          <CardTitle>Visualización del Pipeline</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="h-[300px] w-full flex items-center justify-center text-slate-500 dark:text-slate-400">
            No hay pipelines disponibles
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // Renderizado principal
  return (
    <Card>
      <CardHeader className="border-b border-slate-200 dark:border-slate-700">
        <div className="flex justify-between items-center">
          <CardTitle>Visualización del Pipeline</CardTitle>
          <PipelineSearch 
            pipelines={pipelinesData || []}
            selectedPipelineId={selectedPipeline}
            onSelectPipeline={handlePipelineChange}
            isLoading={isPipelinesLoading}
          />
        </div>
      </CardHeader>
      <CardContent className="p-3 sm:p-6">
        <div className="relative w-full h-[180px] overflow-x-auto overflow-y-hidden pb-4">
          {isUnitsLoading ? (
            <div className="flex items-center justify-center h-full">
              <Skeleton className="h-full w-full rounded-lg" />
            </div>
          ) : !pipelineUnits || pipelineUnits.length === 0 ? (
            <div className="flex items-center justify-center h-full text-slate-500 dark:text-slate-400">
              No hay unidades definidas para este pipeline
            </div>
          ) : (
            <div className="relative w-full min-w-[400px] md:min-w-[600px] lg:min-w-[800px] h-full">
              {/* Procesamos las unidades para posicionarlas y crear las conexiones */}
              {(() => {
                const { nodes, connections } = processUnits(pipelineUnits);
                
                return (
                  <>
                    {/* Dibujamos primero las conexiones (flechas) con estilos diferenciados */}
                    <svg className="absolute top-0 left-0 w-full h-full pointer-events-none">
                      {connections.map((conn) => {
                        const source = conn.source;
                        const target = conn.target;
                        
                        // Coordenadas dinámicas basadas en la posición real de cada nodo
                        // Punto de salida: lado derecho del componente fuente
                        const sourceX = source.posX + 176; // Ancho del componente (w-44 = 176px)
                        const sourceY = source.posY + 48; // Centro vertical (h-24 = 96px, centro = 48px)
                        
                        // Punto de llegada: lado izquierdo del componente destino
                        const targetX = target.posX; // Borde izquierdo del siguiente componente  
                        const targetY = target.posY + 48; // Centro vertical del componente destino
                        
                        // Ruta de la curva Bezier
                        const dx = targetX - sourceX;
                        const path = `M ${sourceX},${sourceY} C ${sourceX + dx/2},${sourceY} ${targetX - dx/2},${targetY} ${targetX},${targetY}`;
                        
                        // Estilo simple para las conexiones secuenciales
                        const connectionStyle = {
                          color: '#10b981', // Verde para flujo principal
                          width: 2,
                          strokeDasharray: 'none'
                        };
                        
                        // Estado de la conexión basado en el estado de los nodos
                        const sourceStatus = getUnitStatus(source, source.index);
                        const isActive = sourceStatus !== 'pending';
                        
                        // Usar flecha estándar verde
                        const markerId = 'arrow-standard';
                        
                        return (
                          <g key={conn.id}>
                            {/* Curva principal con estilos diferenciados */}
                            <path 
                              d={path} 
                              fill="none" 
                              strokeWidth={connectionStyle.width} 
                              stroke={connectionStyle.color}
                              strokeDasharray={connectionStyle.strokeDasharray} 
                              markerEnd={`url(#${markerId})`}
                              opacity={isActive ? 1 : 0.6}
                            />
                          </g>
                        );
                      })}
                      
                      {/* Definición de los marcadores de flecha diferenciados */}
                      <defs>
                        {/* Flecha para conexiones estándar (verde) */}
                        <marker 
                          id="arrow-standard" 
                          viewBox="0 0 10 10" 
                          refX="5" 
                          refY="5"
                          markerWidth="4" 
                          markerHeight="4" 
                          orient="auto-start-reverse"
                        >
                          <path d="M 0 0 L 10 5 L 0 10 z" fill="#10b981" />
                        </marker>
                        
                        {/* Flecha para conexiones FileStream (naranja) */}
                        <marker 
                          id="arrow-filestream" 
                          viewBox="0 0 10 10" 
                          refX="5" 
                          refY="5"
                          markerWidth="4" 
                          markerHeight="4" 
                          orient="auto-start-reverse"
                        >
                          <path d="M 0 0 L 10 5 L 0 10 z" fill="#f97316" />
                        </marker>
                        
                        {/* Flecha para conexiones mixtas (azul) */}
                        <marker 
                          id="arrow-mixed" 
                          viewBox="0 0 10 10" 
                          refX="5" 
                          refY="5"
                          markerWidth="4" 
                          markerHeight="4" 
                          orient="auto-start-reverse"
                        >
                          <path d="M 0 0 L 10 5 L 0 10 z" fill="#3b82f6" />
                        </marker>
                        
                        {/* Flecha para conexiones auxiliares (gris) */}
                        <marker 
                          id="arrow-auxiliary" 
                          viewBox="0 0 10 10" 
                          refX="5" 
                          refY="5"
                          markerWidth="4" 
                          markerHeight="4" 
                          orient="auto-start-reverse"
                        >
                          <path d="M 0 0 L 10 5 L 0 10 z" fill="#6b7280" />
                        </marker>
                      </defs>
                    </svg>
                    
                    {/* Dibujamos los nodos (unidades) con estilos diferenciados */}
                    {nodes.map((unit) => {
                      const unitType = getUnitType(unit);
                      const unitTypeInfo = detectUnitType(unit);
                      const status = getUnitStatus(unit, unit.index);
                      
                      // Determinar el color del borde basado en el tipo de unidad
                      let borderColor = '';
                      if (status === 'completed') {
                        borderColor = 'border-green-500 dark:border-green-400';
                      } else if (status === 'running') {
                        borderColor = 'border-amber-500 dark:border-amber-400';
                      } else {
                        // Bordes específicos por tipo cuando no están en ejecución
                        if (unitTypeInfo.type === 'SFTP Download' || unitTypeInfo.type === 'SFTP Upload') {
                          borderColor = 'border-orange-500 dark:border-orange-400'; // Naranja para todas las unidades SFTP
                        } else if (unitTypeInfo.type === 'Command') {
                          borderColor = 'border-green-500 dark:border-green-400'; // Verde para comandos
                        } else if (unitTypeInfo.type === 'SQL Query') {
                          borderColor = 'border-blue-500 dark:border-blue-400'; // Azul para SQL
                        } else {
                          borderColor = 'border-slate-300 dark:border-slate-600'; // Gris por defecto
                        }
                      }
                      
                      return (
                        <div 
                          key={unit.id}
                          className="absolute w-40 sm:w-44 h-20 sm:h-24 bg-white dark:bg-slate-800 border-2 border-l-4 rounded-md shadow-sm transition-all duration-200 hover:shadow-lg cursor-pointer relative"
                          style={{ 
                            left: `${unit.posX}px`, 
                            top: `${unit.posY}px`,
                            borderLeftColor: getUnitTypeColor(unitTypeInfo.type)
                          }}
                          onClick={() => {
                            setSelectedUnit(unit);
                            setDialogOpen(true);
                          }}
                        >
                          {/* Tipo de unidad en la esquina superior izquierda */}
                          <div className="absolute top-1 left-1">
                            <div 
                              className="text-xs font-medium px-2 py-1 rounded text-white"
                              style={{ 
                                backgroundColor: getUnitTypeColor(unitTypeInfo.type)
                              }}
                            >
                              {unitTypeInfo.type}
                            </div>
                          </div>
                          
                          {/* Contenido principal: nombre y descripción */}
                          <div className="pt-6 px-2 pb-2 text-center h-full flex flex-col justify-center">
                            <div className="font-semibold text-sm text-slate-800 dark:text-slate-200 mb-1 line-clamp-1">
                              {getUnitName(unit) || unitType}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                              {getUnitDescription(unit) || 'Sin descripción'}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </>
                </div>
              );
            })()}
          )}
        </div>
      </CardContent>

      {/* Diálogo unificado para detalles de unidades */}
      <UnifiedPipelineUnitDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        unit={selectedUnit}
      />
    </Card>
  );
}