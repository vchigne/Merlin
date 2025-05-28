import { Badge } from "@/components/ui/badge";
import { AlertCircle } from "lucide-react";
import { 
  pipelineManager, 
  type PipelineUnit, 
  type RunnerType 
} from "@/lib/pipeline-manager";

interface PipelineUnitDetailsDialogProps {
  unit: PipelineUnit;
}

export function PipelineUnitDetailsDialog({ unit }: PipelineUnitDetailsDialogProps) {
  const runnerType = pipelineManager.detectRunnerType(unit);

  const renderSpecificDetails = () => {
    switch(runnerType) {
      case "Command":
        const cmd = unit.Command;
        return cmd ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-semibold text-primary">Ejecutable:</label>
                <p className="text-sm bg-muted p-2 rounded font-mono">{cmd.target}</p>
              </div>
              <div>
                <label className="text-sm font-semibold text-primary">Modo de ejecución:</label>
                <Badge variant={cmd.instant ? "default" : "secondary"}>
                  {cmd.instant ? "Instantáneo" : "Streaming"}
                </Badge>
              </div>
            </div>
            
            {cmd.args && (
              <div>
                <label className="text-sm font-semibold text-primary">Argumentos:</label>
                <p className="text-sm bg-muted p-2 rounded font-mono">{cmd.args}</p>
              </div>
            )}
            
            {cmd.working_directory && (
              <div>
                <label className="text-sm font-semibold text-primary">Directorio de trabajo:</label>
                <p className="text-sm bg-muted p-2 rounded font-mono">{cmd.working_directory}</p>
              </div>
            )}
            
            {cmd.raw_script && (
              <div>
                <label className="text-sm font-semibold text-primary">Script:</label>
                <div className="text-xs bg-muted p-3 rounded font-mono max-h-32 overflow-y-auto">
                  {cmd.raw_script}
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <label className="text-sm font-semibold text-primary">Salida:</label>
                <Badge variant={cmd.return_output ? "default" : "outline"}>
                  {cmd.return_output ? "Capturada" : "Ignorada"}
                </Badge>
              </div>
              {cmd.return_output && (
                <div>
                  <label className="text-sm font-semibold text-primary">Tipo:</label>
                  <Badge variant="secondary">{cmd.return_output_type}</Badge>
                </div>
              )}
            </div>
          </div>
        ) : null;

      case "QueryQueue":
        const queue = unit.QueryQueue;
        return queue?.Queries ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-primary">Cola de Consultas SQL</h4>
              <Badge>{queue.Queries.length} consultas</Badge>
            </div>
            
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {queue.Queries.map((query: any, index: number) => (
                <div key={query.id} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline">Orden {query.order}</Badge>
                    {query.SQLConn && (
                      <Badge variant="secondary">{query.SQLConn.driver}</Badge>
                    )}
                  </div>
                  
                  <div>
                    <label className="text-xs font-semibold text-primary">Consulta SQL:</label>
                    <div className="text-xs bg-muted p-2 rounded font-mono max-h-20 overflow-y-auto">
                      {query.statement}
                    </div>
                  </div>
                  
                  {query.path && (
                    <div>
                      <label className="text-xs font-semibold text-primary">Archivo de salida:</label>
                      <p className="text-xs bg-muted p-1 rounded font-mono">{query.path}</p>
                    </div>
                  )}
                  
                  <div className="flex flex-wrap gap-1">
                    {query.return_output && <Badge variant="outline" className="text-xs">Retorna salida</Badge>}
                    {query.print_headers && <Badge variant="outline" className="text-xs">Con headers</Badge>}
                    {query.trim_columns && <Badge variant="outline" className="text-xs">Trimmed</Badge>}
                    {query.chunks > 1 && <Badge variant="outline" className="text-xs">{query.chunks} chunks</Badge>}
                  </div>
                  
                  {query.SQLConn && (
                    <div className="text-xs text-muted-foreground">
                      <strong>Conexión:</strong> {query.SQLConn.name}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : null;

      case "SFTPDownloader":
        const downloader = unit.SFTPDownloader;
        return downloader ? (
          <div className="space-y-4">
            <div className="border-b pb-3">
              <h4 className="text-sm font-semibold text-primary mb-2">Descarga SFTP</h4>
              {downloader.SFTPLink && (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-primary">Conector SFTP:</label>
                    <p className="text-lg font-semibold text-primary">{downloader.SFTPLink.name}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-primary">Servidor:</label>
                      <p className="text-sm bg-muted p-2 rounded font-mono">
                        {downloader.SFTPLink.server}:{downloader.SFTPLink.port}
                      </p>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-primary">Usuario:</label>
                      <p className="text-sm bg-muted p-2 rounded font-mono">{downloader.SFTPLink.user}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {downloader.FileStreamSftpDownloaders && downloader.FileStreamSftpDownloaders.length > 0 && (
              <div>
                <label className="text-sm font-semibold text-primary">Archivos a descargar:</label>
                <div className="space-y-2 mt-2">
                  {downloader.FileStreamSftpDownloaders.map((file: any) => (
                    <div key={file.id} className="border rounded p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono">{file.input}</span>
                        <span className="text-xs text-muted-foreground">→</span>
                        <span className="text-xs font-mono">{file.output}</span>
                      </div>
                      {file.return_output && (
                        <Badge variant="secondary" className="text-xs">Retorna salida</Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : null;

      case "SFTPUploader":
        const uploader = unit.SFTPUploader;
        return uploader ? (
          <div className="space-y-4">
            <div className="border-b pb-3">
              <h4 className="text-sm font-semibold text-primary mb-2">Subida SFTP</h4>
              {uploader.SFTPLink && (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-primary">Conector SFTP:</label>
                    <p className="text-lg font-semibold text-primary">{uploader.SFTPLink.name}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-primary">Servidor:</label>
                      <p className="text-sm bg-muted p-2 rounded font-mono">
                        {uploader.SFTPLink.server}:{uploader.SFTPLink.port}
                      </p>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-primary">Usuario:</label>
                      <p className="text-sm bg-muted p-2 rounded font-mono">{uploader.SFTPLink.user}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {uploader.FileStreamSftpUploaders && uploader.FileStreamSftpUploaders.length > 0 && (
              <div>
                <label className="text-sm font-semibold text-primary">Archivos a subir:</label>
                <div className="space-y-2 mt-2">
                  {uploader.FileStreamSftpUploaders.map((file: any) => (
                    <div key={file.id} className="border rounded p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono">{file.input}</span>
                        <span className="text-xs text-muted-foreground">→</span>
                        <span className="text-xs font-mono">{file.output}</span>
                      </div>
                      {file.return_output && (
                        <Badge variant="secondary" className="text-xs">Retorna salida</Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : null;

      case "Zip":
        const zip = unit.Zip;
        return zip ? (
          <div className="space-y-4">
            <div className="border-b pb-3">
              <h4 className="text-sm font-semibold text-primary mb-2">Compresión ZIP</h4>
              <div>
                <label className="text-xs font-semibold text-primary">Archivo destino:</label>
                <p className="text-sm bg-muted p-2 rounded font-mono">{zip.zip_name}</p>
              </div>
            </div>
            
            {zip.FileStreamZips && zip.FileStreamZips.length > 0 && (
              <div>
                <label className="text-sm font-semibold text-primary">Archivos a comprimir:</label>
                <div className="space-y-2 mt-2">
                  {zip.FileStreamZips.map((file: any) => (
                    <div key={file.id} className="border rounded p-3">
                      <div className="text-xs font-mono">{file.input}</div>
                      {file.wildcard_exp && (
                        <div className="text-xs text-muted-foreground mt-1">
                          <strong>Patrón:</strong> {file.wildcard_exp}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : null;

      case "Unzip":
        const unzip = unit.Unzip;
        return unzip?.FileStreamUnzips ? (
          <div className="space-y-4">
            <div className="border-b pb-3">
              <h4 className="text-sm font-semibold text-primary mb-2">Descompresión</h4>
              <Badge>{unzip.FileStreamUnzips.length} archivos</Badge>
            </div>
            
            <div>
              <label className="text-sm font-semibold text-primary">Archivos a descomprimir:</label>
              <div className="space-y-2 mt-2">
                {unzip.FileStreamUnzips.map((file: any) => (
                  <div key={file.id} className="border rounded p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono">{file.input}</span>
                      <span className="text-xs text-muted-foreground">→</span>
                      <span className="text-xs font-mono">{file.output}</span>
                    </div>
                    {file.return_output && (
                      <Badge variant="secondary" className="text-xs">Retorna salida</Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null;

      case "CallPipeline":
        const pipeline = unit.CallPipeline;
        return pipeline?.Pipeline ? (
          <div className="space-y-4">
            <div className="border-b pb-3">
              <h4 className="text-sm font-semibold text-primary mb-2">Llamada a Pipeline</h4>
              <div>
                <label className="text-xs font-semibold text-primary">Pipeline:</label>
                <p className="text-lg font-semibold">{pipeline.Pipeline.name}</p>
              </div>
            </div>
            
            {pipeline.Pipeline.description && (
              <div>
                <label className="text-sm font-semibold text-primary">Descripción:</label>
                <p className="text-sm bg-muted p-3 rounded">{pipeline.Pipeline.description}</p>
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-semibold text-primary">Timeout:</label>
                <p className="text-sm bg-muted p-2 rounded">{pipeline.timeout_milliseconds} ms</p>
              </div>
              <div>
                <label className="text-sm font-semibold text-primary">ID Pipeline:</label>
                <p className="text-xs bg-muted p-2 rounded font-mono">{pipeline.pipeline_id}</p>
              </div>
            </div>
          </div>
        ) : null;

      default:
        return (
          <div className="text-center text-muted-foreground p-8">
            <AlertCircle className="h-8 w-8 mx-auto mb-2" />
            <p>Tipo de unidad no reconocido</p>
          </div>
        );
    }
  };

  return (
    <div className="max-h-96 overflow-y-auto">
      {renderSpecificDetails()}
      
      {/* Configuración de retry y timeout */}
      <div className="mt-6 pt-4 border-t space-y-3">
        <h4 className="text-sm font-semibold text-primary">Configuración de Ejecución</h4>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-xs font-semibold text-primary">Reintentos:</label>
            <p className="text-sm bg-muted p-1 rounded text-center">{unit.retry_count}</p>
          </div>
          <div>
            <label className="text-xs font-semibold text-primary">Intervalo:</label>
            <p className="text-sm bg-muted p-1 rounded text-center">{unit.retry_after_milliseconds}ms</p>
          </div>
          <div>
            <label className="text-xs font-semibold text-primary">Timeout:</label>
            <p className="text-sm bg-muted p-1 rounded text-center">{unit.timeout_milliseconds}ms</p>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {unit.continue_on_error && (
            <Badge variant="outline" className="text-xs">Continua en error</Badge>
          )}
          {unit.abort_on_error && (
            <Badge variant="destructive" className="text-xs">Aborta en error</Badge>
          )}
          {unit.abort_on_timeout && (
            <Badge variant="destructive" className="text-xs">Aborta en timeout</Badge>
          )}
        </div>
      </div>
    </div>
  );
}