import React, { useState, useEffect } from "react";
import { executeQuery } from "@/lib/hasura-client";
import { COMMAND_QUERY, QUERY_QUEUE_QUERY, QUERY_DETAILS_QUERY, SFTP_DOWNLOADER_QUERY, SFTP_UPLOADER_QUERY, ZIP_QUERY, UNZIP_QUERY, PIPELINE_QUERY } from "@shared/queries";
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
          const nodeType = determineUnitType(unitData);
          
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
            
            // Obtener las consultas asociadas a la cola - usamos el mismo nombre de propiedad que PipelineFlow.tsx
            if (detailsData) {
              try {
                const queriesResult = await executeQuery(QUERY_DETAILS_QUERY, { query_queue_id: unitData.query_queue_id });
                if (queriesResult.data && queriesResult.data.merlin_agent_Query) {
                  // Agregar las consultas ordenadas con el mismo nombre de propiedad que en PipelineFlow.tsx
                  detailsData.Queries = queriesResult.data.merlin_agent_Query.sort((a: any, b: any) => a.order - b.order);
                }
              } catch (error) {
                console.error('Error al cargar consultas:', error);
              }
            }
          } else if (nodeType === 'sftp_download' && result.data.merlin_agent_SFTPDownloader) {
            detailsData = result.data.merlin_agent_SFTPDownloader[0];
            name = detailsData?.name || 'Descarga SFTP';
            description = 'Descarga archivos desde un servidor SFTP';
          } else if (nodeType === 'sftp_upload' && result.data.merlin_agent_SFTPUploader) {
            detailsData = result.data.merlin_agent_SFTPUploader[0];
            name = detailsData?.name || 'Subida SFTP';
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
    <UnitDetailsDialog
      open={open}
      onOpenChange={onOpenChange}
      loading={loading}
      unitDetails={nodeDetails}
      determineUnitType={determineUnitType}
    />
  );
}