import * as yaml from 'yaml';

// Interfaces según documentación
export interface PipelineYAML {
  name: string;
  description?: string;
  agent_passport_id: string;
  abort_on_error?: boolean;
  abort_on_timeout?: boolean;
  continue_on_error?: boolean;
  units: PipelineUnitYAML[];
  connections?: ConnectionYAML[];
}

export interface PipelineUnitYAML {
  id: string;
  type: string;
  name: string;
  position: {
    x: number;
    y: number;
  };
  execution_config: {
    retry_count?: number;
    retry_after_milliseconds?: number;
    timeout_milliseconds?: number;
    continue_on_error?: boolean;
    abort_on_error?: boolean;
    abort_on_timeout?: boolean;
  };
  runner_config: any;
  connections?: string[];
}

export interface ConnectionYAML {
  from: string;
  to: string;
  type: 'dependency' | 'data_flow';
}

// Función para detectar tipo según documentación
function detectRunnerType(unit: any): string {
  if (unit.command_id) return 'command';
  if (unit.query_queue_id) return 'query_queue';
  if (unit.sftp_downloader_id) return 'sftp_downloader';
  if (unit.sftp_uploader_id) return 'sftp_uploader';
  if (unit.zip_id) return 'zip';
  if (unit.unzip_id) return 'unzip';
  if (unit.call_pipeline) return 'call_pipeline';
  return 'unknown';
}

// Función para obtener nombre descriptivo
function getUnitName(unit: any): string {
  const type = detectRunnerType(unit);
  
  if (unit.Command && unit.Command.target) {
    return `${unit.Command.target} ${unit.Command.args || ''}`.trim();
  }
  if (unit.QueryQueue && unit.QueryQueue.Queries && unit.QueryQueue.Queries.length > 0) {
    return `${unit.QueryQueue.Queries.length} consultas SQL`;
  }
  if (unit.SFTPDownloader && unit.SFTPDownloader.SFTPLink) {
    return `Descargar desde ${unit.SFTPDownloader.SFTPLink.server}`;
  }
  if (unit.SFTPUploader && unit.SFTPUploader.SFTPLink) {
    return `Subir a ${unit.SFTPUploader.SFTPLink.server}`;
  }
  if (unit.Zip && unit.Zip.zip_name) {
    return `Comprimir a ${unit.Zip.zip_name}`;
  }
  if (unit.Unzip && unit.Unzip.FileStreamUnzips && unit.Unzip.FileStreamUnzips.length > 0) {
    return `Descomprimir ${unit.Unzip.FileStreamUnzips.length} archivos`;
  }
  if (unit.call_pipeline) {
    return `Llamar pipeline ${unit.call_pipeline}`;
  }
  
  return `${type.toUpperCase()} ${unit.id?.slice(-4) || 'N/A'}`;
}

