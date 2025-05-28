import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { 
  GitBranch, 
  Database, 
  Upload, 
  Download, 
  Archive, 
  FolderOpen, 
  Terminal,
  AlertCircle,
  Clock,
  RefreshCw
} from "lucide-react";

// Interfaces basadas en nuestra documentación completa
interface PipelineUnit {
  id: string;
  pipeline_id: string;
  pipeline_unit_id?: string;
  retry_count: number;
  retry_after_milliseconds: number;
  timeout_milliseconds: number;
  continue_on_error: boolean;
  abort_on_error: boolean;
  abort_on_timeout: boolean;
  
  // Solo uno será no-null (define el tipo de runner)
  command_id?: string;
  query_queue_id?: string;
  sftp_downloader_id?: string;
  sftp_uploader_id?: string;
  zip_id?: string;
  unzip_id?: string;
  call_pipeline_id?: string;
  
  // Relaciones cargadas desde Hasura
  Command?: any;
  QueryQueue?: any;
  SFTPDownloader?: any;
  SFTPUploader?: any;
  Zip?: any;
  Unzip?: any;
  CallPipeline?: any;
}

interface PipelineUnitChain {
  Unit: PipelineUnit;
  Children: PipelineUnitChain[];
}

interface PipelineFlowEnhancedProps {
  pipelineUnits: PipelineUnit[];
  isLoading: boolean;
}

// Configuración visual por tipo de runner (basada en nuestra documentación)
const runnerConfig = {
  Command: {
    color: "#10B981",
    icon: Terminal,
    label: "Command",
    description: "Ejecuta comandos del sistema"
  },
  QueryQueue: {
    color: "#3B82F6", 
    icon: Database,
    label: "Query Queue",
    description: "Ejecuta consultas SQL"
  },
  SFTPDownloader: {
    color: "#8B5CF6",
    icon: Download,
    label: "SFTP Download",
    description: "Descarga archivos SFTP"
  },
  SFTPUploader: {
    color: "#F59E0B",
    icon: Upload,
    label: "SFTP Upload", 
    description: "Sube archivos SFTP"
  },
  Zip: {
    color: "#EF4444",
    icon: Archive,
    label: "Zip",
    description: "Comprime archivos"
  },
  Unzip: {
    color: "#EC4899",
    icon: FolderOpen,
    label: "Unzip",
    description: "Descomprime archivos"
  },
  CallPipeline: {
    color: "#6366F1",
    icon: GitBranch,
    label: "Call Pipeline",
    description: "Llama otro pipeline"
  }
};

