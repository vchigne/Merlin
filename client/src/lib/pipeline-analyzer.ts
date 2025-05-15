import { executeQuery } from '@/lib/hasura-client';
import { PipelineUnit } from '@shared/types';

// Interfaz para los resultados del análisis
export interface PipelineAnalysisResult {
  id: string;
  name: string;
  description: string;
  agent_passport_id: string; 
  runCount: number;
  successCount: number;
  successRate: number;
  avgDuration: number;
  lastRun: string;
  type: PipelineType;
  complexity: number;
  tags: string[];
}

// Tipos de pipeline basados en su composición
export enum PipelineType {
  SQL_EXTRACTION = 'SQL_EXTRACTION',      // Consultas SQL principalmente
  FILE_TRANSFER = 'FILE_TRANSFER',        // SFTP upload/download
  COMPRESSION = 'COMPRESSION',            // Zip/Unzip
  COMMAND_EXECUTION = 'COMMAND_EXECUTION', // Comandos principalmente
  MIXED = 'MIXED',                        // Combinación de varios tipos
  CHAINED = 'CHAINED'                     // Pipelines que llaman a otros pipelines
}

// Interfaz para pipeline con sus unidades
export interface PipelineWithUnits {
  id: string;
  name: string;
  description: string;
  agent_passport_id: string;
  PipelineUnits: PipelineUnit[];
}

// Interfaz para pipeline con sus jobs recientes
export interface PipelineWithJobs {
  id: string;
  name: string;
  description: string;
  agent_passport_id: string;
  PipelineJobQueues: Array<{
    id: string;
    completed: boolean;
    running: boolean;
    aborted: boolean;
    created_at: string;
    updated_at: string;
  }>;
}

/**
 * Obtiene los pipelines más utilizados en los últimos 30 días
 */
export async function getMostUsedPipelines(limit = 20): Promise<PipelineAnalysisResult[]> {
  try {
    // Primero obtenemos los pipelines con sus jobs en los últimos 30 días
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoIso = thirtyDaysAgo.toISOString();

    const result = await executeQuery(`
      query GetMostUsedPipelines($thirtyDaysAgo: timestamptz!, $limit: Int!) {
        # Contamos los jobs por pipeline en los últimos 30 días
        pipelines: merlin_agent_Pipeline {
          id
          name
          description
          agent_passport_id
          # Obtenemos los jobs asociados a este pipeline
          PipelineJobQueues(where: {created_at: {_gte: $thirtyDaysAgo}}) {
            id
            completed
            running
            aborted
            created_at
            updated_at
          }
          # Obtenemos las unidades de este pipeline para análisis
          PipelineUnits {
            id
            command_id
            query_queue_id
            sftp_downloader_id
            sftp_uploader_id
            zip_id
            unzip_id
            call_pipeline
            pipeline_unit_id
          }
        }
      }
    `, { 
      thirtyDaysAgo: thirtyDaysAgoIso,
      limit: limit
    });
    
    if (result.errors) {
      console.error('Error al obtener pipelines:', result.errors);
      throw new Error(result.errors[0].message);
    }
    
    // Procesamos los datos para realizar el análisis
    const pipelines = result.data.pipelines;
    
    // Calculamos métricas para cada pipeline
    const analysisResults = pipelines.map((pipeline: any) => {
      const jobs = pipeline.PipelineJobQueues || [];
      const units = pipeline.PipelineUnits || [];
      
      // Conteo básico de jobs
      const runCount = jobs.length;
      const successCount = jobs.filter((job: any) => job.completed && !job.aborted).length;
      const successRate = runCount > 0 ? (successCount / runCount) * 100 : 0;
      
      // Calcular duración promedio (en segundos)
      const durations = jobs
        .filter((job: any) => job.completed)
        .map((job: any) => {
          const start = new Date(job.created_at).getTime();
          const end = new Date(job.updated_at).getTime();
          return (end - start) / 1000; // convertir a segundos
        });
      
      const avgDuration = durations.length > 0 
        ? durations.reduce((sum: number, d: number) => sum + d, 0) / durations.length 
        : 0;
      
      // Determinar el último job ejecutado
      const lastRun = jobs.length > 0 
        ? jobs.sort((a: any, b: any) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0].created_at
        : null;
      
      // Determinar el tipo de pipeline basado en sus unidades
      const pipelineType = determinePipelineType(units);
      
      // Determinar la complejidad (número de unidades)
      const complexity = units.length;
      
      // Tags asociados al pipeline (por ahora basados en el tipo)
      const tags = generateTags(units, pipelineType);
      
      return {
        id: pipeline.id,
        name: pipeline.name,
        description: pipeline.description || '',
        agent_passport_id: pipeline.agent_passport_id,
        runCount,
        successCount,
        successRate,
        avgDuration,
        lastRun,
        type: pipelineType,
        complexity,
        tags
      };
    });
    
    // Ordenar por número de ejecuciones (runCount) descendente
    return analysisResults
      .sort((a: PipelineAnalysisResult, b: PipelineAnalysisResult) => b.runCount - a.runCount)
      .slice(0, limit);
    
  } catch (error) {
    console.error('Error en getMostUsedPipelines:', error);
    throw error;
  }
}

