import React, { useState, useEffect } from "react";
import { executeQuery } from "@/lib/hasura-client";
import { 
  COMMAND_QUERY, 
  QUERY_QUEUE_QUERY, 
  QUERY_DETAILS_QUERY, 
  ZIP_QUERY, 
  UNZIP_QUERY, 
  PIPELINE_QUERY
} from "@shared/queries";
import { useToast } from "@/hooks/use-toast";
import UnitDetailsDialog from "./UnitDetailsDialog";

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
  
  // Función para determinar el tipo de unidad
  const determineUnitType = (unit: any) => {
    if (!unit) return 'unknown';
    
    if (unit.command_id) return 'command';
    if (unit.query_queue_id) return 'query';
    if (unit.sftp_downloader_id) return 'sftp_download';
    if (unit.sftp_uploader_id) return 'sftp_upload';
    if (unit.zip_id) return 'zip';
    if (unit.unzip_id) return 'unzip';
    if (unit.call_pipeline) return 'pipeline';
    
    return 'unknown';
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

  // Función principal para obtener los detalles del nodo
  const fetchNodeDetails = async (id: string) => {
    const selectedNodeData = nodes.find(node => node.id === id);
    if (!selectedNodeData) return;
    
    setLoading(true);
    
    try {
      const unitData = selectedNodeData.data.unit;
      const nodeType = determineUnitType(unitData);
      
      console.log('Obteniendo detalles para tipo:', nodeType);
      
      // SFTP Downloader - Ahora usando datos reales de la unidad
      if (nodeType === 'sftp_download') {
        console.log('Detalles del SFTP Downloader:', unitData.SFTPDownloader);
        
        // Usar los datos reales que vienen en la consulta principal
        const realSftpData = unitData.SFTPDownloader || {
          id: unitData.sftp_downloader_id,
          name: 'Descarga SFTP',
          output: 'Sin ruta de salida especificada',
          return_output: false
        };
        
        const realSftpLinkData = unitData.SFTPDownloader?.SFTPLink || {
          id: realSftpData.sftp_link_id || 'N/A',
          name: 'Enlace SFTP',
          server: 'No disponible',
          port: 22,
          user: 'No disponible'
        };
        
        setNodeDetails({
          type: nodeType,
          name: realSftpData.name || 'Descarga SFTP',
          description: 'Descarga archivos desde un servidor SFTP remoto',
          details: {
            ...realSftpData,
            SFTPLink: realSftpLinkData
          }
        });
      }
      // SFTP Uploader - Ahora usando datos reales de la unidad
      else if (nodeType === 'sftp_upload') {
        console.log('Detalles del SFTP Uploader:', unitData.SFTPUploader);
        
        // Usar los datos reales que vienen en la consulta principal
        const realSftpData = unitData.SFTPUploader || {
          id: unitData.sftp_uploader_id,
          name: 'Subida SFTP',
          input: 'Sin ruta de entrada especificada',
          return_output: false
        };
        
        const realSftpLinkData = unitData.SFTPUploader?.SFTPLink || {
          id: realSftpData.sftp_link_id || 'N/A',
          name: 'Enlace SFTP',
          server: 'No disponible',
          port: 22,
          user: 'No disponible'
        };
        
        // Incluir un log para depuración
        console.log('Configurando detalles del SFTP Uploader:', {
          realSftpData,
          realSftpLinkData,
          unitDataOriginal: unitData
        });
        
        setNodeDetails({
          type: nodeType,
          name: realSftpData.name || 'Subida SFTP',
          description: 'Sube archivos a un servidor SFTP remoto',
          details: {
            ...realSftpData,
            SFTPLink: realSftpLinkData,
            // Incluir datos adicionales para depuración
            _debug: {
              originalUnitData: JSON.stringify(unitData),
              originalSftpUploader: JSON.stringify(unitData.SFTPUploader),
              hasSftpLinkData: !!unitData.SFTPUploader?.SFTPLink
            }
          }
        });
      }
      // Pipeline
      else if (unitData.call_pipeline) {
        try {
          const result = await executeQuery(PIPELINE_QUERY, { id: unitData.call_pipeline });
          if (result.data && !result.errors) {
            setNodeDetails({
              type: 'pipeline',
              name: result.data.merlin_agent_Pipeline[0]?.name || 'Pipeline',
              description: result.data.merlin_agent_Pipeline[0]?.description || 'Llamada a otro pipeline',
              details: result.data.merlin_agent_Pipeline[0]
            });
          } else {
            throw new Error('No se pudo obtener información del pipeline');
          }
        } catch (error) {
          console.error('Error al cargar el pipeline:', error);
          setNodeDetails({
            type: 'pipeline',
            name: 'Pipeline',
            description: 'Llamada a otro pipeline',
            details: { id: unitData.call_pipeline, name: 'Pipeline' }
          });
        }
      }
      // Comando
      else if (unitData.command_id) {
        try {
          const result = await executeQuery(COMMAND_QUERY, { id: unitData.command_id });
          if (result.data && !result.errors) {
            setNodeDetails({
              type: 'command',
              name: result.data.merlin_agent_Command[0]?.name || 'Comando',
              description: result.data.merlin_agent_Command[0]?.description || 'Ejecuta un comando en el sistema',
              details: result.data.merlin_agent_Command[0]
            });
          } else {
            throw new Error('No se pudo obtener información del comando');
          }
        } catch (error) {
          console.error('Error al cargar el comando:', error);
          setNodeDetails({
            type: 'command',
            name: 'Comando',
            description: 'Ejecuta un comando en el sistema',
            details: { id: unitData.command_id, name: 'Comando' }
          });
        }
      }
      // Consulta SQL
      else if (unitData.query_queue_id) {
        try {
          const result = await executeQuery(QUERY_QUEUE_QUERY, { id: unitData.query_queue_id });
          if (result.data && !result.errors) {
            const detailsData = result.data.merlin_agent_QueryQueue[0];
            
            // Obtener las consultas asociadas a la cola
            if (detailsData) {
              try {
                const queriesResult = await executeQuery(QUERY_DETAILS_QUERY, { id: unitData.query_queue_id });
                if (queriesResult.data && queriesResult.data.merlin_agent_Query) {
                  detailsData.Queries = queriesResult.data.merlin_agent_Query.sort((a: any, b: any) => a.order - b.order);
                }
              } catch (error) {
                console.error('Error al cargar consultas:', error);
              }
            }
            
            setNodeDetails({
              type: 'query',
              name: detailsData?.name || 'Consulta SQL',
              description: detailsData?.description || 'Ejecuta una consulta en base de datos',
              details: detailsData
            });
          } else {
            throw new Error('No se pudo obtener información de la consulta');
          }
        } catch (error) {
          console.error('Error al cargar la consulta:', error);
          setNodeDetails({
            type: 'query',
            name: 'Consulta SQL',
            description: 'Ejecuta una consulta en base de datos',
            details: { id: unitData.query_queue_id, name: 'Consulta SQL' }
          });
        }
      }
      // ZIP
      else if (unitData.zip_id) {
        try {
          const result = await executeQuery(ZIP_QUERY, { id: unitData.zip_id });
          if (result.data && !result.errors) {
            setNodeDetails({
              type: 'zip',
              name: result.data.merlin_agent_Zip[0]?.name || 'Compresión ZIP',
              description: 'Comprime archivos en formato ZIP',
              details: result.data.merlin_agent_Zip[0]
            });
          } else {
            throw new Error('No se pudo obtener información del ZIP');
          }
        } catch (error) {
          console.error('Error al cargar el ZIP:', error);
          setNodeDetails({
            type: 'zip',
            name: 'Compresión ZIP',
            description: 'Comprime archivos en formato ZIP',
            details: { id: unitData.zip_id, name: 'Compresión ZIP' }
          });
        }
      }
      // UNZIP
      else if (unitData.unzip_id) {
        try {
          const result = await executeQuery(UNZIP_QUERY, { id: unitData.unzip_id });
          if (result.data && !result.errors) {
            setNodeDetails({
              type: 'unzip',
              name: result.data.merlin_agent_UnZip[0]?.name || 'Extracción ZIP',
              description: 'Extrae archivos de formato ZIP',
              details: result.data.merlin_agent_UnZip[0]
            });
          } else {
            throw new Error('No se pudo obtener información del UNZIP');
          }
        } catch (error) {
          console.error('Error al cargar el UNZIP:', error);
          setNodeDetails({
            type: 'unzip',
            name: 'Extracción ZIP',
            description: 'Extrae archivos de formato ZIP',
            details: { id: unitData.unzip_id, name: 'Extracción ZIP' }
          });
        }
      }
      // Tipo desconocido
      else {
        setNodeDetails({
          type: 'unknown',
          name: 'Nodo desconocido',
          description: 'No se pudo determinar el tipo de nodo',
          details: null
        });
      }
    } catch (error) {
      console.error('Error al cargar detalles del nodo:', error);
      
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los detalles del nodo',
        variant: 'destructive'
      });
      
      setNodeDetails({
        type: 'unknown',
        name: 'Error',
        description: 'Error al cargar los detalles',
        details: null
      });
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <UnitDetailsDialog
      open={open}
      onOpenChange={onOpenChange}
      loading={loading}
      unitDetails={nodeDetails}
      determineUnitType={determineUnitType}
    />
  );
}