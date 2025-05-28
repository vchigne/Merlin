// Pipeline Manager - Punto único de acceso para manejar pipelines de Merlin
import { executeQuery } from "@/lib/hasura-client";

// Interfaces completas basadas en la documentación confirmada
export interface Pipeline {
  id: string;
  name: string;
  description?: string;
  abort_on_error: boolean;
  abort_on_timeout: boolean;
  continue_on_error: boolean;
  PipelineUnits?: PipelineUnit[];
}

export interface PipelineUnit {
  id: string;
  pipeline_id: string;
  pipeline_unit_id?: string;
  retry_count: number;
  retry_after_milliseconds: number;
  timeout_milliseconds: number;
  continue_on_error: boolean;
  abort_on_error: boolean;
  abort_on_timeout: boolean;
  
  // Solo uno será no-null (define el tipo de runner)
  command_id?: string;
  query_queue_id?: string;
  sftp_downloader_id?: string;
  sftp_uploader_id?: string;
  zip_id?: string;
  unzip_id?: string;
  call_pipeline_id?: string;
  
  // Relaciones cargadas desde Hasura
  Command?: Command;
  QueryQueue?: QueryQueue;
  SFTPDownloader?: SFTPDownloader;
  SFTPUploader?: SFTPUploader;
  Zip?: Zip;
  Unzip?: Unzip;
  CallPipeline?: CallPipeline;
}

export interface Command {
  id: string;
  target: string;
  args?: string;
  working_directory?: string;
  raw_script?: string;
  instant: boolean;
  return_output: boolean;
  return_output_type: string;
}

export interface QueryQueue {
  id: string;
  Queries?: Query[];
}

export interface Query {
  id: string;
  query_queue_id: string;
  sql_conn_id: string;
  order: number;
  statement: string;
  path: string;
  return_output: boolean;
  print_headers: boolean;
  separator: string;
  chunks: number;
  trim_columns: boolean;
  force_dot_decimal_separator: boolean;
  date_format: string;
  target_encoding: string;
  retry_count: number;
  retry_after_milliseconds: number;
  SQLConn?: SQLConn;
}

export interface SQLConn {
  id: string;
  driver: string;
  connection_string: string;
  name: string;
}

export interface SFTPDownloader {
  id: string;
  sftp_link_id: string;
  SFTPLink?: SFTPLink;
  FileStreamSftpDownloaders?: FileStreamSftpDownloader[];
}

export interface SFTPUploader {
  id: string;
  sftp_link_id: string;
  SFTPLink?: SFTPLink;
  FileStreamSftpUploaders?: FileStreamSftpUploader[];
}

export interface SFTPLink {
  id: string;
  server: string;
  port: number;
  user: string;
  password: string;
  name: string;
}

export interface FileStreamSftpDownloader {
  id: string;
  input: string;
  output: string;
  return_output: boolean;
}

export interface FileStreamSftpUploader {
  id: string;
  input: string;
  output: string;
  return_output: boolean;
}

export interface Zip {
  id: string;
  zip_name: string;
  FileStreamZips?: FileStreamZip[];
}

export interface FileStreamZip {
  id: string;
  input: string;
  wildcard_exp?: string;
}

export interface Unzip {
  id: string;
  FileStreamUnzips?: FileStreamUnzip[];
}

export interface FileStreamUnzip {
  id: string;
  input: string;
  output: string;
  return_output: boolean;
}

export interface CallPipeline {
  id: string;
  pipeline_id: string;
  timeout_milliseconds: number;
  Pipeline?: {
    id: string;
    name: string;
    description?: string;
  };
}

export interface PipelineUnitChain {
  Unit: PipelineUnit;
  Children: PipelineUnitChain[];
}

export type RunnerType = 
  | "Command" 
  | "QueryQueue" 
  | "SFTPDownloader" 
  | "SFTPUploader" 
  | "Zip" 
  | "Unzip" 
  | "CallPipeline";

