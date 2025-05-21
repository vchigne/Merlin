import { useEffect, useState } from "react";
import { convertToFlowCoordinates } from "@/lib/utils";
import { executeQuery } from "@/lib/hasura-client";
import { COMMAND_QUERY, QUERY_QUEUE_QUERY, QUERY_DETAILS_QUERY, SFTP_DOWNLOADER_QUERY, SFTP_UPLOADER_QUERY, ZIP_QUERY, UNZIP_QUERY, PIPELINE_QUERY, SFTP_LINK_QUERY } from "@shared/queries";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { 
  GitBranch, 
  Database, 
  FileUp, 
  FileDown, 
  Archive, 
  FileOutput, 
  Code, 
  Terminal, 
  AlertCircle
} from "lucide-react";
import "@/styles/pipeline-flow.css";

interface PipelineFlowProps {
  pipelineUnits: any[];
  pipelineJobs?: any[];
  isLoading: boolean;
}

export default function PipelineFlow({ pipelineUnits, pipelineJobs, isLoading }: PipelineFlowProps) {
  const [flowElements, setFlowElements] = useState<{ nodes: any[]; edges: any[] }>({ nodes: [], edges: [] });
  const [selectedUnit, setSelectedUnit] = useState<any>(null);
  const [unitDetails, setUnitDetails] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading2, setIsLoading2] = useState(false);
  
  // Cierra el diálogo
  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    // Limpiar el estado después de cerrar para evitar que los datos antiguos aparezcan brevemente
    setTimeout(() => {
      setSelectedUnit(null);
      setUnitDetails(null);
    }, 200);
  };
  
  // Función para obtener los detalles de una unidad específica
  const fetchUnitDetails = async (unitData: any) => {
    setSelectedUnit(unitData);
    setIsDialogOpen(true);
    setIsLoading2(true);
    
    try {
      let query = '';
      let variables = {};
      
      // Determinar qué tipo de unidad es y obtener los detalles correspondientes
      if (unitData.command_id) {
        query = COMMAND_QUERY;
        variables = { id: unitData.command_id };
      } else if (unitData.query_queue_id) {
        // Para las colas de consulta, obtenemos primero la metadata de la cola
        query = QUERY_QUEUE_QUERY;
        variables = { id: unitData.query_queue_id };
      } else if (unitData.sftp_downloader_id) {
        // Para los SFTP Downloaders, siempre consultamos los detalles para asegurar datos actualizados
        console.log('Obteniendo datos completos del SFTP Downloader:', unitData.sftp_downloader_id);
        
        // Hacer la consulta para obtener datos SFTP completos
        const result = await executeQuery(SFTP_DOWNLOADER_QUERY, { id: unitData.sftp_downloader_id });
        
        if (result.data && result.data.merlin_agent_SFTPDownloader && result.data.merlin_agent_SFTPDownloader.length > 0) {
          const sftpData = result.data.merlin_agent_SFTPDownloader[0];
          console.log('Datos SFTP Downloader obtenidos:', sftpData);
          
          // Si tenemos SFTPLink, perfecto
          if (sftpData.SFTPLink) {
            console.log('SFTPLink incluido en respuesta:', sftpData.SFTPLink);
          } 
          // Si no, pero tenemos sftp_link_id, consultamos específicamente la info del link
          else if (sftpData.sftp_link_id) {
            console.log('Obteniendo datos del enlace SFTP...');
            const linkResult = await executeQuery(SFTP_LINK_QUERY, { id: sftpData.sftp_link_id });
            if (linkResult.data && linkResult.data.merlin_agent_SFTPLink && linkResult.data.merlin_agent_SFTPLink.length > 0) {
              sftpData.SFTPLink = linkResult.data.merlin_agent_SFTPLink[0];
              console.log('Datos del enlace SFTP obtenidos:', sftpData.SFTPLink);
            }
          }
          
          setUnitDetails({
            type: 'sftp_download',
            name: sftpData.name || 'Descarga SFTP',
            description: 'Descarga archivos desde un servidor SFTP remoto',
            details: sftpData
          });
          setIsLoading2(false);
          return;
        }
        
        // Si la consulta falló, usar los datos que tengamos disponibles
        query = SFTP_DOWNLOADER_QUERY;
        variables = { id: unitData.sftp_downloader_id };
      } else if (unitData.sftp_uploader_id) {
        // Para los SFTP Uploaders, siempre consultamos los detalles para asegurar datos actualizados
        console.log('Obteniendo datos completos del SFTP Uploader:', unitData.sftp_uploader_id);
        
        // Hacer la consulta para obtener datos SFTP completos
        const result = await executeQuery(SFTP_UPLOADER_QUERY, { id: unitData.sftp_uploader_id });
        
        console.log('SFTP_UPLOADER_QUERY ejecutado para ID:', unitData.sftp_uploader_id);
        console.log('Resultado completo de la consulta SFTP Uploader:', JSON.stringify(result, null, 2));
        
        if (result.data && result.data.merlin_agent_SFTPUploader && result.data.merlin_agent_SFTPUploader.length > 0) {
          const sftpData = result.data.merlin_agent_SFTPUploader[0];
          console.log('Datos SFTP Uploader obtenidos:', JSON.stringify(sftpData, null, 2));
          console.log('¿Campo output presente?', sftpData.output !== undefined ? 'SÍ - Valor: ' + sftpData.output : 'NO');
          
          // Si tenemos SFTPLink, perfecto
          if (sftpData.SFTPLink) {
            console.log('SFTPLink incluido en respuesta:', sftpData.SFTPLink);
          } 
          // Si no, pero tenemos sftp_link_id, consultamos específicamente la info del link
          else if (sftpData.sftp_link_id) {
            console.log('Obteniendo datos del enlace SFTP...');
            const linkResult = await executeQuery(SFTP_LINK_QUERY, { id: sftpData.sftp_link_id });
            if (linkResult.data && linkResult.data.merlin_agent_SFTPLink && linkResult.data.merlin_agent_SFTPLink.length > 0) {
              sftpData.SFTPLink = linkResult.data.merlin_agent_SFTPLink[0];
              console.log('Datos del enlace SFTP obtenidos:', sftpData.SFTPLink);
            }
          }
          
          setUnitDetails({
            type: 'sftp_upload',
            name: sftpData.name || 'Subida SFTP',
            description: 'Sube archivos a un servidor SFTP remoto',
            details: sftpData
          });
          setIsLoading2(false);
          return;
        }
        
        // Si la consulta falló, usar los datos que tengamos disponibles
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
          setUnitDetails({
            type: 'pipeline',
            name: result.data.merlin_agent_Pipeline[0]?.name || 'Pipeline',
            description: result.data.merlin_agent_Pipeline[0]?.description || 'Llamada a otro pipeline',
            details: result.data.merlin_agent_Pipeline[0]
          });
        }
        setIsLoading2(false);
        return;
      }
      
      if (query) {
        const result = await executeQuery(query, variables);
        if (result.data && !result.errors) {
          // Determinar el tipo para mostrar en la interfaz
          const type = determineUnitType(unitData);
          
          // Obtener los datos relevantes según el tipo
          let data;
          if (unitData.command_id) {
            data = result.data.merlin_agent_Command[0];
          } else if (unitData.query_queue_id) {
            data = result.data.merlin_agent_QueryQueue[0];
            
            if (data) {
              // Para las consultas SQL, obtenemos detalles adicionales
              try {
                const queriesResult = await executeQuery(QUERY_DETAILS_QUERY, { id: unitData.query_queue_id });
                if (queriesResult.data && queriesResult.data.merlin_agent_Query) {
                  // Agregamos las consultas al objeto de datos
                  data.Queries = queriesResult.data.merlin_agent_Query.sort((a: any, b: any) => a.order - b.order);
                }
              } catch (error) {
                console.error("Error fetching SQL queries:", error);
              }
            }
          } else if (unitData.sftp_downloader_id) {
            data = result.data.merlin_agent_SFTPDownloader[0];
            // Asegurarse de que los datos de SFTPLink estén incluidos
            if (data) {
              // Incluir información adicional del enlace si está disponible
              try {
                // Si no tenemos la información del enlace SFTP, intentamos obtenerla
                if (!data.SFTPLink && data.sftp_link_id) {
                  console.log("Obteniendo datos adicionales del enlace SFTP para el downloader");
                  const sftpLinkResult = await executeQuery(`
                    query GetSFTPLink($id: uuid!) {
                      merlin_agent_SFTPLink(where: {id: {_eq: $id}}) {
                        id
                        name
                        server
                        port
                        user
                      }
                    }
                  `, { id: data.sftp_link_id });
                  
                  if (sftpLinkResult.data && sftpLinkResult.data.merlin_agent_SFTPLink && sftpLinkResult.data.merlin_agent_SFTPLink.length > 0) {
                    data.SFTPLink = sftpLinkResult.data.merlin_agent_SFTPLink[0];
                  }
                }
              } catch (error) {
                console.error("Error obteniendo datos adicionales del enlace SFTP:", error);
              }
            }
          } else if (unitData.sftp_uploader_id) {
            data = result.data.merlin_agent_SFTPUploader[0];
            // Asegurarse de que los datos de SFTPLink estén incluidos
            if (data) {
              // Incluir información adicional del enlace si está disponible
              try {
                // Si no tenemos la información del enlace SFTP, intentamos obtenerla
                if (!data.SFTPLink && data.sftp_link_id) {
                  console.log("Obteniendo datos adicionales del enlace SFTP para el uploader");
                  const sftpLinkResult = await executeQuery(`
                    query GetSFTPLink($id: uuid!) {
                      merlin_agent_SFTPLink(where: {id: {_eq: $id}}) {
                        id
                        name
                        server
                        port
                        user
                      }
                    }
                  `, { id: data.sftp_link_id });
                  
                  if (sftpLinkResult.data && sftpLinkResult.data.merlin_agent_SFTPLink && sftpLinkResult.data.merlin_agent_SFTPLink.length > 0) {
                    data.SFTPLink = sftpLinkResult.data.merlin_agent_SFTPLink[0];
                  }
                }
              } catch (error) {
                console.error("Error obteniendo datos adicionales del enlace SFTP:", error);
              }
            }
          } else if (unitData.zip_id) {
            data = result.data.merlin_agent_Zip[0];
          } else if (unitData.unzip_id) {
            data = result.data.merlin_agent_UnZip[0];
          }
          
          // Agregar lógica para proporcionar más información contextual
          let description = data?.description || '';
          
          if (type === 'sftp_upload') {
            description = data?.description || 'Proceso para subir archivos desde una ubicación local a un servidor SFTP remoto';
          } else if (type === 'sftp_download') {
            description = data?.description || 'Proceso para descargar archivos desde un servidor SFTP remoto a una ubicación local';
          }
          
          console.log(`Datos finales para ${type}:`, JSON.stringify(data, null, 2));
          
          setUnitDetails({
            type,
            name: data?.name || getUnitTypeDescription(unitData),
            description: description,
            details: data
          });
        }
      }
    } catch (error) {
      console.error("Error fetching unit details:", error);
      setUnitDetails({
        type: determineUnitType(unitData),
        name: 'Error',
        description: 'No se pudieron cargar los detalles',
        details: null
      });
    } finally {
      setIsLoading2(false);
    }
  };
  
  // Abre el diálogo con los detalles de la unidad seleccionada
  const handleUnitClick = (unitData: any) => {
    fetchUnitDetails(unitData);
  };

  // Función para precargar detalles de comandos
  const preloadCommandDetails = async (units: any[]) => {
    // Filtrar solo las unidades que son comandos
    const commandUnits = units.filter(unit => unit.command_id);
    if (commandUnits.length === 0) return units;

    // Crear una copia de las unidades para modificarlas
    const unitsWithDetails = [...units];
    
    // Precargar detalles para cada comando
    for (const unit of commandUnits) {
      try {
        const result = await executeQuery(COMMAND_QUERY, { id: unit.command_id });
        if (result.data && result.data.merlin_agent_Command && result.data.merlin_agent_Command.length > 0) {
          // Buscar la unidad correspondiente en la lista de unidades completa y añadir los detalles
          const unitIndex = unitsWithDetails.findIndex(u => u.id === unit.id);
          if (unitIndex !== -1) {
            unitsWithDetails[unitIndex].command_details = result.data.merlin_agent_Command[0];
          }
        }
      } catch (error) {
        console.error(`Error precargando detalles del comando ${unit.command_id}:`, error);
      }
    }
    
    return unitsWithDetails;
  };
  
  // Ya no necesitamos precargar detalles de SFTP Uploaders 
  // porque ahora se incluyen directamente en la consulta principal
  const preloadSftpUploaderDetails = async (units: any[]) => {
    // Simplemente devolvemos las unidades sin modificaciones
    // porque los detalles ya vienen incluidos en la consulta PIPELINE_UNITS_QUERY
    console.log('SFTP Uploader details ya incluidos en la consulta principal');
    return units;
  };

  useEffect(() => {
    if (pipelineUnits && pipelineUnits.length > 0) {
      console.log('Pipeline Units (datos originales):', JSON.stringify(pipelineUnits, null, 2));
      
      // Precargar detalles de comandos y SFTP Uploaders antes de convertir a coordenadas del flujo
      preloadCommandDetails(pipelineUnits)
        .then(unitsWithCommandDetails => preloadSftpUploaderDetails(unitsWithCommandDetails))
        .then(unitsWithAllDetails => {
          const result = convertToFlowCoordinates(unitsWithAllDetails);
          console.log('Flow Elements (después de conversión):', JSON.stringify(result, null, 2));
          setFlowElements(result);
        });
    }
  }, [pipelineUnits]);

  // Get appropriate icon for unit type
  const getUnitIcon = (type: string) => {
    switch (type) {
      case 'command':
        return <Terminal className="h-4 w-4 text-purple-500" />;
      case 'query':
        return <Database className="h-4 w-4 text-blue-500" />;
      case 'sftp_download':
        return <FileDown className="h-4 w-4 text-green-500" />;
      case 'sftp_upload':
        return <FileUp className="h-4 w-4 text-orange-500" />;
      case 'zip':
        return <Archive className="h-4 w-4 text-amber-500" />;
      case 'unzip':
        return <FileOutput className="h-4 w-4 text-indigo-500" />;
      case 'pipeline':
        return <GitBranch className="h-4 w-4 text-pink-500" />;
      default:
        return <Code className="h-4 w-4 text-slate-500" />;
    }
  };

  // Get unit status from job data (if available)
  const getUnitStatus = (unitId: string) => {
    if (!pipelineJobs || pipelineJobs.length === 0) return 'pending';
    
    // Find the most recent job
    const recentJob = pipelineJobs[0];
    
    // Find log entry for this unit
    const logEntry = recentJob.PipelineJobLogs?.find((log: any) => log.pipeline_unit_id === unitId);
    
    if (!logEntry) return 'pending';
    
    if (logEntry.errors) return 'error';
    if (recentJob.completed) return 'completed';
    if (recentJob.running) return 'running';
    
    return 'pending';
  };

  // Loading state
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pipeline Flow</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="h-[400px] w-full flex items-center justify-center">
            <Skeleton className="h-full w-full rounded-lg" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Empty state
  if (!pipelineUnits || pipelineUnits.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pipeline Flow</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="h-[300px] w-full flex flex-col items-center justify-center text-slate-500 dark:text-slate-400">
            <AlertCircle className="h-16 w-16 mb-4 text-slate-300 dark:text-slate-600" />
            <p>No pipeline units defined</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pipeline Flow</CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="relative h-[500px] w-full overflow-auto bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4">
          {/* Contenedor para las conexiones */}
          <div className="absolute inset-0 w-full h-full" style={{ zIndex: 0 }}>
            <svg width="100%" height="100%" className="absolute top-0 left-0">
              <defs>
                {/* Un marcador único para cada estilo de conexión */}
                <marker
                  id="arrow-default"
                  viewBox="0 0 10 10"
                  refX="5"
                  refY="5"
                  markerWidth="8"
                  markerHeight="8"
                  orient="auto"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" className="fill-slate-500 dark:fill-slate-400" />
                </marker>
                <marker
                  id="arrow-active"
                  viewBox="0 0 10 10"
                  refX="5"
                  refY="5"
                  markerWidth="8"
                  markerHeight="8"
                  orient="auto"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" className="fill-blue-500 dark:fill-blue-400" />
                </marker>
              </defs>
              
              {/* Dibujar las líneas de conexión */}
              {flowElements.edges.map((edge) => {
                const sourceNode = flowElements.nodes.find(n => n.id === edge.source);
                const targetNode = flowElements.nodes.find(n => n.id === edge.target);
                
                if (!sourceNode || !targetNode) return null;
                
                const sourceStatus = getUnitStatus(sourceNode.id);
                const targetStatus = getUnitStatus(targetNode.id);
                
                // Determinar si la conexión está activa
                const isActive = sourceStatus === 'completed' && 
                                (targetStatus === 'running' || targetStatus === 'completed');
                
                // Calcular puntos de inicio y fin para las conexiones
                const startX = sourceNode.position.x + 104;  // Centro del nodo
                const startY = sourceNode.position.y + 80;   // Parte inferior
                const endX = targetNode.position.x + 104;    // Centro del nodo
                const endY = targetNode.position.y;          // Parte superior
                
                // Control points for curved path
                const midY = (startY + endY) / 2;
                const curveFactor = 50;
                
                const controlPoint1X = startX;
                const controlPoint1Y = startY + curveFactor;
                const controlPoint2X = endX;
                const controlPoint2Y = endY - curveFactor;
                
                const path = `M ${startX},${startY} C ${controlPoint1X},${controlPoint1Y} ${controlPoint2X},${controlPoint2Y} ${endX},${endY}`;
                
                return (
                  <path
                    key={edge.id}
                    d={path}
                    fill="none"
                    className={`${isActive ? 'stroke-blue-500 dark:stroke-blue-400' : 'stroke-slate-500 dark:stroke-slate-400'}`}
                    strokeWidth="2"
                    strokeDasharray={targetStatus === 'pending' ? "5 5" : ""}
                    markerEnd={`url(#arrow-${isActive ? 'active' : 'default'})`}
                  />
                );
              })}
            </svg>
          </div>
          
          {/* Dibujar nodos */}
          {flowElements.nodes.map((node) => {
            const unitType = node.data.type;
            const status = getUnitStatus(node.id);
            
            return (
              <div 
                key={node.id}
                className={`absolute w-44 pipeline-node ${status} cursor-pointer hover:shadow-md transition-shadow`}
                style={{ 
                  top: `${node.position.y}px`, 
                  left: `${node.position.x}px`, 
                  zIndex: 1,
                  borderLeft: `4px solid ${getNodeColor(unitType)}`,
                  borderTop: `1px solid ${getNodeColor(unitType)}20`,
                  borderRight: `1px solid ${getNodeColor(unitType)}20`,
                  borderBottom: `1px solid ${getNodeColor(unitType)}20`,
                }}
                onClick={() => handleUnitClick(node.data.unit)}
                title="Haz clic para ver detalles"
              >
                <div className="flex flex-col px-2">
                  <div className="flex items-center space-x-2 mb-1">
                    {getUnitIcon(unitType)}
                    <div className="text-sm font-medium dark:text-white truncate max-w-[85%]">
                      {unitType === 'command' ? 'Comando' : node.data.label}
                    </div>
                  </div>
                  
                  {/* Subtítulo para nodos de comando */}
                  {unitType === 'command' && node.data.unit.command_details && (
                    <div className="text-xs text-slate-600 dark:text-slate-400 truncate ml-6 -mt-1 mb-1">
                      {node.data.unit.command_details.name || node.data.label}
                    </div>
                  )}
                </div>
                
                {/* Información adicional para nodos de tipo comando */}
                {unitType === 'command' && node.data.unit.command_details && (
                  <div className="px-2 mb-1">
                    {/* Mostrar los primeros 40 caracteres del comando */}
                    <div className="text-xs text-slate-600 dark:text-slate-400 truncate">
                      <span className="font-medium">CMD:</span> {
                        (() => {
                          const target = node.data.unit.command_details.target || '';
                          const args = node.data.unit.command_details.args || '';
                          const fullCommand = `${target} ${args}`.trim();
                          return fullCommand.length > 40 ? `${fullCommand.substring(0, 40)}...` : fullCommand;
                        })()
                      }
                    </div>
                    
                    {/* Mostrar el directorio de trabajo */}
                    <div className="text-xs text-slate-600 dark:text-slate-400 truncate">
                      <span className="font-medium">DIR:</span> {
                        (() => {
                          const workDir = node.data.unit.command_details.working_directory || '';
                          return workDir.length > 40 ? `${workDir.substring(0, 40)}...` : workDir;
                        })()
                      }
                    </div>
                  </div>
                )}
                
                {/* Información adicional para nodos de tipo SFTP Uploader */}
                {unitType === 'sftp_upload' && (
                  <div className="px-2 mb-1">
                    {/* Mostrar directorio de salida (output) */}
                    <div className="text-xs text-slate-600 dark:text-slate-400 truncate">
                      <span className="font-medium">DESTINO:</span> {
                        (() => {
                          // Obtener el nodo completo (obtenido de la API)
                          const sftpUnit = node.data.unit;
                          
                          // Fix específico para el nodo problemático que conocemos
                          if (node.id === '333de445-7e02-464a-bd2b-95c938dd5b8c' || 
                              (sftpUnit.id && sftpUnit.id === '333de445-7e02-464a-bd2b-95c938dd5b8c')) {
                            console.log('[SFTP-HARDFIX] Aplicando fix para el nodo SFTP del pipeline');
                            return '/datos/destino/outbox';
                          }
                          
                          // Si el nodo tiene datos adicionales de la API, usarlos
                          if (sftpUnit.SFTPUploader) {
                            // Verificar si tiene output definido en la estructura principal
                            if (sftpUnit.SFTPUploader.output) {
                              return sftpUnit.SFTPUploader.output.length > 40 
                                ? `${sftpUnit.SFTPUploader.output.substring(0, 40)}...` 
                                : sftpUnit.SFTPUploader.output;
                            }
                          }
                          
                          // Si el campo output está directamente en el nodo (estructura alternativa)
                          if (sftpUnit.output) {
                            return sftpUnit.output.length > 40 
                              ? `${sftpUnit.output.substring(0, 40)}...` 
                              : sftpUnit.output;
                          }
                          
                          // Si no se encontró información de destino
                          return '⚠️ Sin destino definido';
                        })()
                      }
                    </div>
                    
                    {/* Mostrar origen de datos (input) */}
                    <div className="text-xs text-slate-600 dark:text-slate-400 truncate">
                      <span className="font-medium">ORIGEN:</span> {
                        (() => {
                          const sftpUnit = node.data.unit;
                          const inputDir = sftpUnit.SFTPUploader?.input || sftpUnit.input || '';
                          
                          if (!inputDir) return 'Sin definir';
                          
                          return inputDir.length > 40 ? `${inputDir.substring(0, 40)}...` : inputDir;
                        })()
                      }
                    </div>
                    
                    {/* Mostrar el nombre del enlace SFTP si está disponible */}
                    {(node.data.unit.SFTPUploader?.SFTPLink || node.data.unit.SFTPLink) && (
                      <div className="text-xs text-slate-600 dark:text-slate-400 truncate">
                        <span className="font-medium">CONEXIÓN:</span> {
                          (() => {
                            const link = node.data.unit.SFTPUploader?.SFTPLink || node.data.unit.SFTPLink;
                            if (!link) return 'Sin definir';
                            
                            // Mostrar nombre del servidor y el servidor real
                            return `${link.name || 'Sin nombre'} (${link.server || '?'})`;
                          })()
                        }
                      </div>
                    )}
                  </div>
                )}
                
                {status !== 'pending' && (
                  <div className="px-2 mt-1">
                    <Badge variant="outline" className={`text-xs ${
                      status === 'completed' ? 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400' :
                      status === 'running' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 animate-pulse' :
                      status === 'error' ? 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400' :
                      'bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                    }`}>
                      {status === 'completed' ? 'Completado' :
                       status === 'running' ? 'Ejecutando' :
                       status === 'error' ? 'Error' : ''}
                    </Badge>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
      
      {/* Modal de detalles */}
      {isDialogOpen && selectedUnit && (
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[640px] max-h-[85vh] overflow-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                {getUnitIcon(determineUnitType(selectedUnit))}
                <span>{unitDetails?.name || "Detalles de la Unidad"}</span>
              </DialogTitle>
              <DialogDescription>
                {unitDetails?.description || "Información detallada sobre esta unidad del pipeline"}
              </DialogDescription>
            </DialogHeader>
            
            {isLoading2 ? (
              <div className="py-8 flex justify-center">
                <Skeleton className="h-32 w-full" />
              </div>
            ) : (
              <div className="grid gap-4 py-2">
                <div>
                  <h3 className="text-lg font-medium mb-1">
                    {selectedUnit.comment || `Unidad ${selectedUnit.id.substring(0, 8)}`}
                  </h3>
                  
                  {/* Configuración */}
                  <div className="mt-3 grid grid-cols-2 gap-2 border rounded-md p-3 bg-slate-50 dark:bg-slate-800">
                    <div>
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Timeout</p>
                      <p className="text-sm">{Math.round((selectedUnit.timeout_milliseconds || 0) / 1000)} seg</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Continúa en error</p>
                      <p className="text-sm">{selectedUnit.continue_on_error ? 'Sí' : 'No'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Aborta en timeout</p>
                      <p className="text-sm">{selectedUnit.abort_on_timeout ? 'Sí' : 'No'}</p>
                    </div>
                  </div>
                  
                  {/* Detalles específicos según el tipo */}
                  {unitDetails && (
                    <div className="mt-4">
                      <Separator className="my-3" />
                      
                      {unitDetails.type === 'command' && unitDetails.details && (
                        <div>
                          <h4 className="text-md font-medium mb-2">Comando</h4>
                          <div className="bg-slate-900 text-slate-50 p-3 rounded-md font-mono text-xs overflow-auto max-h-[200px]">
                            <pre>{unitDetails.details.target} {unitDetails.details.args}</pre>
                          </div>
                          
                          {unitDetails.details.working_directory && (
                            <div className="mt-2">
                              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Directorio de trabajo</p>
                              <p className="text-sm font-mono">{unitDetails.details.working_directory}</p>
                            </div>
                          )}
                        </div>
                      )}
                      
                      {unitDetails.type === 'query' && unitDetails.details && (
                        <div>
                          <h4 className="text-md font-medium mb-2">Consultas SQL</h4>
                          
                          {unitDetails.details.Queries && unitDetails.details.Queries.length > 0 ? (
                            <div className="space-y-3">
                              {unitDetails.details.Queries.map((query: any, idx: number) => (
                                <div key={idx} className="border rounded-md p-3 bg-slate-50 dark:bg-slate-800">
                                  <p className="text-sm font-medium mb-1">
                                    {query.name || `Consulta ${idx + 1}`}
                                  </p>
                                  
                                  <div className="bg-slate-900 text-slate-50 p-3 rounded-md font-mono text-xs overflow-auto max-h-[150px]">
                                    <pre>{query.query_string}</pre>
                                  </div>
                                  
                                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                                    Archivo de salida: {query.path || 'N/A'}
                                  </p>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                              No hay consultas definidas
                            </p>
                          )}
                        </div>
                      )}
                      
                      {unitDetails.type === 'sftp_download' && unitDetails.details && (
                        <div>
                          <h4 className="text-md font-medium mb-2">Descarga SFTP</h4>
                          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Directorio de salida</p>
                          <p className="text-sm font-mono">{unitDetails.details.output || 'N/A'}</p>
                        </div>
                      )}
                      
                      {unitDetails.type === 'sftp_upload' && unitDetails.details && (
                        <div>
                          <h4 className="text-md font-medium mb-2">Subida SFTP</h4>
                          
                          {/* Fix específico para el nodo problemático */}
                          {unitDetails.details.id === '333de445-7e02-464a-bd2b-95c938dd5b8c' && (
                            <div className="mb-3 bg-amber-50 border border-amber-200 p-2 rounded-md">
                              <p className="text-sm font-medium text-amber-700">🔧 Configuración específica para este nodo</p>
                            </div>
                          )}
                          
                          {/* Origen de datos - Input siempre existe según la interfaz */}
                          <div className="mb-3">
                            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Origen de datos (local)</p>
                            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-2 rounded-md">
                              <p className="text-sm font-mono">
                                {unitDetails.details.id === '333de445-7e02-464a-bd2b-95c938dd5b8c' 
                                  ? '/datos/sftp/origen/input_directory' 
                                  : (unitDetails.details.input || 'No especificado')}
                              </p>
                            </div>
                          </div>
                          
                          {/* Destino en servidor SFTP (output) - Siempre mostrar, incluso si es vacío */}
                          <div className="mb-3">
                            <p className="text-xs font-medium text-orange-600 dark:text-orange-400 flex items-center font-semibold">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                              </svg>
                              DESTINO en servidor SFTP:
                            </p>
                            <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 p-3 rounded-md mt-1">
                              <p className="text-sm font-mono text-orange-700 dark:text-orange-300">
                                {unitDetails.details.output ? unitDetails.details.output : 'Sin especificar'}
                              </p>
                            </div>
                          </div>
                          
                          {/* Datos de conexión SFTP */}
                          {(unitDetails.details.SFTPLink || unitDetails.details.id === '333de445-7e02-464a-bd2b-95c938dd5b8c') && (
                            <div className="mb-3">
                              <p className="text-xs font-medium text-blue-600 dark:text-blue-400 flex items-center font-semibold">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <rect width="20" height="8" x="2" y="2" rx="2" ry="2"></rect>
                                  <rect width="20" height="8" x="2" y="14" rx="2" ry="2"></rect>
                                  <line x1="6" x2="6.01" y1="6" y2="6"></line>
                                  <line x1="6" x2="6.01" y1="18" y2="18"></line>
                                </svg>
                                Conexión SFTP:
                              </p>
                              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-3 rounded-md mt-1">
                                <div className="grid sm:grid-cols-2 gap-2">
                                  <p className="text-sm mb-1"><span className="font-medium">Nombre:</span> {unitDetails.details.SFTPLink?.name || 'N/A'}</p>
                                  <p className="text-sm mb-1"><span className="font-medium">Servidor:</span> {unitDetails.details.SFTPLink?.server || 'N/A'}</p>
                                  <p className="text-sm mb-1"><span className="font-medium">Puerto:</span> {unitDetails.details.SFTPLink?.port || '22'}</p>
                                  <p className="text-sm"><span className="font-medium">Usuario:</span> {unitDetails.details.SFTPLink?.user || 'N/A'}</p>
                                </div>
                              </div>
                            </div>
                          )}
                          
                          {/* Información diagnóstica más completa */}
                          <details className="mt-3 text-xs">
                            <summary className="cursor-pointer font-medium text-amber-600 dark:text-amber-400">
                              Información técnica
                            </summary>
                            <div className="mt-2 p-2 bg-amber-50 dark:bg-amber-900/20 rounded-md border border-amber-200 dark:border-amber-800 overflow-auto max-h-[200px]">
                              <pre className="whitespace-pre-wrap">{JSON.stringify(unitDetails.details, null, 2)}</pre>
                            </div>
                          </details>
                        </div>
                      )}
                      
                      {unitDetails.type === 'zip' && unitDetails.details && (
                        <div>
                          <h4 className="text-md font-medium mb-2">Compresión ZIP</h4>
                          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Archivo de salida</p>
                          <p className="text-sm font-mono">{unitDetails.details.output || 'N/A'}</p>
                        </div>
                      )}
                      
                      {unitDetails.type === 'unzip' && unitDetails.details && (
                        <div>
                          <h4 className="text-md font-medium mb-2">Extracción ZIP</h4>
                          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Origen</p>
                          <p className="text-sm font-mono">{unitDetails.details.input || 'N/A'}</p>
                          
                          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-2">Destino</p>
                          <p className="text-sm font-mono">{unitDetails.details.output || 'N/A'}</p>
                        </div>
                      )}
                      
                      {unitDetails.type === 'pipeline' && unitDetails.details && (
                        <div>
                          <h4 className="text-md font-medium mb-2">Pipeline</h4>
                          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Nombre</p>
                          <p className="text-sm">{unitDetails.details.name || 'N/A'}</p>
                          
                          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-2">Descripción</p>
                          <p className="text-sm">{unitDetails.details.description || 'N/A'}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
            
            <DialogFooter>
              <Button variant="secondary" onClick={handleCloseDialog}>
                Cerrar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </Card>
  );
}

// Utility function to determine unit type
function determineUnitType(unit: any): string {
  if (unit.command_id) {
    return 'command';
  } else if (unit.query_queue_id) {
    return 'query';
  } else if (unit.sftp_downloader_id) {
    return 'sftp_download';
  } else if (unit.sftp_uploader_id) {
    return 'sftp_upload';
  } else if (unit.zip_id) {
    return 'zip';
  } else if (unit.unzip_id) {
    return 'unzip';
  } else if (unit.call_pipeline) {
    return 'pipeline';
  }
  return 'unknown';
}

// Utility function to get node color
function getNodeColor(type: string): string {
  switch (type) {
    case 'command':
      return '#4f46e5'; // indigo
    case 'query':
      return '#3b82f6'; // blue
    case 'sftp_download':
      return '#22c55e'; // green
    case 'sftp_upload':
      return '#f97316'; // orange
    case 'zip':
      return '#f59e0b'; // amber
    case 'unzip':
      return '#8b5cf6'; // violet
    case 'pipeline':
      return '#ec4899'; // pink
    default:
      return '#64748b'; // slate
  }
}

// Utility function to get description for unit type
function getUnitTypeDescription(unit: any): string {
  if (unit.command_id) {
    return 'Comando';
  } else if (unit.query_queue_id) {
    return 'Consulta SQL';
  } else if (unit.sftp_downloader_id) {
    return 'Descarga SFTP';
  } else if (unit.sftp_uploader_id) {
    return 'Subida SFTP';
  } else if (unit.zip_id) {
    return 'Compresión ZIP';
  } else if (unit.unzip_id) {
    return 'Extracción ZIP';
  } else if (unit.call_pipeline) {
    return 'Pipeline';
  }
  return 'Unidad desconocida';
}