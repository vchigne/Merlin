import { useEffect, useState } from "react";
import { convertToFlowCoordinates } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { 
  GitBranch, 
  Database, 
  FileUp, 
  FileDown, 
  Archive, 
  FileOutput, 
  Code, 
  Terminal, 
  AlertCircle
} from "lucide-react";
import "@/styles/pipeline-flow.css";

interface PipelineFlowProps {
  pipelineUnits: any[];
  pipelineJobs?: any[];
  isLoading: boolean;
}

export default function PipelineFlow({ pipelineUnits, pipelineJobs, isLoading }: PipelineFlowProps) {
  const [flowElements, setFlowElements] = useState<{ nodes: any[]; edges: any[] }>({ nodes: [], edges: [] });
  const [selectedUnit, setSelectedUnit] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // Cierra el diálogo
  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    // Limpiar el estado después de cerrar para evitar que los datos antiguos aparezcan brevemente
    setTimeout(() => setSelectedUnit(null), 200);
  };
  
  // Abre el diálogo con los detalles de la unidad seleccionada
  const handleUnitClick = (unitData: any) => {
    setSelectedUnit(unitData);
    setIsDialogOpen(true);
  };

  useEffect(() => {
    if (pipelineUnits && pipelineUnits.length > 0) {
      setFlowElements(convertToFlowCoordinates(pipelineUnits));
    }
  }, [pipelineUnits]);

  // Get appropriate icon for unit type
  const getUnitIcon = (type: string) => {
    switch (type) {
      case 'command':
        return <Terminal className="h-4 w-4 text-purple-500" />;
      case 'query':
        return <Database className="h-4 w-4 text-blue-500" />;
      case 'sftp_download':
        return <FileDown className="h-4 w-4 text-green-500" />;
      case 'sftp_upload':
        return <FileUp className="h-4 w-4 text-orange-500" />;
      case 'zip':
        return <Archive className="h-4 w-4 text-amber-500" />;
      case 'unzip':
        return <FileOutput className="h-4 w-4 text-indigo-500" />;
      case 'pipeline':
        return <GitBranch className="h-4 w-4 text-pink-500" />;
      default:
        return <Code className="h-4 w-4 text-slate-500" />;
    }
  };

  // Get unit status from job data (if available)
  const getUnitStatus = (unitId: string) => {
    if (!pipelineJobs || pipelineJobs.length === 0) return 'pending';
    
    // Find the most recent job
    const recentJob = pipelineJobs[0];
    
    // Find log entry for this unit
    const logEntry = recentJob.PipelineJobLogs?.find((log: any) => log.pipeline_unit_id === unitId);
    
    if (!logEntry) return 'pending';
    
    if (logEntry.errors) return 'error';
    if (recentJob.completed) return 'completed';
    if (recentJob.running) return 'running';
    
    return 'pending';
  };

  // Loading state
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pipeline Flow</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="h-[400px] w-full flex items-center justify-center">
            <Skeleton className="h-full w-full rounded-lg" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Empty state
  if (!pipelineUnits || pipelineUnits.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pipeline Flow</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="h-[300px] w-full flex flex-col items-center justify-center text-slate-500 dark:text-slate-400">
            <AlertCircle className="h-16 w-16 mb-4 text-slate-300 dark:text-slate-600" />
            <p>No pipeline units defined</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pipeline Flow</CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="relative h-[500px] w-full overflow-auto bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4">
          {/* Contenedor para las conexiones */}
          <div className="absolute inset-0 w-full h-full" style={{ zIndex: 0 }}>
            <svg width="100%" height="100%" className="absolute top-0 left-0">
              <defs>
                <marker
                  id="arrow"
                  viewBox="0 0 10 10"
                  refX="5"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#475569" />
                </marker>
              </defs>
              
              {/* Dibujar las líneas de conexión */}
              {flowElements.edges.map((edge) => {
                const sourceNode = flowElements.nodes.find(n => n.id === edge.source);
                const targetNode = flowElements.nodes.find(n => n.id === edge.target);
                
                if (!sourceNode || !targetNode) return null;
                
                // Puntos de inicio y fin
                const startX = sourceNode.position.x + 104;  // Centro del nodo
                const startY = sourceNode.position.y + 60;   // Parte inferior
                const endX = targetNode.position.x + 104;    // Centro del nodo
                const endY = targetNode.position.y + 10;     // Parte superior
                
                // Línea recta con flecha
                return (
                  <line
                    key={edge.id}
                    x1={startX}
                    y1={startY}
                    x2={endX}
                    y2={endY}
                    stroke="#475569"
                    strokeWidth="2"
                    markerEnd="url(#arrow)"
                  />
                );
              })}
            </svg>
          </div>
          
          {/* Dibujar nodos */}
          {flowElements.nodes.map((node) => {
            const unitType = node.data.type;
            const status = getUnitStatus(node.id);
            
            return (
              <div 
                key={node.id}
                className={`absolute w-52 pipeline-node ${status} cursor-pointer hover:shadow-md transition-shadow`}
                style={{ top: `${node.position.y}px`, left: `${node.position.x}px`, zIndex: 1 }}
                onClick={() => handleUnitClick(node.data.unit)}
                title="Haz clic para ver detalles"
              >
                <div className="flex items-center space-x-2 mb-2">
                  {getUnitIcon(unitType)}
                  <div className="text-sm font-medium dark:text-white truncate max-w-[90%]">
                    {node.data.label}
                  </div>
                </div>
                
                {node.data.description && (
                  <div className="text-xs text-slate-600 dark:text-slate-300 mb-2 max-w-full overflow-hidden text-ellipsis">
                    {node.data.description}
                  </div>
                )}
                
                <div className="flex mt-1">
                  <Badge variant="outline" className={`text-xs ${
                    status === 'completed' ? 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400' :
                    status === 'running' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 animate-pulse' :
                    status === 'error' ? 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400' :
                    'bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                  }`}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
      
      {/* Modal de detalles */}
      {isDialogOpen && selectedUnit && (
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                {getUnitIcon(determineUnitType(selectedUnit))}
                <span>Detalles de la Unidad</span>
              </DialogTitle>
              <DialogDescription>
                Información detallada sobre esta unidad del pipeline
              </DialogDescription>
            </DialogHeader>
            
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
              
              <div className="flex flex-wrap gap-2">
                {selectedUnit.abort_on_timeout && (
                  <Badge variant="outline" className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400">
                    Abortar en Timeout
                  </Badge>
                )}
                {selectedUnit.continue_on_error && (
                  <Badge variant="outline" className="bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400">
                    Continuar en Error
                  </Badge>
                )}
              </div>
              
              <Separator />
              
              <div className="grid grid-cols-2 gap-4">
                {selectedUnit.timeout_milliseconds > 0 && (
                  <div>
                    <h4 className="text-xs font-medium mb-1">Timeout</h4>
                    <p className="text-sm">{Math.round(selectedUnit.timeout_milliseconds / 1000)} seg</p>
                  </div>
                )}
                
                {selectedUnit.retry_count > 0 && (
                  <div>
                    <h4 className="text-xs font-medium mb-1">Reintentos</h4>
                    <p className="text-sm">{selectedUnit.retry_count} veces</p>
                  </div>
                )}
                
                {selectedUnit.retry_after_milliseconds > 0 && (
                  <div>
                    <h4 className="text-xs font-medium mb-1">Espera entre reintentos</h4>
                    <p className="text-sm">{Math.round(selectedUnit.retry_after_milliseconds / 1000)} seg</p>
                  </div>
                )}
              </div>
            </div>
            
            <DialogFooter>
              <Button onClick={handleCloseDialog}>Cerrar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </Card>
  );
}

// Función para determinar el tipo de unidad
function determineUnitType(unit: any): string {
  if (unit.command_id) return 'command';
  if (unit.query_queue_id) return 'query';
  if (unit.sftp_downloader_id) return 'sftp_download';
  if (unit.sftp_uploader_id) return 'sftp_upload';
  if (unit.zip_id) return 'zip';
  if (unit.unzip_id) return 'unzip';
  if (unit.call_pipeline) return 'pipeline';
  return 'unknown';
}

// Función para obtener una descripción más detallada del tipo de unidad
function getUnitTypeDescription(unit: any): string {
  if (unit.command_id) return 'Esta unidad ejecuta un comando en el sistema operativo del agente.';
  if (unit.query_queue_id) return 'Esta unidad ejecuta una o más consultas SQL en una base de datos.';
  if (unit.sftp_downloader_id) return 'Esta unidad descarga archivos desde un servidor remoto usando SFTP.';
  if (unit.sftp_uploader_id) return 'Esta unidad sube archivos a un servidor remoto usando SFTP.';
  if (unit.zip_id) return 'Esta unidad comprime archivos en un archivo ZIP.';
  if (unit.unzip_id) return 'Esta unidad extrae archivos de un archivo ZIP.';
  if (unit.call_pipeline) return 'Esta unidad llama a otro pipeline para su ejecución.';
  return 'Unidad de pipeline';
}