// Query GraphQL completa para obtener pipeline con todos los datos
const PIPELINE_COMPLETE_QUERY = `
  query GetPipelineComplete($pipelineId: uuid!) {
    merlin_agent_Pipeline_by_pk(id: $pipelineId) {
      id
      name
      description
      abort_on_error
      abort_on_timeout
      continue_on_error
      
      PipelineUnits {
        id
        pipeline_unit_id
        retry_count
        retry_after_milliseconds
        timeout_milliseconds
        continue_on_error
        abort_on_error
        abort_on_timeout
        
        command_id
        query_queue_id
        sftp_downloader_id
        sftp_uploader_id
        zip_id
        unzip_id
        call_pipeline_id
        
        Command {
          id
          target
          args
          working_directory
          raw_script
          instant
          return_output
          return_output_type
        }
        
        QueryQueue {
          id
          Queries {
            id
            order
            statement
            path
            return_output
            print_headers
            separator
            chunks
            trim_columns
            force_dot_decimal_separator
            date_format
            target_encoding
            retry_count
            retry_after_milliseconds
            SQLConn {
              id
              driver
              connection_string
              name
            }
          }
        }
        
        SFTPDownloader {
          id
          SFTPLink {
            id
            server
            port
            user
            name
          }
          FileStreamSftpDownloaders {
            id
            input
            output
            return_output
          }
        }
        
        SFTPUploader {
          id
          SFTPLink {
            id
            server
            port
            user
            name
          }
          FileStreamSftpUploaders {
            id
            input
            output
            return_output
          }
        }
        
        Zip {
          id
          zip_name
          FileStreamZips {
            id
            input
            wildcard_exp
          }
        }
        
        Unzip {
          id
          FileStreamUnzips {
            id
            input
            output
            return_output
          }
        }
        
        CallPipeline {
          id
          pipeline_id
          timeout_milliseconds
          Pipeline {
            id
            name
            description
          }
        }
      }
    }
  }
`;

// Query para listar todos los pipelines
const PIPELINES_LIST_QUERY = `
  query GetPipelinesList {
    merlin_agent_Pipeline {
      id
      name
      description
      abort_on_error
      abort_on_timeout
      continue_on_error
    }
  }
`;

/**
 * Pipeline Manager - Clase centralizada para manejar pipelines
 */
export class PipelineManager {
  private static instance: PipelineManager;

  public static getInstance(): PipelineManager {
    if (!PipelineManager.instance) {
      PipelineManager.instance = new PipelineManager();
    }
    return PipelineManager.instance;
  }

  /**
   * Detecta el tipo de runner de una unidad
   */
  public detectRunnerType(unit: PipelineUnit): RunnerType {
    if (unit.command_id) return "Command";
    if (unit.query_queue_id) return "QueryQueue";
    if (unit.sftp_downloader_id) return "SFTPDownloader";
    if (unit.sftp_uploader_id) return "SFTPUploader";
    if (unit.zip_id) return "Zip";
    if (unit.unzip_id) return "Unzip";
    if (unit.call_pipeline_id) return "CallPipeline";
    throw new Error("Unknown runner type");
  }

  /**
   * Construye la cadena jerárquica de unidades (Algoritmo del Orchestator)
   */
  public buildPipelineChain(units: PipelineUnit[]): PipelineUnitChain[] {
    // 1. Encontrar unidades raíz (pipeline_unit_id === null)
    const roots = units.filter(unit => unit.pipeline_unit_id === null);
    
    // 2. Para cada raíz, construir recursivamente sus hijos
    return roots.map(root => ({
      Unit: root,
      Children: this.getChildren(root.id, units)
    }));
  }

  private getChildren(parentId: string, allUnits: PipelineUnit[]): PipelineUnitChain[] {
    const children = allUnits.filter(unit => unit.pipeline_unit_id === parentId);
    
    return children.map(child => ({
      Unit: child,
      Children: this.getChildren(child.id, allUnits) // Recursivo
    }));
  }

  /**
   * Obtiene información detallada de tooltip para una unidad
   */
  public getUnitTooltipInfo(unit: PipelineUnit): string {
    const runnerType = this.detectRunnerType(unit);
    
    switch(runnerType) {
      case "Command":
        const cmd = unit.Command;
        return cmd ? `${cmd.target} ${cmd.args || ''}` : "Comando del sistema";
      case "QueryQueue":
        const queue = unit.QueryQueue;
        return queue?.Queries ? `${queue.Queries.length} consultas SQL` : "Cola de consultas";
      case "SFTPDownloader":
        const downloader = unit.SFTPDownloader;
        return downloader?.SFTPLink ? `Descargar desde ${downloader.SFTPLink.server}` : "Descarga SFTP";
      case "SFTPUploader":
        const uploader = unit.SFTPUploader;
        return uploader?.SFTPLink ? `Subir a ${uploader.SFTPLink.server}` : "Subida SFTP";
      case "Zip":
        const zip = unit.Zip;
        return zip ? `Comprimir a ${zip.zip_name}` : "Compresión";
      case "Unzip":
        const unzip = unit.Unzip;
        return unzip?.FileStreamUnzips ? `Descomprimir ${unzip.FileStreamUnzips.length} archivos` : "Descompresión";
      case "CallPipeline":
        const pipeline = unit.CallPipeline;
        return pipeline?.Pipeline ? `Llamar: ${pipeline.Pipeline.name}` : "Llamada a pipeline";
      default:
        return "Unidad de pipeline";
    }
  }