// Función para extraer configuración completa según documentación
function extractRunnerConfig(unit: any): any {
  const config: any = {};
  
  if (unit.command_id && unit.Command) {
    // Command Runner según documentación
    const command = unit.Command;
    config.command_id = unit.command_id;
    config.target = command.target;
    if (command.args) config.args = command.args;
    if (command.working_directory) config.working_directory = command.working_directory;
    if (command.raw_script) config.raw_script = command.raw_script;
    config.instant = command.instant;
    config.return_output = command.return_output;
    config.return_output_type = command.return_output_type;
    
  } else if (unit.query_queue_id && unit.QueryQueue) {
    // QueryQueue Runner según documentación
    const queryQueue = unit.QueryQueue;
    config.query_queue_id = unit.query_queue_id;
    
    if (queryQueue.Queries && queryQueue.Queries.length > 0) {
      config.queries = queryQueue.Queries.sort((a: any, b: any) => a.order - b.order).map((query: any) => ({
        id: query.id,
        order: query.order,
        statement: query.statement,
        path: query.path,
        return_output: query.return_output,
        print_headers: query.print_headers,
        separator: query.separator,
        chunks: query.chunks,
        trim_columns: query.trim_columns,
        force_dot_decimal_separator: query.force_dot_decimal_separator,
        date_format: query.date_format,
        target_encoding: query.target_encoding,
        retry_count: query.retry_count,
        retry_after_milliseconds: query.retry_after_milliseconds,
        sql_connection: query.SQLConn ? {
          id: query.SQLConn.id,
          name: query.SQLConn.name,
          driver: query.SQLConn.driver,
          connection_string: query.SQLConn.connection_string
        } : null
      }));
    }
    
  } else if (unit.sftp_downloader_id && unit.SFTPDownloader) {
    // SFTPDownloader según documentación
    const sftp = unit.SFTPDownloader;
    config.sftp_downloader_id = unit.sftp_downloader_id;
    
    if (sftp.SFTPLink) {
      config.sftp_connection = {
        id: sftp.SFTPLink.id,
        server: sftp.SFTPLink.server,
        port: sftp.SFTPLink.port,
        user: sftp.SFTPLink.user,
        name: sftp.SFTPLink.name
      };
    }
    
    if (sftp.FileStreamSftpDownloaders && sftp.FileStreamSftpDownloaders.length > 0) {
      config.file_streams = sftp.FileStreamSftpDownloaders.map((stream: any) => ({
        id: stream.id,
        input: stream.input,   // Ruta remota
        output: stream.output, // Ruta local
        return_output: stream.return_output
      }));
    }
    
  } else if (unit.sftp_uploader_id && unit.SFTPUploader) {
    // SFTPUploader según documentación
    const sftp = unit.SFTPUploader;
    config.sftp_uploader_id = unit.sftp_uploader_id;
    
    if (sftp.SFTPLink) {
      config.sftp_connection = {
        id: sftp.SFTPLink.id,
        server: sftp.SFTPLink.server,
        port: sftp.SFTPLink.port,
        user: sftp.SFTPLink.user,
        name: sftp.SFTPLink.name
      };
    }
    
    if (sftp.FileStreamSftpUploaders && sftp.FileStreamSftpUploaders.length > 0) {
      config.file_streams = sftp.FileStreamSftpUploaders.map((stream: any) => ({
        id: stream.id,
        input: stream.input,   // Ruta local
        output: stream.output, // Ruta remota
        return_output: stream.return_output
      }));
    }
    
  } else if (unit.zip_id && unit.Zip) {
    // Zip Runner según documentación
    const zip = unit.Zip;
    config.zip_id = unit.zip_id;
    config.zip_name = zip.zip_name;
    
    if (zip.FileStreamZips && zip.FileStreamZips.length > 0) {
      config.file_streams = zip.FileStreamZips.map((stream: any) => ({
        id: stream.id,
        input: stream.input,
        wildcard_exp: stream.wildcard_exp
      }));
    }
    
  } else if (unit.unzip_id && unit.Unzip) {
    // Unzip Runner según documentación
    const unzip = unit.Unzip;
    config.unzip_id = unit.unzip_id;
    
    if (unzip.FileStreamUnzips && unzip.FileStreamUnzips.length > 0) {
      config.file_streams = unzip.FileStreamUnzips.map((stream: any) => ({
        id: stream.id,
        input: stream.input,   // Archivo ZIP
        output: stream.output, // Directorio destino
        return_output: stream.return_output
      }));
    }
    
  } else if (unit.call_pipeline) {
    // CallPipeline Runner según documentación
    config.call_pipeline = unit.call_pipeline;
  }
  
  return config;
}

// Función principal para convertir pipeline a YAML
export function convertPipelineToYaml(pipelineData: any): string {
  try {
    const units = pipelineData.units || [];
    
    // Construir dependencias (padre-hijo según documentación)
    const connections: ConnectionYAML[] = [];
    units.forEach((unit: any) => {
      if (unit.pipeline_unit_id) {
        connections.push({
          from: unit.pipeline_unit_id,
          to: unit.id,
          type: 'dependency'
        });
      }
    });
    
    const yamlData: PipelineYAML = {
      name: pipelineData.name || 'Pipeline sin nombre',
      description: pipelineData.description || '',
      agent_passport_id: pipelineData.agent_passport_id || '',
      abort_on_error: pipelineData.abort_on_error,
      abort_on_timeout: pipelineData.abort_on_timeout,
      continue_on_error: pipelineData.continue_on_error,
      units: units.map((unit: any) => ({
        id: unit.id,
        type: detectRunnerType(unit),
        name: getUnitName(unit),
        position: {
          x: unit.posx || 0,
          y: unit.posy || 0
        },
        execution_config: {
          retry_count: unit.retry_count,
          retry_after_milliseconds: unit.retry_after_milliseconds,
          timeout_milliseconds: unit.timeout_milliseconds,
          continue_on_error: unit.continue_on_error,
          abort_on_error: unit.abort_on_timeout,
          abort_on_timeout: unit.abort_on_timeout
        },
        runner_config: extractRunnerConfig(unit),
        connections: unit.pipeline_unit_id ? [unit.pipeline_unit_id] : undefined
      })),
      connections: connections.length > 0 ? connections : undefined
    };
    
    return yaml.stringify(yamlData, {
      indent: 2,
      lineWidth: 120,
      nullStr: 'null'
    });
    
  } catch (error) {
    console.error("Error al convertir a YAML:", error);
    throw new Error(`No se pudo convertir el pipeline a formato YAML: ${error instanceof Error ? error.message : 'Error desconocido'}`);
  }
}