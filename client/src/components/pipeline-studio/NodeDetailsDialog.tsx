import React, { useState, useEffect } from "react";
import { executeQuery } from "@/lib/hasura-client";
import { COMMAND_QUERY, QUERY_QUEUE_QUERY, QUERY_DETAILS_QUERY, SFTP_DOWNLOADER_QUERY, SFTP_UPLOADER_QUERY, ZIP_QUERY, UNZIP_QUERY, PIPELINE_QUERY } from "@shared/queries";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

interface NodeDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nodeId: string | null;
  nodes: any[];
}

// Componente de diálogo para mostrar detalles completos del nodo
export default function NodeDetailsDialog({ open, onOpenChange, nodeId, nodes }: NodeDetailsDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [nodeDetails, setNodeDetails] = useState<any>(null);
  
  // Función para obtener el tipo legible
  const getTypeReadableLabel = (type: string) => {
    switch (type) {
      case 'command': return 'Comando';
      case 'query': return 'Consulta SQL';
      case 'sftp_download': return 'Descarga SFTP';
      case 'sftp_upload': return 'Subida SFTP';
      case 'zip': return 'Compresión ZIP';
      case 'unzip': return 'Extracción ZIP';
      case 'pipeline': return 'Pipeline';
      default: return type;
    }
  };
  
  // Cargar detalles del nodo cuando cambia el ID seleccionado
  useEffect(() => {
    if (open && nodeId) {
      fetchNodeDetails(nodeId);
    } else {
      // Limpiar detalles cuando se cierra el diálogo
      setNodeDetails(null);
    }
  }, [open, nodeId]);
  
  // Función para obtener los detalles completos de un nodo
  const fetchNodeDetails = async (id: string) => {
    const selectedNodeData = nodes.find(node => node.id === id);
    if (!selectedNodeData) return;
    
    setLoading(true);
    
    try {
      const unitData = selectedNodeData.data.unit;
      let query = '';
      let variables = {};
      
      // Determinar qué tipo de unidad es y obtener los detalles
      if (unitData.command_id) {
        query = COMMAND_QUERY;
        variables = { id: unitData.command_id };
      } else if (unitData.query_queue_id) {
        query = QUERY_QUEUE_QUERY;
        variables = { id: unitData.query_queue_id };
      } else if (unitData.sftp_downloader_id) {
        query = SFTP_DOWNLOADER_QUERY;
        variables = { id: unitData.sftp_downloader_id };
      } else if (unitData.sftp_uploader_id) {
        query = SFTP_UPLOADER_QUERY;
        variables = { id: unitData.sftp_uploader_id };
      } else if (unitData.zip_id) {
        query = ZIP_QUERY;
        variables = { id: unitData.zip_id };
      } else if (unitData.unzip_id) {
        query = UNZIP_QUERY;
        variables = { id: unitData.unzip_id };
      } else if (unitData.call_pipeline) {
        // En caso de llamada a otro pipeline
        const result = await executeQuery(PIPELINE_QUERY, { id: unitData.call_pipeline });
        if (result.data && !result.errors) {
          setNodeDetails({
            type: 'pipeline',
            name: result.data.merlin_agent_Pipeline[0]?.name || 'Pipeline',
            description: result.data.merlin_agent_Pipeline[0]?.description || 'Llamada a otro pipeline',
            details: result.data.merlin_agent_Pipeline[0]
          });
        }
        setLoading(false);
        return;
      }
      
      if (query) {
        const result = await executeQuery(query, variables);
        if (result.data && !result.errors) {
          const nodeType = unitData.command_id ? 'command' : 
                          unitData.query_queue_id ? 'query' : 
                          unitData.sftp_downloader_id ? 'sftp_download' : 
                          unitData.sftp_uploader_id ? 'sftp_upload' : 
                          unitData.zip_id ? 'zip' : 
                          unitData.unzip_id ? 'unzip' : 'unknown';
                          
          // Determinar el objeto de datos según el tipo
          let detailsData = null;
          let name = '';
          let description = '';
          
          if (nodeType === 'command' && result.data.merlin_agent_Command) {
            detailsData = result.data.merlin_agent_Command[0];
            name = detailsData?.name || 'Comando';
            description = detailsData?.description || 'Ejecuta un comando en el sistema';
          } else if (nodeType === 'query' && result.data.merlin_agent_QueryQueue) {
            detailsData = result.data.merlin_agent_QueryQueue[0];
            name = detailsData?.name || 'Consulta SQL';
            description = detailsData?.description || 'Ejecuta una consulta en base de datos';
            
            // Obtener las consultas asociadas a la cola
            if (detailsData) {
              try {
                const queriesResult = await executeQuery(QUERY_DETAILS_QUERY, { query_queue_id: unitData.query_queue_id });
                if (queriesResult.data && queriesResult.data.merlin_agent_Query) {
                  // Agregar las consultas ordenadas al detalle
                  detailsData.queries = queriesResult.data.merlin_agent_Query.sort((a: any, b: any) => a.order - b.order);
                }
              } catch (error) {
                console.error('Error al cargar consultas:', error);
              }
            }
          } else if (nodeType === 'sftp_download' && result.data.merlin_agent_SFTPDownloader) {
            detailsData = result.data.merlin_agent_SFTPDownloader[0];
            name = 'Descarga SFTP';
            description = 'Descarga archivos desde un servidor SFTP';
          } else if (nodeType === 'sftp_upload' && result.data.merlin_agent_SFTPUploader) {
            detailsData = result.data.merlin_agent_SFTPUploader[0];
            name = 'Subida SFTP';
            description = 'Sube archivos a un servidor SFTP';
          } else if (nodeType === 'zip' && result.data.merlin_agent_Zip) {
            detailsData = result.data.merlin_agent_Zip[0];
            name = detailsData?.name || 'Compresión ZIP';
            description = 'Comprime archivos en formato ZIP';
          } else if (nodeType === 'unzip' && result.data.merlin_agent_UnZip) {
            detailsData = result.data.merlin_agent_UnZip[0];
            name = detailsData?.name || 'Extracción ZIP';
            description = 'Extrae archivos de formato ZIP';
          }
          
          setNodeDetails({
            type: nodeType,
            name,
            description,
            details: detailsData
          });
        }
      }
    } catch (error) {
      console.error('Error al cargar detalles del nodo:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los detalles del nodo',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <style dangerouslySetInnerHTML={{
          __html: `
          .node-details-dialog pre {
            white-space: pre-wrap;
            word-break: break-all;
            overflow-x: auto;
            max-width: 100%;
          }
          .node-details-dialog .bg-slate-50 {
            max-width: 100%;
            overflow-x: hidden;
          }
          `
        }} />
        {loading ? (
          <div className="py-8 space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : nodeDetails ? (
          <div className="node-details-dialog">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {nodeDetails.name}
                <span className="text-xs bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded-full">
                  {getTypeReadableLabel(nodeDetails.type)}
                </span>
              </DialogTitle>
              <DialogDescription>
                {nodeDetails.description}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-2">
              {/* Contenido específico basado en el tipo de nodo */}
              {nodeDetails.type === 'command' && nodeDetails.details && (
                <div className="space-y-3">
                  <div>
                    <h4 className="text-sm font-medium mb-1">Comando</h4>
                    <div className="bg-slate-50 dark:bg-slate-800 rounded-md p-3 text-xs font-mono border border-slate-200 dark:border-slate-700 break-words">
                      {nodeDetails.details.target} {nodeDetails.details.args}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium mb-1">Directorio de trabajo</h4>
                    <div className="bg-slate-50 dark:bg-slate-800 rounded-md p-3 text-xs break-words">
                      {nodeDetails.details.working_directory || 'Directorio por defecto'}
                    </div>
                  </div>
                  {nodeDetails.details.raw_script && (
                    <div>
                      <h4 className="text-sm font-medium mb-1">Script</h4>
                      <div className="bg-slate-50 dark:bg-slate-800 rounded-md p-3 text-xs font-mono border border-slate-200 dark:border-slate-700 max-h-40 overflow-y-auto break-words">
                        <pre className="whitespace-pre-wrap">{nodeDetails.details.raw_script}</pre>
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {nodeDetails.type === 'query' && nodeDetails.details && (
                <div className="space-y-3">
                  <div>
                    <h4 className="text-sm font-medium mb-1">Descripción</h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {nodeDetails.details.description || 'Sin descripción'}
                    </p>
                  </div>
                  <Separator />
                  {nodeDetails.details.queries && nodeDetails.details.queries.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-1">Consultas SQL</h4>
                      <div className="space-y-2">
                        {nodeDetails.details.queries.map((query: any, index: number) => (
                          <div key={index} className="bg-slate-50 dark:bg-slate-800 rounded-md p-3 text-xs font-mono border border-slate-200 dark:border-slate-700">
                            <div className="flex justify-between mb-1">
                              <span className="font-medium">{query.name || `Consulta ${index + 1}`}</span>
                              <span className="text-slate-500">{query.enabled ? 'Activa' : 'Inactiva'}</span>
                            </div>
                            <div className="mt-2 max-h-32 overflow-y-auto">
                              <pre className="whitespace-pre-wrap break-words">{query.query_string}</pre>
                            </div>
                            <div className="mt-1">
                              <span className="text-slate-500">Archivo: </span>
                              {query.path || 'No especificado'}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Si no hay consultas explícitas pero existe el objeto Queries */}
                  {!nodeDetails.details.queries && nodeDetails.details.Queries && nodeDetails.details.Queries.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-1">Consultas SQL</h4>
                      <div className="space-y-2">
                        {nodeDetails.details.Queries.map((query: any, index: number) => (
                          <div key={index} className="bg-slate-50 dark:bg-slate-800 rounded-md p-3 text-xs font-mono border border-slate-200 dark:border-slate-700">
                            <div className="flex justify-between mb-1">
                              <span className="font-medium">{query.name || `Consulta ${index + 1}`}</span>
                              <span className="text-slate-500">{query.enabled ? 'Activa' : 'Inactiva'}</span>
                            </div>
                            <div className="mt-2 max-h-32 overflow-y-auto">
                              <pre className="whitespace-pre-wrap break-words">{query.query_string}</pre>
                            </div>
                            <div className="mt-1">
                              <span className="text-slate-500">Archivo: </span>
                              {query.path || 'No especificado'}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {(nodeDetails.type === 'sftp_download' || nodeDetails.type === 'sftp_upload') && nodeDetails.details && (
                <div className="space-y-3">
                  <div>
                    <h4 className="text-sm font-medium mb-1">Servidor SFTP</h4>
                    {nodeDetails.details.sftp_link && (
                      <div className="bg-slate-50 dark:bg-slate-800 rounded-md p-3 text-xs">
                        <div><span className="font-medium">Servidor: </span>{nodeDetails.details.sftp_link.server}:{nodeDetails.details.sftp_link.port}</div>
                        <div><span className="font-medium">Usuario: </span>{nodeDetails.details.sftp_link.user}</div>
                      </div>
                    )}
                  </div>
                  <div>
                    <h4 className="text-sm font-medium mb-1">{nodeDetails.type === 'sftp_download' ? 'Ruta de salida' : 'Ruta de entrada'}</h4>
                    <div className="bg-slate-50 dark:bg-slate-800 rounded-md p-3 text-xs font-mono break-words">
                      {nodeDetails.type === 'sftp_download' ? nodeDetails.details.output : nodeDetails.details.input}
                    </div>
                  </div>
                </div>
              )}
              
              {(nodeDetails.type === 'zip' || nodeDetails.type === 'unzip') && nodeDetails.details && (
                <div className="space-y-3">
                  {nodeDetails.type === 'zip' ? (
                    <div>
                      <h4 className="text-sm font-medium mb-1">Ruta de salida (archivo ZIP)</h4>
                      <div className="bg-slate-50 dark:bg-slate-800 rounded-md p-3 text-xs font-mono break-words">
                        {nodeDetails.details.output}
                      </div>
                    </div>
                  ) : (
                    <>
                      <div>
                        <h4 className="text-sm font-medium mb-1">Archivo ZIP a extraer</h4>
                        <div className="bg-slate-50 dark:bg-slate-800 rounded-md p-3 text-xs font-mono break-words">
                          {nodeDetails.details.input}
                        </div>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium mb-1">Directorio de extracción</h4>
                        <div className="bg-slate-50 dark:bg-slate-800 rounded-md p-3 text-xs font-mono break-words">
                          {nodeDetails.details.output}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
              
              {nodeDetails.type === 'pipeline' && nodeDetails.details && (
                <div className="space-y-3">
                  <div>
                    <h4 className="text-sm font-medium mb-1">Pipeline llamado</h4>
                    <div className="bg-slate-50 dark:bg-slate-800 rounded-md p-3 border border-slate-200 dark:border-slate-700">
                      <p className="text-sm font-medium">{nodeDetails.details.name}</p>
                      <p className="text-xs text-slate-500 mt-1">{nodeDetails.details.description || 'Sin descripción'}</p>
                    </div>
                  </div>
                  <Separator />
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="font-medium">ID: </span>
                      <span className="font-mono">{nodeDetails.details.id.substring(0, 10)}...</span>
                    </div>
                    <div>
                      <span className="font-medium">Agente: </span>
                      <span>{nodeDetails.details.agent_passport_id?.substring(0, 10)}...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <DialogFooter>
              <Button onClick={() => onOpenChange(false)}>Cerrar</Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-slate-500">No se pudieron cargar los detalles del nodo</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}