  /**
   * Obtiene un pipeline completo con todas sus unidades y relaciones
   */
  public async getPipelineComplete(pipelineId: string): Promise<Pipeline | null> {
    try {
      const result = await executeQuery(PIPELINE_COMPLETE_QUERY, { pipelineId });
      
      if (result.data?.merlin_agent_Pipeline_by_pk) {
        const pipeline = result.data.merlin_agent_Pipeline_by_pk;
        
        // Ordenar queries dentro de cada QueryQueue
        if (pipeline.PipelineUnits) {
          pipeline.PipelineUnits.forEach((unit: PipelineUnit) => {
            if (unit.QueryQueue?.Queries) {
              unit.QueryQueue.Queries.sort((a: Query, b: Query) => a.order - b.order);
            }
          });
        }
        
        return pipeline;
      }
      
      return null;
    } catch (error) {
      console.error("Error fetching pipeline complete:", error);
      throw error;
    }
  }

  /**
   * Obtiene la lista de todos los pipelines
   */
  public async getPipelinesList(): Promise<Pipeline[]> {
    try {
      const result = await executeQuery(PIPELINES_LIST_QUERY);
      return result.data?.merlin_agent_Pipeline || [];
    } catch (error) {
      console.error("Error fetching pipelines list:", error);
      throw error;
    }
  }

  /**
   * Obtiene solo las unidades de un pipeline específico
   */
  public async getPipelineUnits(pipelineId: string): Promise<PipelineUnit[]> {
    const pipeline = await this.getPipelineComplete(pipelineId);
    return pipeline?.PipelineUnits || [];
  }

  /**
   * Valida si una cadena de pipeline es válida
   */
  public validatePipelineChain(chain: PipelineUnitChain[]): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Validar que hay al menos una unidad raíz
    if (chain.length === 0) {
      errors.push("Pipeline debe tener al menos una unidad raíz");
    }
    
    // Validar cada unidad recursivamente
    const validateUnit = (unitChain: PipelineUnitChain, depth: number = 0) => {
      const { Unit: unit } = unitChain;
      
      // Validar que cada unidad tiene exactamente un tipo de runner
      const runnerIds = [
        unit.command_id,
        unit.query_queue_id,
        unit.sftp_downloader_id,
        unit.sftp_uploader_id,
        unit.zip_id,
        unit.unzip_id,
        unit.call_pipeline_id
      ].filter(id => id !== null && id !== undefined);
      
      if (runnerIds.length !== 1) {
        errors.push(`Unidad ${unit.id} debe tener exactamente un tipo de runner (tiene ${runnerIds.length})`);
      }
      
      // Validar configuración básica
      if (unit.retry_count < 0) {
        errors.push(`Unidad ${unit.id} tiene retry_count inválido: ${unit.retry_count}`);
      }
      
      if (unit.timeout_milliseconds <= 0) {
        errors.push(`Unidad ${unit.id} tiene timeout inválido: ${unit.timeout_milliseconds}`);
      }
      
      // Validar hijos recursivamente
      unitChain.Children.forEach(child => validateUnit(child, depth + 1));
    };
    
    chain.forEach(rootChain => validateUnit(rootChain));
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Cuenta el total de unidades en una cadena
   */
  public countUnits(chain: PipelineUnitChain[]): number {
    const countChain = (unitChain: PipelineUnitChain): number => {
      return 1 + unitChain.Children.reduce((sum, child) => sum + countChain(child), 0);
    };
    
    return chain.reduce((total, rootChain) => total + countChain(rootChain), 0);
  }

  /**
   * Obtiene estadísticas de tipos de runners en un pipeline
   */
  public getRunnerTypeStats(units: PipelineUnit[]): Record<RunnerType, number> {
    const stats: Record<RunnerType, number> = {
      Command: 0,
      QueryQueue: 0,
      SFTPDownloader: 0,
      SFTPUploader: 0,
      Zip: 0,
      Unzip: 0,
      CallPipeline: 0
    };
    
    units.forEach(unit => {
      try {
        const type = this.detectRunnerType(unit);
        stats[type]++;
      } catch (error) {
        console.warn(`Error detecting runner type for unit ${unit.id}:`, error);
      }
    });
    
    return stats;
  }

  /**
   * Busca unidades por tipo de runner
   */
  public findUnitsByRunnerType(units: PipelineUnit[], runnerType: RunnerType): PipelineUnit[] {
    return units.filter(unit => {
      try {
        return this.detectRunnerType(unit) === runnerType;
      } catch {
        return false;
      }
    });
  }

  /**
   * Obtiene la profundidad máxima de un pipeline
   */
  public getMaxDepth(chain: PipelineUnitChain[]): number {
    const getChainDepth = (unitChain: PipelineUnitChain, currentDepth: number = 1): number => {
      if (unitChain.Children.length === 0) {
        return currentDepth;
      }
      
      return Math.max(
        ...unitChain.Children.map(child => getChainDepth(child, currentDepth + 1))
      );
    };
    
    if (chain.length === 0) return 0;
    
    return Math.max(...chain.map(rootChain => getChainDepth(rootChain)));
  }
}

// Exportar instancia singleton
export const pipelineManager = PipelineManager.getInstance();