import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle } from "lucide-react";

interface UnitDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loading: boolean;
  unitDetails: any;
  determineUnitType: (unit: any) => string;
}

// Componente reutilizable para mostrar detalles de unidades
export default function UnitDetailsDialog({ 
  open, 
  onOpenChange, 
  loading, 
  unitDetails, 
  determineUnitType 
}: UnitDetailsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <style dangerouslySetInnerHTML={{
          __html: `
          .unit-details-dialog pre {
            white-space: pre-wrap;
            word-break: break-all;
            overflow-x: auto;
            max-width: 100%;
          }
          .unit-details-dialog .bg-slate-50 {
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
        ) : unitDetails ? (
          <div className="unit-details-dialog">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {unitDetails.name}
                <span className="text-xs bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded-full">
                  {unitDetails.type}
                </span>
              </DialogTitle>
              <div className="text-sm text-slate-600 dark:text-slate-400">
                {unitDetails.description}
              </div>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              {/* Detalles específicos para Comandos */}
              {unitDetails.type === 'command' && (
                <>
                  {unitDetails.details?.target && (
                    <div>
                      <p className="text-sm font-medium mb-1">Objetivo:</p>
                      <p className="text-sm bg-slate-100 dark:bg-slate-700 p-2 rounded">{unitDetails.details.target}</p>
                    </div>
                  )}
                  
                  {unitDetails.details?.args && (
                    <div>
                      <p className="text-sm font-medium mb-1">Comando:</p>
                      <p className="text-sm bg-slate-100 dark:bg-slate-700 p-2 rounded font-mono">{unitDetails.details.args}</p>
                    </div>
                  )}
                  
                  {unitDetails.details?.raw_script && (
                    <div>
                      <p className="text-sm font-medium mb-1">Script:</p>
                      <div className="text-sm bg-slate-100 dark:bg-slate-700 p-2 rounded font-mono whitespace-pre overflow-auto max-h-32">
                        {unitDetails.details.raw_script}
                      </div>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-2 gap-2 text-xs mt-2">
                    <div>
                      <span className="font-medium">Instantáneo:</span> {unitDetails.details?.instant ? 'Sí' : 'No'}
                    </div>
                    <div>
                      <span className="font-medium">Retornar salida:</span> {unitDetails.details?.return_output ? 'Sí' : 'No'}
                    </div>
                    {unitDetails.details?.working_directory && (
                      <div className="col-span-2">
                        <span className="font-medium">Directorio de trabajo:</span> {unitDetails.details.working_directory}
                      </div>
                    )}
                    {unitDetails.details?.created_at && (
                      <>
                        <div>
                          <span className="font-medium">Creado:</span> {new Date(unitDetails.details.created_at).toLocaleString()}
                        </div>
                        <div>
                          <span className="font-medium">Actualizado:</span> {new Date(unitDetails.details.updated_at).toLocaleString()}
                        </div>
                      </>
                    )}
                  </div>
                </>
              )}
              
              {/* Detalles específicos para SQL Queries */}
              {unitDetails.type === 'query' && (
                <>
                  <div>
                    <p className="text-sm font-medium mb-1">ID de la cola de consultas:</p>
                    <p className="text-sm bg-slate-100 dark:bg-slate-700 p-2 rounded">{unitDetails.details?.id}</p>
                  </div>
                  
                  {/* Consultas relacionadas */}
                  {unitDetails.details?.Queries && unitDetails.details.Queries.length > 0 ? (
                    <div>
                      <p className="text-sm font-medium mb-1">Consultas ({unitDetails.details.Queries.length}):</p>
                      <div className="space-y-3">
                        {unitDetails.details.Queries.map((query: any, index: number) => (
                          <div key={query.id} className="bg-slate-100 dark:bg-slate-700 p-3 rounded-md">
                            <div className="flex justify-between items-center mb-2">
                              <p className="text-sm font-medium">Consulta {index + 1}: {query.name}</p>
                              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                                {query.sqlconn_id ? 'SQL Connection' : 'Query'}
                              </span>
                            </div>
                            
                            {/* SQL query string */}
                            <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-md border border-slate-200 dark:border-slate-700 text-xs font-mono mb-2 overflow-auto max-h-32 whitespace-pre">
                              {query.query_string}
                            </div>
                            
                            {/* Advertencia de seguridad */}
                            <div className="text-xs text-amber-600 dark:text-amber-400 mt-1 mb-2 flex items-center">
                              <AlertCircle className="h-4 w-4 mr-1" />
                              Modo solo lectura - No se ejecutará ni modificará esta consulta
                            </div>
                            
                            {/* Query metadata */}
                            <div className="grid grid-cols-2 gap-2 text-xs mt-2">
                              {query.path && (
                                <div className="col-span-2">
                                  <span className="font-medium">Path de salida:</span> {query.path}
                                </div>
                              )}
                              <div>
                                <span className="font-medium">Print headers:</span> {query.print_headers ? 'Sí' : 'No'}
                              </div>
                              <div>
                                <span className="font-medium">Habilitado:</span> {query.enabled ? 'Sí' : 'No'}
                              </div>
                              <div>
                                <span className="font-medium">Retornar salida:</span> {query.return_output ? 'Sí' : 'No'}
                              </div>
                              <div>
                                <span className="font-medium">Orden:</span> {query.order}
                              </div>
                              <div>
                                <span className="font-medium">Timeout:</span> {query.timeout ? `${query.timeout}ms` : 'N/A'}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-slate-600 dark:text-slate-400">
                      No hay consultas definidas en esta cola.
                    </div>
                  )}
                  
                  {unitDetails.details?.created_at && (
                    <div className="grid grid-cols-2 gap-2 text-xs mt-2">
                      <div>
                        <span className="font-medium">Creado:</span> {new Date(unitDetails.details.created_at).toLocaleString()}
                      </div>
                      <div>
                        <span className="font-medium">Actualizado:</span> {new Date(unitDetails.details.updated_at).toLocaleString()}
                      </div>
                    </div>
                  )}
                </>
              )}
              
              {/* Detalles específicos para SFTP Downloader */}
              {unitDetails.type === 'sftp_download' && (
                <>
                  <div>
                    <p className="text-sm font-medium mb-1">Output:</p>
                    <p className="text-sm bg-slate-100 dark:bg-slate-700 p-2 rounded">{unitDetails.details?.output}</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-xs mt-2">
                    <div>
                      <span className="font-medium">SFTP Link ID:</span> {unitDetails.details?.sftp_link_id}
                    </div>
                    <div>
                      <span className="font-medium">Retornar salida:</span> {unitDetails.details?.return_output ? 'Sí' : 'No'}
                    </div>
                  </div>
                </>
              )}
              
              {/* Detalles específicos para SFTP Uploader */}
              {unitDetails.type === 'sftp_upload' && (
                <>
                  <div>
                    <p className="text-sm font-medium mb-1">Input:</p>
                    <p className="text-sm bg-slate-100 dark:bg-slate-700 p-2 rounded">{unitDetails.details?.input}</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-xs mt-2">
                    <div>
                      <span className="font-medium">SFTP Link ID:</span> {unitDetails.details?.sftp_link_id}
                    </div>
                    <div>
                      <span className="font-medium">Retornar salida:</span> {unitDetails.details?.return_output ? 'Sí' : 'No'}
                    </div>
                  </div>
                </>
              )}
              
              {/* Detalles específicos para Zip Files */}
              {unitDetails.type === 'zip' && (
                <>
                  <div>
                    <p className="text-sm font-medium mb-1">Output:</p>
                    <p className="text-sm bg-slate-100 dark:bg-slate-700 p-2 rounded">{unitDetails.details?.output}</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-xs mt-2">
                    <div>
                      <span className="font-medium">Retornar salida:</span> {unitDetails.details?.return_output ? 'Sí' : 'No'}
                    </div>
                    {unitDetails.details?.created_at && (
                      <>
                        <div>
                          <span className="font-medium">Creado:</span> {new Date(unitDetails.details.created_at).toLocaleString()}
                        </div>
                        <div>
                          <span className="font-medium">Actualizado:</span> {new Date(unitDetails.details.updated_at).toLocaleString()}
                        </div>
                      </>
                    )}
                  </div>
                </>
              )}
              
              {/* Detalles específicos para Unzip Files */}
              {unitDetails.type === 'unzip' && (
                <>
                  <div>
                    <p className="text-sm font-medium mb-1">Input:</p>
                    <p className="text-sm bg-slate-100 dark:bg-slate-700 p-2 rounded">{unitDetails.details?.input}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium mb-1">Output:</p>
                    <p className="text-sm bg-slate-100 dark:bg-slate-700 p-2 rounded">{unitDetails.details?.output}</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-xs mt-2">
                    <div>
                      <span className="font-medium">Retornar salida:</span> {unitDetails.details?.return_output ? 'Sí' : 'No'}
                    </div>
                    {unitDetails.details?.created_at && (
                      <>
                        <div>
                          <span className="font-medium">Creado:</span> {new Date(unitDetails.details.created_at).toLocaleString()}
                        </div>
                        <div>
                          <span className="font-medium">Actualizado:</span> {new Date(unitDetails.details.updated_at).toLocaleString()}
                        </div>
                      </>
                    )}
                  </div>
                </>
              )}
              
              {/* Detalles específicos para Pipeline calls */}
              {unitDetails.type === 'pipeline' && (
                <>
                  <div>
                    <p className="text-sm font-medium mb-1">Pipeline llamado:</p>
                    <div className="bg-slate-50 dark:bg-slate-800 rounded-md p-3 border border-slate-200 dark:border-slate-700">
                      <p className="text-sm font-medium">{unitDetails.details?.name}</p>
                      <p className="text-xs text-slate-500 mt-1">{unitDetails.details?.description || 'Sin descripción'}</p>
                    </div>
                  </div>
                  <Separator />
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="font-medium">ID: </span>
                      <span className="font-mono">{unitDetails.details?.id?.substring(0, 10)}...</span>
                    </div>
                    <div>
                      <span className="font-medium">Agente: </span>
                      <span>{unitDetails.details?.agent_passport_id?.substring(0, 10)}...</span>
                    </div>
                  </div>
                </>
              )}
            </div>
            
            <DialogFooter>
              <Button onClick={() => onOpenChange(false)}>Cerrar</Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-slate-500">No se pudieron cargar los detalles</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}