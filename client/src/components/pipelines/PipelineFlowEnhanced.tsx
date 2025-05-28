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
import { 
  pipelineManager, 
  type PipelineUnit, 
  type PipelineUnitChain, 
  type RunnerType 
} from "@/lib/pipeline-manager";
import { PipelineUnitDetailsDialog } from "./PipelineUnitDetailsDialog";

// Usando interfaces del PipelineManager centralizado

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

  // Usar funciones del PipelineManager centralizado

  // Renderiza una unidad individual
  const renderUnit = (chain: PipelineUnitChain, level: number = 0) => {
    const { Unit: unit } = chain;
    const runnerType = pipelineManager.detectRunnerType(unit);
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
                    {pipelineManager.getUnitTooltipInfo(unit)}
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
    const runnerType = pipelineManager.detectRunnerType(unit);
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
          // Mostrar información básica del SFTP sin streams detallados
          
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
              <div>
                <label className="text-sm font-medium">Configuración:</label>
                <div className="space-y-1 mt-2">
                  {runnerType === "SFTPUploader" && sftpUnit.input && (
                    <div className="text-xs text-muted-foreground">
                      Entrada: {sftpUnit.input}
                    </div>
                  )}
                  {sftpUnit.output && (
                    <div className="text-xs text-muted-foreground">
                      Salida: {sftpUnit.output}
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground">
                    Retorna output: {sftpUnit.return_output ? 'Sí' : 'No'}
                  </div>
                </div>
              </div>
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
      const chain = pipelineManager.buildPipelineChain(pipelineUnits);
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

      {/* Diálogo de detalles específicos por tipo */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedUnit && (() => {
                const runnerType = pipelineManager.detectRunnerType(selectedUnit);
                const config = runnerConfig[runnerType];
                const IconComponent = config.icon;
                return (
                  <>
                    <IconComponent className="h-5 w-5" style={{ color: config.color }} />
                    {config.label} - {selectedUnit.id.substring(0, 8)}...
                  </>
                );
              })()}
            </DialogTitle>
            <DialogDescription>
              Configuración detallada de la unidad de pipeline
            </DialogDescription>
          </DialogHeader>
          {selectedUnit && <PipelineUnitDetailsDialog unit={selectedUnit} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}