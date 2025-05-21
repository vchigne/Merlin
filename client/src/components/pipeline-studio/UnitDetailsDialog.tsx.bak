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
                <div className="space-y-4">
                  {/* Encabezado con información principal */}
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-md font-semibold text-green-700 dark:text-green-400 flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="7 10 12 15 17 10" />
                          <line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                        {unitDetails.details?.name || 'Descarga SFTP'}
                      </h3>
                      <span className="px-2 py-1 text-xs rounded-full bg-green-100 dark:bg-green-800/50 text-green-700 dark:text-green-400 font-medium">
                        Descarga SFTP
                      </span>
                    </div>
                    <p className="text-sm text-green-700 dark:text-green-400 opacity-80 mb-3">
                      {unitDetails.details?.description || 'Proceso para descargar archivos desde un servidor SFTP remoto a una ubicación local'}
                    </p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                      <div className="space-y-1">
                        <span className="text-xs font-medium text-green-800 dark:text-green-300">ID del Proceso</span>
                        <p className="text-xs font-mono bg-green-100/50 dark:bg-green-900/50 p-1.5 rounded truncate" title={unitDetails.details?.id}>
                          {unitDetails.details?.id}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-xs font-medium text-green-800 dark:text-green-300">Retornar Resultado</span>
                        <p className="text-xs">
                          <span className={`px-2 py-0.5 rounded-full ${unitDetails.details?.return_output 
                            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' 
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-400'}`}>
                            {unitDetails.details?.return_output ? 'Sí' : 'No'}
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Separador */}
                  <Separator />
                  
                  {/* Sección de Conexión SFTP */}
                  <div>
                    <h3 className="text-sm font-semibold mb-3 flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
                        <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
                        <line x1="6" y1="6" x2="6.01" y2="6" />
                        <line x1="6" y1="18" x2="6.01" y2="18" />
                      </svg>
                      Conexión SFTP
                    </h3>
                    
                    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md p-3 mb-3">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">ID de Conexión:</span>
                        <span className="text-xs px-2 py-0.5 bg-amber-100 dark:bg-amber-800/50 rounded-full text-amber-700 dark:text-amber-400 font-mono">
                          {unitDetails.details?.sftp_link_id || 'No disponible'}
                        </span>
                      </div>
                      
                      {/* Detalles de la conexión SFTP */}
                      {unitDetails.details?.SFTPLink ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                          <div className="space-y-1">
                            <h5 className="font-medium text-amber-800 dark:text-amber-300">Nombre de Conexión</h5>
                            <p className="bg-white/60 dark:bg-black/20 p-1.5 rounded">
                              {unitDetails.details.SFTPLink.name}
                            </p>
                          </div>
                          <div className="space-y-1">
                            <h5 className="font-medium text-amber-800 dark:text-amber-300">Servidor</h5>
                            <div className="flex items-center gap-1">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-amber-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
                                <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
                                <line x1="6" y1="6" x2="6.01" y2="6" />
                                <line x1="6" y1="18" x2="6.01" y2="18" />
                              </svg>
                              <p className="bg-white/60 dark:bg-black/20 p-1.5 rounded flex-1">
                                {unitDetails.details.SFTPLink.server}
                              </p>
                            </div>
                          </div>
                          <div className="space-y-1">
                            <h5 className="font-medium text-amber-800 dark:text-amber-300">Puerto</h5>
                            <p className="bg-white/60 dark:bg-black/20 p-1.5 rounded">
                              {unitDetails.details.SFTPLink.port || 22}
                            </p>
                          </div>
                          <div className="space-y-1">
                            <h5 className="font-medium text-amber-800 dark:text-amber-300">Usuario</h5>
                            <div className="flex items-center gap-1">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-amber-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                <circle cx="12" cy="7" r="4" />
                              </svg>
                              <p className="bg-white/60 dark:bg-black/20 p-1.5 rounded flex-1">
                                {unitDetails.details.SFTPLink.user}
                              </p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-xs text-amber-600 dark:text-amber-400 flex items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="8" x2="12" y2="12" />
                            <line x1="12" y1="16" x2="12.01" y2="16" />
                          </svg>
                          Información completa de conexión no disponible
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Sección de Rutas */}
                  <div>
                    <h3 className="text-sm font-semibold mb-3 flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M2 9s1-1 4-1 5 2 8 2 4-1 4-1v10s-1 1-4 1-5-2-8-2-4 1-4 1z" />
                        <path d="M2 3v6" />
                        <path d="M22 3v6" />
                      </svg>
                      Configuración de Rutas
                    </h3>
                    
                    <div className="space-y-3">
                      {/* Ruta de origen (input) */}
                      <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-md border border-slate-200 dark:border-slate-700">
                        <div className="flex items-center mb-1">
                          <h4 className="text-xs font-medium text-blue-700 dark:text-blue-400 flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                              <polyline points="14 2 14 8 20 8" />
                            </svg>
                            Ruta de Archivo a Descargar (input)
                          </h4>
                        </div>
                        <div className="bg-white dark:bg-slate-900 p-2 rounded-md border border-slate-200 dark:border-slate-700 font-mono text-xs">
                          {unitDetails.details?.input || "No especificada"}
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          Ruta completa del archivo en el servidor SFTP que será descargado
                        </p>
                      </div>
                      
                      {/* Ruta de destino (output) */}
                      <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-md border border-slate-200 dark:border-slate-700">
                        <div className="flex items-center mb-1">
                          <h4 className="text-xs font-medium text-green-700 dark:text-green-400 flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                            </svg>
                            Ruta de Destino Local (output)
                          </h4>
                        </div>
                        <div className="bg-white dark:bg-slate-900 p-2 rounded-md border border-slate-200 dark:border-slate-700 font-mono text-xs">
                          {unitDetails.details?.output || "No especificada"}
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          Ruta local donde será guardado el archivo descargado
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Sección de Etiquetas */}
                  {unitDetails.details?.labels && unitDetails.details?.labels.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold mb-2 flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-violet-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                          <line x1="7" y1="7" x2="7.01" y2="7" />
                        </svg>
                        Etiquetas
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {unitDetails.details.labels.map((label: string, index: number) => (
                          <span key={index} className="text-xs px-2 py-1 rounded-full bg-violet-100 dark:bg-violet-900/20 text-violet-700 dark:text-violet-400">
                            {label}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Sección de Información Adicional */}
                  <div>
                    <Separator className="my-3" />
                    <h3 className="text-sm font-semibold mb-2 flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="16" x2="12" y2="12" />
                        <line x1="12" y1="8" x2="12.01" y2="8" />
                      </svg>
                      Información Adicional
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      {unitDetails.details?.created_at && (
                        <div className="space-y-1">
                          <span className="font-medium text-slate-700 dark:text-slate-300">Fecha de Creación</span>
                          <p className="text-slate-600 dark:text-slate-400">
                            {new Date(unitDetails.details.created_at).toLocaleString()}
                          </p>
                        </div>
                      )}
                      {unitDetails.details?.updated_at && (
                        <div className="space-y-1">
                          <span className="font-medium text-slate-700 dark:text-slate-300">Última Actualización</span>
                          <p className="text-slate-600 dark:text-slate-400">
                            {new Date(unitDetails.details.updated_at).toLocaleString()}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
              
              {/* Detalles específicos para SFTP Uploader */}
              {unitDetails.type === 'sftp_upload' && (
                <div className="space-y-4">
                  {/* Panel de depuración (temporal) */}
                  <details className="p-2 bg-gray-100 dark:bg-gray-800 rounded-md text-xs">
                    <summary className="cursor-pointer font-medium text-blue-600 dark:text-blue-400">Datos de Debug (click para expandir)</summary>
                    <div className="mt-2 p-2 font-mono overflow-auto max-h-40">
                      <p>Tipo: {unitDetails.type}</p>
                      <p>sftp_link_id: {unitDetails.details?.sftp_link_id}</p>
                      <p>SFTPLink presente: {unitDetails.details?.SFTPLink ? 'Sí' : 'No'}</p>
                      <pre className="text-xs overflow-auto mt-2 p-2 bg-slate-200 dark:bg-slate-900 rounded">
                        {JSON.stringify(unitDetails.details, null, 2)}
                      </pre>
                    </div>
                  </details>
                  
                  {/* Encabezado con información principal */}
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-md font-semibold text-blue-700 dark:text-blue-400 flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="17 8 12 3 7 8" />
                          <line x1="12" y1="3" x2="12" y2="15" />
                        </svg>
                        {unitDetails.details?.name || 'Subida SFTP'}
                      </h3>
                      <span className="px-2 py-1 text-xs rounded-full bg-orange-100 dark:bg-orange-800/50 text-orange-700 dark:text-orange-400 font-medium">
                        Subida SFTP
                      </span>
                    </div>
                    <p className="text-sm text-orange-700 dark:text-orange-400 opacity-80 mb-3">
                      {unitDetails.details?.description || 'Proceso para subir archivos desde una ubicación local a un servidor SFTP remoto'}
                    </p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                      <div className="space-y-1">
                        <span className="text-xs font-medium text-orange-800 dark:text-orange-300">ID del Proceso</span>
                        <p className="text-xs font-mono bg-orange-100/50 dark:bg-orange-900/50 p-1.5 rounded truncate" title={unitDetails.details?.id}>
                          {unitDetails.details?.id}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-xs font-medium text-orange-800 dark:text-orange-300">Retornar Resultado</span>
                        <p className="text-xs">
                          <span className={`px-2 py-0.5 rounded-full ${unitDetails.details?.return_output 
                            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' 
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-400'}`}>
                            {unitDetails.details?.return_output ? 'Sí' : 'No'}
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Separador */}
                  <Separator />
                  
                  {/* Sección de Conexión SFTP */}
                  <div>
                    <h3 className="text-sm font-semibold mb-3 flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
                        <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
                        <line x1="6" y1="6" x2="6.01" y2="6" />
                        <line x1="6" y1="18" x2="6.01" y2="18" />
                      </svg>
                      Conexión SFTP
                    </h3>
                    
                    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md p-3 mb-3">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">ID de Conexión:</span>
                        <span className="text-xs px-2 py-0.5 bg-amber-100 dark:bg-amber-800/50 rounded-full text-amber-700 dark:text-amber-400 font-mono">
                          {unitDetails.details?.sftp_link_id || 'No disponible'}
                        </span>
                      </div>
                      
                      {/* Detalles de la conexión SFTP - con acceso seguro a propiedades anidadas */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs mt-2">
                          <div className="space-y-1">
                            <h5 className="font-medium text-amber-800 dark:text-amber-300">Nombre de Conexión</h5>
                            <p className="bg-white/60 dark:bg-black/20 p-1.5 rounded">
                              {(unitDetails.details?.SFTPLink?.name) || "Sin especificar"}
                            </p>
                          </div>
                          <div className="space-y-1">
                            <h5 className="font-medium text-amber-800 dark:text-amber-300">Servidor</h5>
                            <div className="flex items-center gap-1">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-amber-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
                                <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
                                <line x1="6" y1="6" x2="6.01" y2="6" />
                                <line x1="6" y1="18" x2="6.01" y2="18" />
                              </svg>
                              <p className="bg-white/60 dark:bg-black/20 p-1.5 rounded flex-1">
                                {(unitDetails.details?.SFTPLink?.server) || "Sin especificar"}
                              </p>
                            </div>
                          </div>
                          <div className="space-y-1">
                            <h5 className="font-medium text-amber-800 dark:text-amber-300">Puerto</h5>
                            <p className="bg-white/60 dark:bg-black/20 p-1.5 rounded">
                              {(unitDetails.details?.SFTPLink?.port) || "22 (predeterminado)"}
                            </p>
                          </div>
                          <div className="space-y-1">
                            <h5 className="font-medium text-amber-800 dark:text-amber-300">Usuario</h5>
                            <div className="flex items-center gap-1">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-amber-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                <circle cx="12" cy="7" r="4" />
                              </svg>
                              <p className="bg-white/60 dark:bg-black/20 p-1.5 rounded flex-1">
                                {(unitDetails.details?.SFTPLink?.user) || "Sin especificar"}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="text-xs text-amber-600 dark:text-amber-400 flex items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="8" x2="12" y2="12" />
                            <line x1="12" y1="16" x2="12.01" y2="16" />
                          </svg>
                          Información completa de conexión no disponible
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Sección de Rutas */}
                  <div>
                    <h3 className="text-sm font-semibold mb-3 flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M2 9s1-1 4-1 5 2 8 2 4-1 4-1v10s-1 1-4 1-5-2-8-2-4 1-4 1z" />
                        <path d="M2 3v6" />
                        <path d="M22 3v6" />
                      </svg>
                      Configuración de Rutas
                    </h3>
                    
                    <div className="space-y-3">
                      {/* Ruta de origen (input) */}
                      <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-md border border-slate-200 dark:border-slate-700">
                        <div className="flex items-center mb-1">
                          <h4 className="text-xs font-medium text-blue-700 dark:text-blue-400 flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                            </svg>
                            Ruta de Archivo Local (input)
                          </h4>
                        </div>
                        <div className="bg-white dark:bg-slate-900 p-2 rounded-md border border-slate-200 dark:border-slate-700 font-mono text-xs">
                          {unitDetails.details?.input || "No especificada"}
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          Ruta local del archivo que será subido al servidor SFTP
                        </p>
                      </div>
                      
                      {/* Ruta de destino (output) */}
                      <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-md border border-slate-200 dark:border-slate-700">
                        <div className="flex items-center mb-1">
                          <h4 className="text-xs font-medium text-orange-700 dark:text-orange-400 flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-orange-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                              <polyline points="14 2 14 8 20 8" />
                            </svg>
                            Ruta de Destino en SFTP (output)
                          </h4>
                        </div>
                        <div className="bg-white dark:bg-slate-900 p-2 rounded-md border border-slate-200 dark:border-slate-700 font-mono text-xs">
                          {unitDetails.details?.output || "No especificada"}
                        </div>
                        
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          Ruta en el servidor SFTP donde será guardado el archivo
                        </p>
                      </div>
                      
                      {/* Panel de diagnóstico SFTP */}
                      <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-md border border-amber-200 dark:border-amber-800">
                        <h4 className="text-sm font-medium text-amber-800 dark:text-amber-300 mb-2">Diagnóstico SFTP</h4>
                        <div className="space-y-2">
                          <div className="bg-white/80 dark:bg-slate-800/80 p-2 rounded">
                            <span className="font-medium">Campo output:</span> {unitDetails.details?.output ? `"${unitDetails.details.output}"` : "No presente"}
                          </div>
                          <div className="bg-white/80 dark:bg-slate-800/80 p-2 rounded">
                            <span className="font-medium">Campos disponibles:</span> {Object.keys(unitDetails.details || {}).join(", ") || "Ninguno"}
                          </div>
                          <div className="bg-white/80 dark:bg-slate-800/80 p-2 rounded">
                            <span className="font-medium">JSON completo:</span>
                            <pre className="mt-1 text-xs overflow-auto max-h-40 p-2 bg-slate-100 dark:bg-slate-900 rounded">
                              {JSON.stringify(unitDetails.details, null, 2) || "{}"}
                            </pre>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Sección de Etiquetas */}
                  {unitDetails.details?.labels && unitDetails.details?.labels.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold mb-2 flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-violet-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                          <line x1="7" y1="7" x2="7.01" y2="7" />
                        </svg>
                        Etiquetas
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {unitDetails.details.labels.map((label: string, index: number) => (
                          <span key={index} className="text-xs px-2 py-1 rounded-full bg-violet-100 dark:bg-violet-900/20 text-violet-700 dark:text-violet-400">
                            {label}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Sección de Información Adicional */}
                  <div>
                    <Separator className="my-3" />
                    <h3 className="text-sm font-semibold mb-2 flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="16" x2="12" y2="12" />
                        <line x1="12" y1="8" x2="12.01" y2="8" />
                      </svg>
                      Información Adicional
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      {unitDetails.details?.created_at && (
                        <div className="space-y-1">
                          <span className="font-medium text-slate-700 dark:text-slate-300">Fecha de Creación</span>
                          <p className="text-slate-600 dark:text-slate-400">
                            {new Date(unitDetails.details.created_at).toLocaleString()}
                          </p>
                        </div>
                      )}
                      {unitDetails.details?.updated_at && (
                        <div className="space-y-1">
                          <span className="font-medium text-slate-700 dark:text-slate-300">Última Actualización</span>
                          <p className="text-slate-600 dark:text-slate-400">
                            {new Date(unitDetails.details.updated_at).toLocaleString()}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
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