export default function PipelineFlowEnhanced({ pipelineUnits, isLoading }: PipelineFlowEnhancedProps) {
  const [pipelineChain, setPipelineChain] = useState<PipelineUnitChain[]>([]);
  const [selectedUnit, setSelectedUnit] = useState<PipelineUnit | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Detecta el tipo de runner basado en nuestra documentación
  const detectRunnerType = (unit: PipelineUnit): keyof typeof runnerConfig => {
    if (unit.command_id) return "Command";
    if (unit.query_queue_id) return "QueryQueue";
    if (unit.sftp_downloader_id) return "SFTPDownloader";
    if (unit.sftp_uploader_id) return "SFTPUploader";
    if (unit.zip_id) return "Zip";
    if (unit.unzip_id) return "Unzip";
    if (unit.call_pipeline_id) return "CallPipeline";
    throw new Error("Unknown runner type");
  };

  // Construye la cadena de dependencias (algoritmo del Orchestator)
  const buildPipelineChain = (units: PipelineUnit[]): PipelineUnitChain[] => {
    // 1. Encontrar unidades raíz (pipeline_unit_id === null)
    const roots = units.filter(unit => unit.pipeline_unit_id === null);
    
    // 2. Para cada raíz, construir recursivamente sus hijos
    return roots.map(root => ({
      Unit: root,
      Children: getChildren(root.id, units)
    }));
  };

  const getChildren = (parentId: string, allUnits: PipelineUnit[]): PipelineUnitChain[] => {
    const children = allUnits.filter(unit => unit.pipeline_unit_id === parentId);
    
    return children.map(child => ({
      Unit: child,
      Children: getChildren(child.id, allUnits) // Recursivo
    }));
  };

  // Obtiene información detallada para el tooltip
  const getUnitTooltipInfo = (unit: PipelineUnit): string => {
    const runnerType = detectRunnerType(unit);
    
    switch(runnerType) {
      case "Command":
        const cmd = unit.Command;
        return cmd ? `${cmd.target} ${cmd.args || ''}` : "Comando del sistema";
      case "QueryQueue":
        const queue = unit.QueryQueue;
        return queue?.Queries ? `${queue.Queries.length} consultas SQL` : "Cola de consultas";
      case "SFTPDownloader":
        const downloader = unit.SFTPDownloader;
        return downloader?.SFTPLink ? `Descargar desde ${downloader.SFTPLink.server}` : "Descarga SFTP";
      case "SFTPUploader":
        const uploader = unit.SFTPUploader;
        return uploader?.SFTPLink ? `Subir a ${uploader.SFTPLink.server}` : "Subida SFTP";
      case "Zip":
        const zip = unit.Zip;
        return zip ? `Comprimir a ${zip.zip_name}` : "Compresión";
      case "Unzip":
        const unzip = unit.Unzip;
        return unzip?.FileStreamUnzips ? `Descomprimir ${unzip.FileStreamUnzips.length} archivos` : "Descompresión";
      case "CallPipeline":
        const pipeline = unit.CallPipeline;
        return pipeline?.Pipeline ? `Llamar: ${pipeline.Pipeline.name}` : "Llamada a pipeline";
      default:
        return "Unidad de pipeline";
    }
  };

  // Renderiza una unidad individual
  const renderUnit = (chain: PipelineUnitChain, level: number = 0) => {
    const { Unit: unit } = chain;
    const runnerType = detectRunnerType(unit);
    const config = runnerConfig[runnerType];
    const IconComponent = config.icon;

    return (
      <div key={unit.id} className="pipeline-unit-container" style={{ marginLeft: `${level * 40}px` }}>
        {/* Unidad principal */}
        <Card 
          className="pipeline-unit-card mb-4 cursor-pointer hover:shadow-lg transition-all duration-200 border-l-4"
          style={{ borderLeftColor: config.color }}
          onClick={() => {
            setSelectedUnit(unit);
            setIsDialogOpen(true);
          }}
        >
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div 
                  className="p-2 rounded-lg"
                  style={{ backgroundColor: `${config.color}20` }}
                >
                  <IconComponent 
                    className="h-5 w-5" 
                    style={{ color: config.color }}
                  />
                </div>
                <div>
                  <CardTitle className="text-sm font-medium">
                    {config.label}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {getUnitTooltipInfo(unit)}
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {unit.retry_count > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    <RefreshCw className="h-3 w-3 mr-1" />
                    {unit.retry_count}
                  </Badge>
                )}
                {unit.timeout_milliseconds > 0 && (
                  <Badge variant="outline" className="text-xs">
                    <Clock className="h-3 w-3 mr-1" />
                    {Math.floor(unit.timeout_milliseconds / 1000)}s
                  </Badge>
                )}
                {unit.abort_on_error && (
                  <Badge variant="destructive" className="text-xs">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Crítico
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Línea de conexión para hijos */}
        {chain.Children.length > 0 && (
          <div className="pipeline-connection">
            <div 
              className="w-0.5 h-4 ml-6 mb-2"
              style={{ backgroundColor: config.color }}
            />
          </div>
        )}

        {/* Renderizar hijos recursivamente */}
        {chain.Children.map(childChain => renderUnit(childChain, level + 1))}
      </div>
    );
  };

  // Renderiza el detalle de la unidad en el diálogo
  const renderUnitDetails = (unit: PipelineUnit) => {
    const runnerType = detectRunnerType(unit);
    const config = runnerConfig[runnerType];

    const renderSpecificDetails = () => {
      switch(runnerType) {
        case "Command":
          const cmd = unit.Command;
          return cmd ? (
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium">Target:</label>
                <p className="text-sm text-muted-foreground">{cmd.target}</p>
              </div>
              {cmd.args && (
                <div>
                  <label className="text-sm font-medium">Argumentos:</label>
                  <p className="text-sm text-muted-foreground">{cmd.args}</p>
                </div>
              )}
              {cmd.working_directory && (
                <div>
                  <label className="text-sm font-medium">Directorio:</label>
                  <p className="text-sm text-muted-foreground">{cmd.working_directory}</p>
                </div>
              )}
              <div>
                <label className="text-sm font-medium">Modo:</label>
                <p className="text-sm text-muted-foreground">
                  {cmd.instant ? "Instantáneo" : "Streaming"}
                </p>
              </div>
            </div>
          ) : null;

        case "QueryQueue":
          const queue = unit.QueryQueue;
          return queue?.Queries ? (
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium">Consultas SQL ({queue.Queries.length}):</label>
                <div className="space-y-2 mt-2">
                  {queue.Queries.slice(0, 3).map((query: any, index: number) => (
                    <div key={query.id} className="p-2 bg-muted rounded text-xs">
                      <div className="font-mono">
                        {query.statement.substring(0, 100)}
                        {query.statement.length > 100 && "..."}
                      </div>
                      {query.path && (
                        <div className="text-muted-foreground mt-1">
                          → {query.path}
                        </div>
                      )}
                    </div>
                  ))}
                  {queue.Queries.length > 3 && (
                    <p className="text-xs text-muted-foreground">
                      +{queue.Queries.length - 3} consultas más...
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : null;

        case "SFTPUploader":
        case "SFTPDownloader":
          const sftpUnit = runnerType === "SFTPUploader" ? unit.SFTPUploader : unit.SFTPDownloader;
          const streams = runnerType === "SFTPUploader" 
            ? sftpUnit?.FileStreamSftpUploaders 
            : sftpUnit?.FileStreamSftpDownloaders;
          
          return sftpUnit ? (
            <div className="space-y-3">
              {sftpUnit.SFTPLink && (
                <div>
                  <label className="text-sm font-medium">Servidor:</label>
                  <p className="text-sm text-muted-foreground">
                    {sftpUnit.SFTPLink.user}@{sftpUnit.SFTPLink.server}:{sftpUnit.SFTPLink.port}
                  </p>
                </div>
              )}
              {streams && streams.length > 0 && (
                <div>
                  <label className="text-sm font-medium">Archivos ({streams.length}):</label>
                  <div className="space-y-1 mt-2">
                    {streams.slice(0, 3).map((stream: any, index: number) => (
                      <div key={index} className="text-xs text-muted-foreground">
                        {stream.input} → {stream.output}
                      </div>
                    ))}
                    {streams.length > 3 && (
                      <p className="text-xs text-muted-foreground">
                        +{streams.length - 3} archivos más...
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : null;

        case "Zip":
          const zip = unit.Zip;
          return zip ? (
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium">Archivo destino:</label>
                <p className="text-sm text-muted-foreground">{zip.zip_name}</p>
              </div>
              {zip.FileStreamZips && (
                <div>
                  <label className="text-sm font-medium">Archivos a comprimir:</label>
                  <div className="space-y-1 mt-2">
                    {zip.FileStreamZips.map((stream: any, index: number) => (
                      <div key={index} className="text-xs text-muted-foreground">
                        {stream.input}
                        {stream.wildcard_exp && ` (${stream.wildcard_exp})`}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : null;

        case "CallPipeline":
          const callPipeline = unit.CallPipeline;
          return callPipeline ? (
            <div className="space-y-3">
              {callPipeline.Pipeline && (
                <div>
                  <label className="text-sm font-medium">Pipeline:</label>
                  <p className="text-sm text-muted-foreground">{callPipeline.Pipeline.name}</p>
                  {callPipeline.Pipeline.description && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {callPipeline.Pipeline.description}
                    </p>
                  )}
                </div>
              )}
              <div>
                <label className="text-sm font-medium">Timeout:</label>
                <p className="text-sm text-muted-foreground">
                  {Math.floor(callPipeline.timeout_milliseconds / 1000)} segundos
                </p>
              </div>
            </div>
          ) : null;

        default:
          return null;
      }
    };

    return (
      <div className="space-y-4">
        {/* Información general */}
        <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
          <config.icon className="h-6 w-6" style={{ color: config.color }} />
          <div>
            <h4 className="font-medium">{config.label}</h4>
            <p className="text-sm text-muted-foreground">{config.description}</p>
          </div>
        </div>

        <Separator />

        {/* Configuración de ejecución */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <label className="font-medium">Reintentos:</label>
            <p className="text-muted-foreground">{unit.retry_count}</p>
          </div>
          <div>
            <label className="font-medium">Timeout:</label>
            <p className="text-muted-foreground">{Math.floor(unit.timeout_milliseconds / 1000)}s</p>
          </div>
          <div>
            <label className="font-medium">Continuar en error:</label>
            <p className="text-muted-foreground">{unit.continue_on_error ? "Sí" : "No"}</p>
          </div>
          <div>
            <label className="font-medium">Abortar en error:</label>
            <p className="text-muted-foreground">{unit.abort_on_error ? "Sí" : "No"}</p>
          </div>
        </div>

        <Separator />

        {/* Detalles específicos del runner */}
        {renderSpecificDetails()}
      </div>
    );
  };

  useEffect(() => {
    if (pipelineUnits && pipelineUnits.length > 0) {
      const chain = buildPipelineChain(pipelineUnits);
      setPipelineChain(chain);
    }
  }, [pipelineUnits]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center space-y-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-sm text-muted-foreground">Cargando pipeline...</p>
        </div>
      </div>
    );
  }

  if (!pipelineUnits || pipelineUnits.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center space-y-2">
          <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto" />
          <p className="text-sm text-muted-foreground">No hay unidades en este pipeline</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pipeline-flow-enhanced">
      <div className="space-y-6">
        {pipelineChain.map(chain => renderUnit(chain))}
      </div>

      {/* Diálogo de detalles */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedUnit && runnerConfig[detectRunnerType(selectedUnit)].label}
            </DialogTitle>
            <DialogDescription>
              Detalles de la unidad del pipeline
            </DialogDescription>
          </DialogHeader>
          {selectedUnit && renderUnitDetails(selectedUnit)}
        </DialogContent>
      </Dialog>
    </div>
  );
}