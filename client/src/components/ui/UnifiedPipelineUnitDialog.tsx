import { useState, useEffect } from "react";
import { executeQuery } from "@/lib/hasura-client";
import { COMMAND_QUERY, QUERY_QUEUE_QUERY, QUERY_DETAILS_QUERY, SFTP_DOWNLOADER_QUERY, SFTP_UPLOADER_QUERY, ZIP_QUERY, UNZIP_QUERY } from "@shared/queries";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle } from "lucide-react";

interface UnifiedPipelineUnitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  unitId: string | null;
  unitType: string | null;
}

export default function UnifiedPipelineUnitDialog({ 
  open, 
  onOpenChange, 
  unitId, 
  unitType 
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
    return unitType || 'Unit';
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
      } else if (unit.query_queue_id) {
        query = QUERY_QUEUE_QUERY;
        variables = { id: unit.query_queue_id };
      } else if (unit.sftp_downloader_id) {
        query = SFTP_DOWNLOADER_QUERY;
        variables = { id: unit.sftp_downloader_id };
      } else if (unit.sftp_uploader_id) {
        query = SFTP_UPLOADER_QUERY;
        variables = { id: unit.sftp_uploader_id };
      } else if (unit.zip_id) {
        query = ZIP_QUERY;
        variables = { id: unit.zip_id };
      } else if (unit.unzip_id) {
        query = UNZIP_QUERY;
        variables = { id: unit.unzip_id };
      }

      if (query) {
        const result = await executeQuery(query, variables);
        
        if (result.data) {
          // Extraer los datos según el tipo de consulta
          if (unit.command_id) {
            data = result.data.merlin_agent_Command?.[0];
          } else if (unit.query_queue_id) {
            data = result.data.merlin_agent_QueryQueue?.[0];
            // Para las consultas SQL, obtenemos detalles adicionales
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
            data = result.data.merlin_agent_SFTPDownloader?.[0];
          } else if (unit.sftp_uploader_id) {
            data = result.data.merlin_agent_SFTPUploader?.[0];
          } else if (unit.zip_id) {
            data = result.data.merlin_agent_Zip?.[0];
          } else if (unit.unzip_id) {
            data = result.data.merlin_agent_UnZip?.[0];
          }
          
          setUnitDetails({
            type,
            name: data?.name || type,
            description: data?.description || '',
            details: data
          });
        }
      }
    } catch (error) {
      console.error("Error fetching unit details:", error);
      setUnitDetails({
        type: unitType || 'Error',
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
    if (open && unitId) {
      setUnitDetails(null);
      
      // Crear un objeto unit mock para usar con la función existente
      const mockUnit: any = {};
      
      // Determinar qué campo ID establecer basado en el tipo
      if (unitType === 'Command') {
        mockUnit.command_id = unitId;
      } else if (unitType === 'SQL Query') {
        mockUnit.query_queue_id = unitId;
      } else if (unitType === 'SFTP Download') {
        mockUnit.sftp_downloader_id = unitId;
      } else if (unitType === 'SFTP Upload') {
        mockUnit.sftp_uploader_id = unitId;
      } else if (unitType === 'Zip Files') {
        mockUnit.zip_id = unitId;
      } else if (unitType === 'Unzip Files') {
        mockUnit.unzip_id = unitId;
      }
      
      fetchUnitDetails(mockUnit);
    }
  }, [open, unitId, unitType]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        {loading ? (
          <div className="py-8 space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : unitDetails ? (
          <>
            <DialogHeader>
              <DialogTitle>
                {unitDetails.name}
                <span className="text-xs ml-2 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded">
                  {unitDetails.type}
                </span>
              </DialogTitle>
              {unitDetails.description && (
                <DialogDescription>
                  {unitDetails.description}
                </DialogDescription>
              )}
            </DialogHeader>
            
            <div className="space-y-4">
              {/* SFTP Download */}
              {unitDetails.type === 'SFTP Download' && unitDetails.details && (
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Detalles de Descarga SFTP</h4>
                  <div className="bg-slate-50 dark:bg-slate-800 rounded-md p-3 text-xs">
                    <div><span className="text-sky-600 dark:text-sky-400 font-medium">Carpeta de destino:</span> {unitDetails.details.output || 'N/A'}</div>
                    {unitDetails.details.SFTPLink ? (
                      <div className="space-y-1">
                        <div><span className="text-sky-600 dark:text-sky-400 font-medium">Servidor SFTP:</span> {unitDetails.details.SFTPLink.name || unitDetails.details.SFTPLink.server || 'Sin especificar'}</div>
                        {unitDetails.details.SFTPLink.server && (
                          <div><span className="text-sky-600 dark:text-sky-400 font-medium">Dirección:</span> {unitDetails.details.SFTPLink.server}:{unitDetails.details.SFTPLink.port || 22}</div>
                        )}
                        {unitDetails.details.SFTPLink.user && (
                          <div><span className="text-sky-600 dark:text-sky-400 font-medium">Usuario:</span> {unitDetails.details.SFTPLink.user}</div>
                        )}
                      </div>
                    ) : (
                      <div><span className="text-sky-600 dark:text-sky-400 font-medium">Conector SFTP:</span> {unitDetails.details.sftp_link_id || 'N/A'}</div>
                    )}
                  </div>
                </div>
              )}
              
              {/* SFTP Upload */}
              {unitDetails.type === 'SFTP Upload' && unitDetails.details && (
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Detalles de Subida SFTP</h4>
                  <div className="bg-slate-50 dark:bg-slate-800 rounded-md p-3 text-xs">
                    <div><span className="text-sky-600 dark:text-sky-400 font-medium">Carpeta de origen:</span> {unitDetails.details.input || 'N/A'}</div>
                    {unitDetails.details.SFTPLink ? (
                      <div className="space-y-1">
                        <div><span className="text-sky-600 dark:text-sky-400 font-medium">Servidor SFTP:</span> {unitDetails.details.SFTPLink.name || unitDetails.details.SFTPLink.server || 'Sin especificar'}</div>
                        {unitDetails.details.SFTPLink.server && (
                          <div><span className="text-sky-600 dark:text-sky-400 font-medium">Dirección:</span> {unitDetails.details.SFTPLink.server}:{unitDetails.details.SFTPLink.port || 22}</div>
                        )}
                        {unitDetails.details.SFTPLink.user && (
                          <div><span className="text-sky-600 dark:text-sky-400 font-medium">Usuario:</span> {unitDetails.details.SFTPLink.user}</div>
                        )}
                      </div>
                    ) : (
                      <div><span className="text-sky-600 dark:text-sky-400 font-medium">Conector SFTP:</span> {unitDetails.details.sftp_link_id || 'N/A'}</div>
                    )}
                  </div>
                </div>
              )}

              {/* Command */}
              {unitDetails.type === 'Command' && unitDetails.details && (
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Detalles del Comando</h4>
                  <div className="bg-slate-50 dark:bg-slate-800 rounded-md p-3 text-xs font-mono">
                    <div><span className="text-sky-600 dark:text-sky-400">Objetivo:</span> {unitDetails.details.target || 'N/A'}</div>
                    <div><span className="text-sky-600 dark:text-sky-400">Directorio:</span> {unitDetails.details.working_directory || 'N/A'}</div>
                    <div><span className="text-sky-600 dark:text-sky-400">Argumentos:</span> {unitDetails.details.args || 'N/A'}</div>
                    {unitDetails.details.raw_script && (
                      <div className="mt-2">
                        <div className="text-sky-600 dark:text-sky-400">Script:</div>
                        <pre className="overflow-x-auto overflow-y-auto max-h-48 p-2 mt-1 bg-slate-100 dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-700">
                          {unitDetails.details.raw_script}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* SQL Query */}
              {unitDetails.type === 'SQL Query' && unitDetails.details && (
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Detalles de Consulta SQL</h4>
                  {unitDetails.details.Queries ? (
                    <div className="space-y-3">
                      {unitDetails.details.Queries.map((query: any) => (
                        <div key={query.id} className="bg-slate-50 dark:bg-slate-800 rounded-md p-3">
                          <div className="text-xs mb-1">
                            <span className="font-medium">{query.name}</span> 
                            {query.order && <span className="text-slate-500 ml-2">Orden: {query.order}</span>}
                          </div>
                          <pre className="overflow-x-auto overflow-y-auto max-h-48 text-xs font-mono p-2 bg-slate-100 dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-700">
                            {query.query_string}
                          </pre>
                          {query.path && (
                            <div className="mt-1 text-xs text-slate-500">
                              Ruta de salida: {query.path}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-24 bg-slate-50 dark:bg-slate-800 rounded-md">
                      <div className="text-slate-500 dark:text-slate-400 text-sm flex items-center">
                        <AlertCircle className="mr-2 h-4 w-4" />
                        No se pudieron cargar los detalles de las consultas
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {/* Zip Files */}
              {unitDetails.type === 'Zip Files' && unitDetails.details && (
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Detalles de Compresión</h4>
                  <div className="bg-slate-50 dark:bg-slate-800 rounded-md p-3 text-xs">
                    <div><span className="text-sky-600 dark:text-sky-400 font-medium">Archivo de salida:</span> {unitDetails.details.output || 'N/A'}</div>
                  </div>
                </div>
              )}
              
              {/* Unzip Files */}
              {unitDetails.type === 'Unzip Files' && unitDetails.details && (
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Detalles de Descompresión</h4>
                  <div className="bg-slate-50 dark:bg-slate-800 rounded-md p-3 text-xs">
                    <div><span className="text-sky-600 dark:text-sky-400 font-medium">Archivo de entrada:</span> {unitDetails.details.input || 'N/A'}</div>
                    <div><span className="text-sky-600 dark:text-sky-400 font-medium">Carpeta de salida:</span> {unitDetails.details.output || 'N/A'}</div>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="py-8 text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-slate-400 mb-4" />
            <p className="text-slate-500">No se pudieron cargar los detalles de la unidad</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}