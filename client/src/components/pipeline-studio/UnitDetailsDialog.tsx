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
  
  // Función genérica para obtener valores de un nodo anidado - examina todos los niveles posibles
  const getNestedValue = (obj: any, paths: string[]): any => {
    if (!obj) return null;
    
    // Probar cada ruta posible
    for (const path of paths) {
      const parts = path.split('.');
      let current = obj;
      let found = true;
      
      // Navegar por cada parte de la ruta
      for (const part of parts) {
        if (current[part] === undefined) {
          found = false;
          break;
        }
        current = current[part];
      }
      
      if (found && current !== null && current !== undefined) {
        return current;
      }
    }
    
    return null;
  };
  
  // Funciones específicas para obtener valores en cualquier estructura de nodo SFTP
  const getSFTPOutput = () => {
    return getNestedValue(unitDetails, [
      'details.output',
      'details.SFTPUploader.output',
      'details.SFTPDownloader.output'
    ]);
  };
  
  const getSFTPInput = () => {
    return getNestedValue(unitDetails, [
      'details.input',
      'details.SFTPUploader.input',
      'details.SFTPDownloader.input'
    ]);
  };
  
  const getSFTPLinkId = () => {
    return getNestedValue(unitDetails, [
      'details.sftp_link_id',
      'details.SFTPUploader.sftp_link_id',
      'details.SFTPDownloader.sftp_link_id'
    ]);
  };
  
  const getSFTPLinkData = () => {
    return getNestedValue(unitDetails, [
      'details.SFTPLink',
      'details.SFTPUploader.SFTPLink',
      'details.SFTPDownloader.SFTPLink'
    ]);
  };
  
  // Función para determinar si este es un nodo de tipo SFTP
  const isSFTPNode = () => {
    if (!unitDetails) return false;
    
    // Verificar el tipo explícito usando la regla fundamental
    if (unitDetails.type) {
      const type = unitDetails.type.toLowerCase();
      if (type === 'sftp_download' || type === 'sftp_upload') return true;
    }
    
    // Método alternativo: verificar si los campos específicos de SFTP existen
    // Esta validación respeta la regla de que solo un campo ID tiene valor
    if (unitDetails.details) {
      if (unitDetails.details.sftp_downloader_id || 
          unitDetails.details.sftp_uploader_id) return true;
    }
    
    // Verificar campos relacionados con SFTP
    if (getSFTPLinkId() || getSFTPLinkData()) return true;
    
    return false;
  };

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
              {/* Detalles para nodos SFTP */}
              {isSFTPNode() && (
                <div className="space-y-4">
                  {/* Sección de Rutas SFTP - Ruta de salida */}
                  {getSFTPOutput() && (
                    <div>
                      <h3 className="text-sm font-semibold mb-3 flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-orange-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                        </svg>
                        Ruta de Destino SFTP
                      </h3>
                      
                      <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-md p-3 mb-3">
                        {/* Directorio de Destino */}
                        <div className="mb-1">
                          <div className="bg-white/70 dark:bg-black/30 p-3 rounded font-mono text-sm text-orange-700 dark:text-orange-300 font-medium">
                            {getSFTPOutput() || 'Sin especificar'}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Ruta de entrada, si está disponible */}
                  {getSFTPInput() && (
                    <div>
                      <h3 className="text-sm font-semibold mb-3 flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                        </svg>
                        Ruta de Origen
                      </h3>
                      
                      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md p-3 mb-3">
                        <div className="mb-1">
                          <div className="bg-white/70 dark:bg-black/30 p-3 rounded font-mono text-sm text-green-700 dark:text-green-300 font-medium">
                            {getSFTPInput() || 'Sin especificar'}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Separador si hay rutas */}
                  {(getSFTPOutput() || getSFTPInput()) && (
                    <Separator />
                  )}
                  
                  {/* Sección de Conexión SFTP */}
                  {(getSFTPLinkId() || getSFTPLinkData()) && (
                    <div>
                      <h3 className="text-sm font-semibold mb-3 flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
                          <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
                          <line x1="6" y1="6" x2="6.01" y2="6" />
                          <line x1="6" y1="18" x2="6.01" y2="18" />
                        </svg>
                        Conexión SFTP
                      </h3>
                      
                      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-3 mb-3">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-semibold text-blue-700 dark:text-blue-400">ID de Conexión:</span>
                          <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-800/50 rounded-full text-blue-700 dark:text-blue-400 font-mono">
                            {getSFTPLinkId() || 'No disponible'}
                          </span>
                        </div>
                        
                        {/* Detalles de la conexión SFTP */}
                        {getSFTPLinkData() && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs mt-2">
                            {/* Nombre de la conexión */}
                            <div className="space-y-1">
                              <h5 className="font-medium text-blue-800 dark:text-blue-300">Nombre de Conexión</h5>
                              <p className="bg-white/60 dark:bg-black/20 p-1.5 rounded">
                                {getSFTPLinkData().name || "Sin especificar"}
                              </p>
                            </div>
                            
                            {/* Servidor */}
                            <div className="space-y-1">
                              <h5 className="font-medium text-blue-800 dark:text-blue-300">Servidor</h5>
                              <div className="flex items-center gap-1">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
                                  <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
                                  <line x1="6" y1="6" x2="6.01" y2="6" />
                                  <line x1="6" y1="18" x2="6.01" y2="18" />
                                </svg>
                                <p className="bg-white/60 dark:bg-black/20 p-1.5 rounded flex-1">
                                  {getSFTPLinkData().server || "Sin especificar"}
                                </p>
                              </div>
                            </div>
                            
                            {/* Puerto */}
                            <div className="space-y-1">
                              <h5 className="font-medium text-blue-800 dark:text-blue-300">Puerto</h5>
                              <p className="bg-white/60 dark:bg-black/20 p-1.5 rounded">
                                {getSFTPLinkData().port || "22 (predeterminado)"}
                              </p>
                            </div>
                            
                            {/* Usuario */}
                            <div className="space-y-1">
                              <h5 className="font-medium text-blue-800 dark:text-blue-300">Usuario</h5>
                              <div className="flex items-center gap-1">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                  <circle cx="12" cy="7" r="4" />
                                </svg>
                                <p className="bg-white/60 dark:bg-black/20 p-1.5 rounded flex-1">
                                  {getSFTPLinkData().user || "Sin especificar"}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {/* Panel de depuración técnica */}
              <details className="mt-3 p-2 bg-gray-100 dark:bg-gray-800 rounded-md text-xs">
                <summary className="cursor-pointer font-medium text-blue-600 dark:text-blue-400">Datos técnicos</summary>
                <div className="mt-2 p-2 font-mono overflow-auto max-h-40">
                  <p>ID: {unitDetails.details?.id || 'N/A'}</p>
                  <p>Tipo: {unitDetails.type}</p>
                  <p>Es nodo SFTP: {isSFTPNode() ? 'Sí' : 'No'}</p>
                  <p>Datos disponibles:</p>
                  <ul className="pl-4 mt-1 space-y-1">
                    <li>- output: {getSFTPOutput() ? 'Sí' : 'No'}</li>
                    <li>- input: {getSFTPInput() ? 'Sí' : 'No'}</li>
                    <li>- sftp_link_id: {getSFTPLinkId() ? 'Sí' : 'No'}</li>
                    <li>- SFTPLink: {getSFTPLinkData() ? 'Sí' : 'No'}</li>
                  </ul>
                </div>
              </details>
              
              {/* Información de propiedades generales */}
              <div className="mt-4 bg-slate-50 dark:bg-slate-800 p-3 rounded-md border border-slate-200 dark:border-slate-700">
                <h4 className="text-sm font-medium mb-2">Propiedades de ejecución</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-4 text-xs">
                  <div>
                    <span className="font-medium">Timeout:</span> {unitDetails.details?.timeout_milliseconds ? `${unitDetails.details.timeout_milliseconds / 1000} segundos` : 'N/A'}
                  </div>
                  <div>
                    <span className="font-medium">Aborta en timeout:</span> {unitDetails.details?.abort_on_timeout ? 'Sí' : 'No'}
                  </div>
                  <div>
                    <span className="font-medium">Continúa en error:</span> {unitDetails.details?.continue_on_error ? 'Sí' : 'No'}
                  </div>
                  <div>
                    <span className="font-medium">Reintentos:</span> {unitDetails.details?.retry_count || '0'}
                  </div>
                </div>
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cerrar
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-slate-600 dark:text-slate-400">No hay detalles disponibles para esta unidad.</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}