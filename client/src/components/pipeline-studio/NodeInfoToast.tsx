import React from 'react';
import { useToast } from '@/hooks/use-toast';

/**
 * Componente para mostrar información detallada de un nodo en un toast
 * Esta es una alternativa más sencilla a un diálogo completo
 */
export function showNodeDetails(toast: any, node: any) {
  if (!node?.data?.unit) return;
  
  const unit = node.data.unit;
  
  // Determinar el tipo de nodo
  const nodeType = unit.command_id ? 'Comando' : 
                 unit.query_queue_id ? 'Consulta SQL' : 
                 unit.sftp_downloader_id ? 'Descarga SFTP' : 
                 unit.sftp_uploader_id ? 'Subida SFTP' : 
                 unit.zip_id ? 'Compresión ZIP' : 
                 unit.unzip_id ? 'Extracción ZIP' : 
                 unit.call_pipeline ? 'Llamada a Pipeline' : 'Unidad';
  
  // Crear un mensaje detallado con información del nodo
  let details = `ID: ${unit.id.substring(0, 10)}...`;
  
  // Información específica según el tipo
  if (unit.command_id) {
    details += `\nComando ID: ${unit.command_id.substring(0, 8)}...`;
  } else if (unit.query_queue_id) {
    details += `\nConsulta SQL ID: ${unit.query_queue_id.substring(0, 8)}...`;
  } else if (unit.sftp_downloader_id) {
    details += `\nDescarga SFTP ID: ${unit.sftp_downloader_id.substring(0, 8)}...`;
  } else if (unit.sftp_uploader_id) {
    details += `\nSubida SFTP ID: ${unit.sftp_uploader_id.substring(0, 8)}...`;
  } else if (unit.zip_id) {
    details += `\nZIP ID: ${unit.zip_id.substring(0, 8)}...`;
  } else if (unit.unzip_id) {
    details += `\nUnZIP ID: ${unit.unzip_id.substring(0, 8)}...`;
  } else if (unit.call_pipeline) {
    details += `\nPipeline llamado: ${unit.call_pipeline.substring(0, 8)}...`;
  }
  
  // Información sobre configuraciones
  if (unit.retry_count > 0) {
    details += `\nReintentos: ${unit.retry_count}`;
  }
  if (unit.retry_after_milliseconds > 0) {
    details += `\nEspera entre reintentos: ${unit.retry_after_milliseconds}ms`;
  }
  if (unit.timeout_milliseconds > 0) {
    details += `\nTimeout: ${unit.timeout_milliseconds}ms`;
  }
  
  // Información sobre comportamiento en caso de error
  if (unit.continue_on_error) {
    details += `\nContinúa en caso de error: Sí`;
  }
  if (unit.abort_on_timeout) {
    details += `\nAbortar en timeout: Sí`;
  }
  
  // Añadir comentario si existe
  if (unit.comment) {
    details += `\nComentario: ${unit.comment}`;
  }
  
  // Mostrar información en toast
  toast({
    title: `${node.data.label} (${nodeType})`,
    description: details,
    variant: "default",
    duration: 7000 // Mostrar por más tiempo para dar tiempo a leer
  });
}