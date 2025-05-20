import React, { useState, useEffect } from "react";
import { executeQuery } from "@/lib/hasura-client";
import { COMMAND_QUERY, QUERY_QUEUE_QUERY, QUERY_DETAILS_QUERY, ZIP_QUERY, UNZIP_QUERY, PIPELINE_QUERY } from "@shared/queries";
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
      const nodeType = determineUnitType(unitData);
      
      // Para nodos SFTP, usamos directamente los datos disponibles sin consultar la API
      if (nodeType === 'sftp_download') {
        // Información básica para nodos de descarga SFTP
        const name = 'Descarga SFTP';
        const description = 'Descarga archivos desde un servidor SFTP';
        
        // Datos que ya tenemos disponibles en la unidad del pipeline
        const detailsData = {
          id: unitData.sftp_downloader_id,
          name: name,
          output: unitData.output || "Sin ruta de salida especificada",
          sftp_link_id: unitData.sftp_link_id || "No disponible",
          return_output: unitData.return_output || false
        };
        
        console.log('Detalles de SFTP Download:', detailsData);
        
        // Establecer los detalles del nodo directamente
        setNodeDetails({
          type: nodeType,
          name: name,
          description: description,
          details: detailsData
        });
        
        setLoading(false);
        return;
      } 
      else if (nodeType === 'sftp_upload') {
        // Información básica para nodos de subida SFTP
        const name = 'Subida SFTP';
        const description = 'Sube archivos a un servidor SFTP';
        
        // Datos que ya tenemos disponibles en la unidad del pipeline
        const detailsData = {
          id: unitData.sftp_uploader_id,
          name: name,
          input: unitData.input || "Sin ruta de entrada especificada",
          sftp_link_id: unitData.sftp_link_id || "No disponible",
          return_output: unitData.return_output || false
        };
        
        console.log('Detalles de SFTP Upload:', detailsData);
        
        // Establecer los detalles del nodo directamente
        setNodeDetails({
          type: nodeType,
          name: name,
          description: description,
          details: detailsData
        });
        
        setLoading(false);
        return;
      }
      else if (unitData.call_pipeline) {
        // En caso de llamada a otro pipeline
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
        setLoading(false);
        return;
      }
      
      // Para otros tipos de nodos, usamos la consulta específica a la API
      let query = '';
      let variables = {};
      
      if (unitData.command_id) {
        query = COMMAND_QUERY;
        variables = { id: unitData.command_id };
      } else if (unitData.query_queue_id) {
        query = QUERY_QUEUE_QUERY;
        variables = { id: unitData.query_queue_id };
      } else if (unitData.zip_id) {
        query = ZIP_QUERY;
        variables = { id: unitData.zip_id };
      } else if (unitData.unzip_id) {
        query = UNZIP_QUERY;
        variables = { id: unitData.unzip_id };
      }
      
      if (query) {
        try {
          const result = await executeQuery(query, variables);
          if (result.data && !result.errors) {
            console.log('Respuesta de la API:', result.data);
            
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
                    // Agregar las consultas ordenadas
                    detailsData.Queries = queriesResult.data.merlin_agent_Query.sort((a: any, b: any) => a.order - b.order);
                  }
                } catch (error) {
                  console.error('Error al cargar consultas:', error);
                }
              }
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
          } else {
            throw new Error('Respuesta de API inválida');
          }
        } catch (error) {
          console.error(`Error al cargar detalles para ${nodeType}:`, error);
          
          // Crear datos básicos para mostrar en caso de error
          const detailsData = {
            id: unitData.command_id || unitData.query_queue_id || unitData.zip_id || unitData.unzip_id,
            name: nodeType === 'command' ? 'Comando' :
                 nodeType === 'query' ? 'Consulta SQL' :
                 nodeType === 'zip' ? 'Compresión ZIP' : 'Extracción ZIP'
          };
          
          setNodeDetails({
            type: nodeType,
            name: detailsData.name,
            description: 'No se pudieron cargar los detalles completos',
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
      
      // En caso de error general, establecer información básica
      const unitData = selectedNodeData.data.unit;
      const nodeType = determineUnitType(unitData);
      
      setNodeDetails({
        type: nodeType,
        name: nodeType.charAt(0).toUpperCase() + nodeType.slice(1).replace('_', ' '),
        description: 'No se pudieron cargar los detalles',
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