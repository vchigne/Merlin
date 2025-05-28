import { useState, useEffect } from "react";
import { executeQuery } from "@/lib/hasura-client";
import { COMMAND_QUERY, QUERY_QUEUE_QUERY, QUERY_DETAILS_QUERY, SFTP_DOWNLOADER_QUERY, SFTP_UPLOADER_QUERY, ZIP_QUERY, UNZIP_QUERY } from "@shared/queries";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle } from "lucide-react";

interface UnifiedPipelineUnitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  unit: any;
}

export default function UnifiedPipelineUnitDialog({ 
  open, 
  onOpenChange, 
  unit 
}: UnifiedPipelineUnitDialogProps) {
  const [unitDetails, setUnitDetails] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Función para determinar el tipo de unidad basado en los campos disponibles
  const determineUnitType = (unit: any) => {
    if (!unit) return 'Unknown';
    if (unit.command_id) return 'Command';
    if (unit.query_queue_id) return 'SQL Query';
    if (unit.sftp_downloader_id) return 'SFTP Download';
    if (unit.sftp_uploader_id) return 'SFTP Upload';
    if (unit.zip_id) return 'Zip Files';
    if (unit.unzip_id) return 'Unzip Files';
    if (unit.call_pipeline) return 'Call Pipeline';
    return 'Unit';
  };

  // Función para obtener los detalles de la unidad
  const fetchUnitDetails = async (unit: any) => {
    if (!unit) return;

    setLoading(true);
    try {
      const type = determineUnitType(unit);
      let query = '';
      let variables = {};
      let data = null;

      // Determinar qué consulta usar basado en el tipo de unidad
      if (unit.command_id) {
        query = COMMAND_QUERY;
        variables = { id: unit.command_id };
        const result = await executeQuery(query, variables);
        data = result.data.merlin_agent_Command?.[0];
      } else if (unit.query_queue_id) {
        query = QUERY_QUEUE_QUERY;
        variables = { id: unit.query_queue_id };
        const result = await executeQuery(query, variables);
        data = result.data.merlin_agent_QueryQueue?.[0];
        
        // Si hay un QueryQueue, cargar las queries asociadas
        if (data) {
          try {
            const queriesResult = await executeQuery(QUERY_DETAILS_QUERY, { id: unit.query_queue_id });
            if (queriesResult.data?.merlin_agent_Query) {
              data.Queries = queriesResult.data.merlin_agent_Query.sort((a: any, b: any) => a.order - b.order);
            }
          } catch (error) {
            console.error("Error fetching SQL queries:", error);
          }
        }
      } else if (unit.sftp_downloader_id) {
        query = SFTP_DOWNLOADER_QUERY;
        variables = { id: unit.sftp_downloader_id };
        const result = await executeQuery(query, variables);
        data = result.data.merlin_agent_SFTPDownloader?.[0];
      } else if (unit.sftp_uploader_id) {
        query = SFTP_UPLOADER_QUERY;
        variables = { id: unit.sftp_uploader_id };
        const result = await executeQuery(query, variables);
        data = result.data.merlin_agent_SFTPUploader?.[0];
      } else if (unit.zip_id) {
        query = ZIP_QUERY;
        variables = { id: unit.zip_id };
        const result = await executeQuery(query, variables);
        data = result.data.merlin_agent_Zip?.[0];
      } else if (unit.unzip_id) {
        query = UNZIP_QUERY;
        variables = { id: unit.unzip_id };
        const result = await executeQuery(query, variables);
        data = result.data.merlin_agent_UnZip?.[0];
      }
      
      setUnitDetails({
        type,
        name: data?.name || type,
        description: data?.description || '',
        details: data
      });
    } catch (error) {
      console.error("Error fetching unit details:", error);
      setUnitDetails({
        type: determineUnitType(unit) || 'Error',
        name: 'Error',
        description: 'No se pudieron cargar los detalles',
        details: null
      });
    } finally {
      setLoading(false);
    }
  };

  // Efecto para cargar los detalles cuando se abre el diálogo
  useEffect(() => {
    if (open && unit) {
      fetchUnitDetails(unit);
    } else {
      setUnitDetails(null);
    }
  }, [open, unit]);

  // Función para renderizar el contenido específico por tipo
  const renderUnitContent = () => {
    if (!unitDetails?.details) return null;

    const { details, type } = unitDetails;

    switch (type) {
      case 'Command':
        return (
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Configuración del Comando</h4>
              <div className="space-y-2 text-sm">
                <div><span className="font-medium">Target:</span> {details.target}</div>
                {details.args && <div><span className="font-medium">Argumentos:</span> {details.args}</div>}
                {details.working_directory && <div><span className="font-medium">Directorio:</span> {details.working_directory}</div>}
                <div><span className="font-medium">Modo:</span> {details.instant ? 'Instantáneo' : 'Streaming'}</div>
                <div><span className="font-medium">Retornar Output:</span> {details.return_output ? 'Sí' : 'No'}</div>
                {details.return_output && details.return_output_type && (
                  <div><span className="font-medium">Tipo de Output:</span> {details.return_output_type}</div>
                )}
              </div>
              {details.raw_script && (
                <div className="mt-4">
                  <h5 className="font-medium mb-2">Script:</h5>
                  <pre className="bg-gray-100 dark:bg-gray-800 p-3 rounded text-xs max-h-48 overflow-y-auto">
                    {details.raw_script}
                  </pre>
                </div>
              )}
            </div>
          </div>
        );

      case 'SQL Query':
        return (
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Queries SQL</h4>
              {details.Queries?.length > 0 ? (
                <div className="space-y-3">
                  {details.Queries.map((query: any, index: number) => (
                    <div key={query.id} className="border rounded p-3">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium text-sm">Query {query.order}</span>
                        <span className="text-xs text-gray-500">{query.SQLConn?.name}</span>
                      </div>
                      <pre className="bg-gray-100 dark:bg-gray-800 p-2 rounded text-xs max-h-32 overflow-y-auto">
                        {query.statement}
                      </pre>
                      <div className="text-xs text-gray-600 mt-2">
                        <span>Archivo: {query.path}</span>
                        {query.separator && <span> | Separador: {query.separator}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No hay queries disponibles</p>
              )}
            </div>
          </div>
        );

      case 'SFTP Upload':
        return (
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Configuración SFTP Upload</h4>
              {details.SFTPLink && (
                <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded mb-3">
                  <div className="text-sm space-y-1">
                    <div><span className="font-medium">Servidor:</span> {details.SFTPLink.server}:{details.SFTPLink.port}</div>
                    <div><span className="font-medium">Usuario:</span> {details.SFTPLink.user}</div>
                    <div><span className="font-medium">Conexión:</span> {details.SFTPLink.name}</div>
                  </div>
                </div>
              )}
              {details.file_streams?.length > 0 ? (
                <div className="space-y-2">
                  <h5 className="font-medium text-sm">Archivos a Subir:</h5>
                  {details.file_streams.map((stream: any, index: number) => (
                    <div key={stream.id} className="border rounded p-2 text-sm">
                      <div><span className="font-medium">Origen:</span> {stream.input}</div>
                      <div><span className="font-medium">Destino:</span> {stream.output}</div>
                      <div><span className="font-medium">Retornar Output:</span> {stream.return_output ? 'Sí' : 'No'}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No hay archivos configurados</p>
              )}
            </div>
          </div>
        );

      case 'SFTP Download':
        return (
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Configuración SFTP Download</h4>
              {details.SFTPLink && (
                <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded mb-3">
                  <div className="text-sm space-y-1">
                    <div><span className="font-medium">Servidor:</span> {details.SFTPLink.server}:{details.SFTPLink.port}</div>
                    <div><span className="font-medium">Usuario:</span> {details.SFTPLink.user}</div>
                    <div><span className="font-medium">Conexión:</span> {details.SFTPLink.name}</div>
                  </div>
                </div>
              )}
              {details.file_streams?.length > 0 ? (
                <div className="space-y-2">
                  <h5 className="font-medium text-sm">Archivos a Descargar:</h5>
                  {details.file_streams.map((stream: any, index: number) => (
                    <div key={stream.id} className="border rounded p-2 text-sm">
                      <div><span className="font-medium">Origen:</span> {stream.input}</div>
                      <div><span className="font-medium">Destino:</span> {stream.output}</div>
                      <div><span className="font-medium">Retornar Output:</span> {stream.return_output ? 'Sí' : 'No'}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No hay archivos configurados</p>
              )}
            </div>
          </div>
        );

      case 'Zip Files':
        return (
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Configuración de Compresión</h4>
              <div className="text-sm mb-3">
                <div><span className="font-medium">Archivo ZIP:</span> {details.zip_name}</div>
              </div>
              {details.FileStreamZips?.length > 0 ? (
                <div className="space-y-2">
                  <h5 className="font-medium text-sm">Archivos a Comprimir:</h5>
                  {details.FileStreamZips.map((stream: any, index: number) => (
                    <div key={stream.id} className="border rounded p-2 text-sm">
                      <div><span className="font-medium">Entrada:</span> {stream.input}</div>
                      {stream.wildcard_exp && <div><span className="font-medium">Patrón:</span> {stream.wildcard_exp}</div>}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No hay archivos configurados</p>
              )}
            </div>
          </div>
        );

      case 'Unzip Files':
        return (
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Configuración de Descompresión</h4>
              {details.FileStreamUnzips?.length > 0 ? (
                <div className="space-y-2">
                  <h5 className="font-medium text-sm">Archivos a Descomprimir:</h5>
                  {details.FileStreamUnzips.map((stream: any, index: number) => (
                    <div key={stream.id} className="border rounded p-2 text-sm">
                      <div><span className="font-medium">Archivo ZIP:</span> {stream.input}</div>
                      <div><span className="font-medium">Destino:</span> {stream.output}</div>
                      <div><span className="font-medium">Retornar Output:</span> {stream.return_output ? 'Sí' : 'No'}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No hay archivos configurados</p>
              )}
            </div>
          </div>
        );

      default:
        return (
          <div className="text-center text-gray-500">
            <AlertCircle className="mx-auto mb-2" size={24} />
            <p>Tipo de unidad no reconocido</p>
          </div>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {unitDetails?.name || 'Cargando...'}
          </DialogTitle>
          <DialogDescription>
            {unitDetails?.description || 'Detalles de la unidad del pipeline'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : unitDetails ? (
            renderUnitContent()
          ) : (
            <div className="text-center text-gray-500 py-8">
              <AlertCircle className="mx-auto mb-2" size={24} />
              <p>No se pudieron cargar los detalles de la unidad</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}