/**
 * Determina el tipo de pipeline basado en las unidades que lo componen
 */
function determinePipelineType(units: any[]): PipelineType {
  if (units.length === 0) return PipelineType.MIXED;
  
  // Contamos los diferentes tipos de unidades
  const counts = {
    command: 0,
    query: 0,
    sftp: 0,
    compression: 0,
    callPipeline: 0
  };
  
  units.forEach(unit => {
    if (unit.command_id) counts.command++;
    if (unit.query_queue_id) counts.query++;
    if (unit.sftp_downloader_id || unit.sftp_uploader_id) counts.sftp++;
    if (unit.zip_id || unit.unzip_id) counts.compression++;
    if (unit.call_pipeline) counts.callPipeline++;
  });
  
  // Si hay llamadas a otros pipelines, es un pipeline encadenado
  if (counts.callPipeline > 0) {
    return PipelineType.CHAINED;
  }
  
  // Determinamos el tipo principal basado en la mayoría
  const total = units.length;
  const sqlPercent = counts.query / total;
  const sftpPercent = counts.sftp / total;
  const compressionPercent = counts.compression / total;
  const commandPercent = counts.command / total;
  
  // Asignamos tipo basado en qué tipo de unidades predomina
  if (sqlPercent >= 0.5) {
    return PipelineType.SQL_EXTRACTION;
  } else if (sftpPercent >= 0.5) {
    return PipelineType.FILE_TRANSFER;
  } else if (compressionPercent >= 0.5) {
    return PipelineType.COMPRESSION;
  } else if (commandPercent >= 0.5) {
    return PipelineType.COMMAND_EXECUTION;
  } else {
    return PipelineType.MIXED;
  }
}

/**
 * Genera tags para el pipeline basados en su composición
 */
function generateTags(units: any[], pipelineType: PipelineType): string[] {
  const tags: string[] = [pipelineType.toLowerCase()];
  
  // Añadir tags específicos basados en componentes
  if (units.some(u => u.command_id)) tags.push('command');
  if (units.some(u => u.query_queue_id)) tags.push('sql');
  if (units.some(u => u.sftp_downloader_id)) tags.push('sftp-download');
  if (units.some(u => u.sftp_uploader_id)) tags.push('sftp-upload');
  if (units.some(u => u.zip_id)) tags.push('zip');
  if (units.some(u => u.unzip_id)) tags.push('unzip');
  if (units.some(u => u.call_pipeline)) tags.push('nested');
  
  // Determinar si es un pipeline secuencial o tiene ramificaciones
  const hasBranching = units.some(u => u.pipeline_unit_id);
  if (hasBranching) {
    tags.push('branched');
  } else {
    tags.push('sequential');
  }
  
  return tags;
}

/**
 * Crea una representación estructurada del pipeline para las plantillas
 */
export async function createPipelineTemplate(pipelineId: string): Promise<any> {
  try {
    // Obtenemos toda la información del pipeline y sus unidades
    const result = await executeQuery(`
      query GetPipelineDetails($pipelineId: uuid!) {
        merlin_agent_Pipeline(where: {id: {_eq: $pipelineId}}) {
          id
          name
          description
          abort_on_error
          agent_passport_id
          PipelineUnits {
            id
            command_id
            query_queue_id
            sftp_downloader_id
            sftp_uploader_id
            zip_id
            unzip_id
            pipeline_unit_id
            call_pipeline
            comment
            retry_after_milliseconds
            retry_count
            timeout_milliseconds
            abort_on_timeout
            continue_on_error
            posx
            posy
            # Si tiene comando, obtenemos los detalles
            Command {
              id
              name
              target
              working_directory
              args
              instant
              description
              raw_script
              return_output
              return_output_type
            }
            # Si tiene query queue, obtenemos los detalles
            QueryQueue {
              id
              name
              description
              Queries {
                id
                name
                query_string
                path
                print_headers
                enabled
                return_output
                sqlconn_id
                date_format
                separator
                timeout
                retry_count
                retry_after_milliseconds
              }
            }
            # Si tiene SFTP downloader, obtenemos los detalles
            SFTPDownloader {
              id
              name
              output
              return_output
              sftp_link_id
            }
            # Si tiene SFTP uploader, obtenemos los detalles
            SFTPUploader {
              id
              name
              input
              return_output
              sftp_link_id
            }
            # Si tiene Zip, obtenemos los detalles
            Zip {
              id
              name
              output
              return_output
            }
            # Si tiene UnZip, obtenemos los detalles
            UnZip {
              id
              name
              input
              output
              return_output
            }
          }
        }
      }
    `, { pipelineId });
    
    if (result.errors) {
      throw new Error(result.errors[0].message);
    }
    
    const pipeline = result.data.merlin_agent_Pipeline[0];
    if (!pipeline) {
      throw new Error(`Pipeline con ID ${pipelineId} no encontrado`);
    }
    
    // Crear plantilla estructurada para YAML
    return {
      name: `${pipeline.name} (Template)`,
      description: `Template based on ${pipeline.name}: ${pipeline.description || ''}`,
      abort_on_error: pipeline.abort_on_error,
      units: pipeline.PipelineUnits.map((unit: any) => {
        const templateUnit: any = {
          type: determineUnitType(unit),
          comment: unit.comment || '',
          position: {
            x: unit.posx || 0,
            y: unit.posy || 0
          },
          retry: {
            count: unit.retry_count || 0,
            after_milliseconds: unit.retry_after_milliseconds || 0
          },
          timeout: {
            milliseconds: unit.timeout_milliseconds || 0,
            abort_on_timeout: unit.abort_on_timeout || false
          },
          error_handling: {
            continue_on_error: unit.continue_on_error || false
          }
        };
        
        // Añadir detalles específicos según el tipo de unidad
        if (unit.Command) {
          templateUnit.command = {
            name: unit.Command.name,
            target: unit.Command.target,
            working_directory: unit.Command.working_directory || '',
            args: unit.Command.args || '',
            script: unit.Command.raw_script || '',
            return_output: unit.Command.return_output || false
          };
        } else if (unit.QueryQueue) {
          templateUnit.query_queue = {
            name: unit.QueryQueue.name,
            description: unit.QueryQueue.description || '',
            queries: (unit.QueryQueue.Queries || []).map((q: any) => ({
              name: q.name,
              query_string: q.query_string,
              path: q.path || '',
              sqlconn_id: q.sqlconn_id || '${SQL_CONNECTION_ID}', // Placeholder para configuración
              return_output: q.return_output || false,
              date_format: q.date_format || '',
              separator: q.separator || ',',
              timeout: q.timeout || 30000
            }))
          };
        } else if (unit.SFTPDownloader) {
          templateUnit.sftp_download = {
            name: unit.SFTPDownloader.name,
            output: unit.SFTPDownloader.output || '',
            return_output: unit.SFTPDownloader.return_output || false,
            sftp_link_id: '${SFTP_LINK_ID}' // Placeholder para configuración
          };
        } else if (unit.SFTPUploader) {
          templateUnit.sftp_upload = {
            name: unit.SFTPUploader.name,
            input: unit.SFTPUploader.input || '',
            return_output: unit.SFTPUploader.return_output || false,
            sftp_link_id: '${SFTP_LINK_ID}' // Placeholder para configuración
          };
        } else if (unit.Zip) {
          templateUnit.zip = {
            name: unit.Zip.name,
            output: unit.Zip.output || '',
            return_output: unit.Zip.return_output || false
          };
        } else if (unit.UnZip) {
          templateUnit.unzip = {
            name: unit.UnZip.name,
            input: unit.UnZip.input || '',
            output: unit.UnZip.output || '',
            return_output: unit.UnZip.return_output || false
          };
        } else if (unit.call_pipeline) {
          templateUnit.call_pipeline = {
            pipeline_id: '${REFERENCED_PIPELINE_ID}' // Placeholder para configuración
          };
        }
        
        // Añadir referencia a la siguiente unidad en la secuencia si existe
        if (unit.pipeline_unit_id) {
          templateUnit.next_unit_id = unit.pipeline_unit_id;
        }
        
        return templateUnit;
      })
    };
  } catch (error) {
    console.error('Error en createPipelineTemplate:', error);
    throw error;
  }
}

/**
 * Determina el tipo de unidad de pipeline
 */
function determineUnitType(unit: any): string {
  if (unit.command_id) return 'command';
  if (unit.query_queue_id) return 'query_queue';
  if (unit.sftp_downloader_id) return 'sftp_download';
  if (unit.sftp_uploader_id) return 'sftp_upload';
  if (unit.zip_id) return 'zip';
  if (unit.unzip_id) return 'unzip';
  if (unit.call_pipeline) return 'call_pipeline';
  return 'unknown';
}