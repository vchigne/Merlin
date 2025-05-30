import * as yaml from 'yaml';

// Usar la misma lógica que PipelineVisualizerNew que ya funciona

// Función para detectar el tipo de unidad (copiada del visualizador)
function detectUnitType(unit: any) {
  if (unit.command_id) return { type: 'Command', category: 'standard' };
  if (unit.query_queue_id) return { type: 'SQL Query', category: 'standard' };
  if (unit.sftp_downloader_id) return { type: 'SFTP Download', category: 'standard' };
  if (unit.sftp_uploader_id) return { type: 'SFTP Upload', category: 'standard' };
  if (unit.zip_id) return { type: 'Zip Files', category: 'standard' };
  if (unit.unzip_id) return { type: 'Unzip Files', category: 'standard' };
  if (unit.call_pipeline) return { type: 'Pipeline Call', category: 'standard' };
  return { type: 'Unknown', category: 'unknown' };
}

// Función para obtener el nombre de la unidad (copiada del visualizador)
function getUnitDisplayName(unit: any) {
  const type = detectUnitType(unit);
  
  if (unit.command_id && unit.Command) {
    return unit.Command.name || `Comando ${unit.id?.slice(-4) || 'CMD'}`;
  }
  if (unit.query_queue_id && unit.QueryQueue) {
    return unit.QueryQueue.name || `Cola de consultas ${unit.id?.slice(-4) || 'SQL'}`;
  }
  if (unit.sftp_downloader_id && unit.SFTPDownloader) {
    return unit.SFTPDownloader.name || `Descarga SFTP ${unit.id?.slice(-4) || 'DWN'}`;
  }
  if (unit.sftp_uploader_id && unit.SFTPUploader) {
    return unit.SFTPUploader.name || `Subida SFTP ${unit.id?.slice(-4) || 'UPL'}`;
  }
  if (unit.zip_id && unit.Zip) {
    return unit.Zip.name || `Compresión ZIP ${unit.id?.slice(-4) || 'ZIP'}`;
  }
  if (unit.unzip_id && unit.Unzip) {
    return unit.Unzip.name || `Extracción ${unit.id?.slice(-4) || 'UNZ'}`;
  }
  if (unit.call_pipeline && unit.Pipeline) {
    return unit.Pipeline.name || `Pipeline ${unit.id?.slice(-4) || 'PIP'}`;
  }
  
  // Fallback para casos donde no hay relación disponible
  if (unit.command_id) {
    return `Comando ${unit.id?.slice(-4) || 'CMD'}`;
  }
  if (unit.query_queue_id) {
    return `Cola de consultas ${unit.id?.slice(-4) || 'SQL'}`;
  }
  if (unit.sftp_downloader_id) {
    return `Descarga SFTP ${unit.id?.slice(-4) || 'DWN'}`;
  }
  if (unit.sftp_uploader_id) {
    return `Subida SFTP ${unit.id?.slice(-4) || 'UPL'}`;
  }
  if (unit.zip_id) {
    return `Compresión ZIP ${unit.id?.slice(-4) || 'ZIP'}`;
  }
  if (unit.unzip_id) {
    return `Extracción ${unit.id?.slice(-4) || 'UNZ'}`;
  }
  if (unit.call_pipeline) {
    return `Pipeline ${unit.id?.slice(-4) || 'PIP'}`;
  }
  
  return `${type.type} #${unit.id?.slice(-4) || 'N/A'}`;
}

// Función para obtener la descripción (copiada del visualizador)
function getDisplayDescription(unit: any) {
  if (unit.command_id && unit.Command) {
    return unit.Command.description || 'Ejecución de comando de sistema';
  }
  if (unit.query_queue_id && unit.QueryQueue) {
    return unit.QueryQueue.description || 'Ejecución de consultas SQL';
  }
  if (unit.sftp_downloader_id && unit.SFTPDownloader) {
    return unit.SFTPDownloader.description || 'Descarga de archivos por SFTP';
  }
  if (unit.sftp_uploader_id && unit.SFTPUploader) {
    return unit.SFTPUploader.description || 'Subida de archivos por SFTP';
  }
  if (unit.zip_id && unit.Zip) {
    return unit.Zip.description || 'Compresión de archivos';
  }
  if (unit.unzip_id && unit.Unzip) {
    return unit.Unzip.description || 'Extracción de archivos comprimidos';
  }
  if (unit.call_pipeline && unit.Pipeline) {
    return unit.Pipeline.description || 'Llamada a otro pipeline';
  }
  
  return 'Descripción no disponible';
}

// Función para extraer configuración detallada (usando la misma lógica que el visualizador)
function extractDetailedConfig(unit: any) {
  const config: any = {};
  
  // Agregar campos comunes de PipelineUnit
  config.unit_id = unit.id;
  config.retry_count = unit.retry_count || 0;
  config.retry_after_milliseconds = unit.retry_after_milliseconds || 0;
  config.timeout_milliseconds = unit.timeout_milliseconds || 30000;
  config.continue_on_error = unit.continue_on_error || false;
  config.abort_on_timeout = unit.abort_on_timeout || false;
  config.parent_unit = unit.pipeline_unit_id || null;
  
  // Extraer configuración específica según el tipo
  if (unit.command_id) {
    config.command_id = unit.command_id;
    if (unit.Command) {
      config.command_details = {
        name: unit.Command.name,
        description: unit.Command.description,
        target: unit.Command.target,
        args: unit.Command.args,
        working_directory: unit.Command.working_directory,
        raw_script: unit.Command.raw_script,
        instant: unit.Command.instant,
        return_output: unit.Command.return_output,
        return_output_type: unit.Command.return_output_type
      };
    } else {
      // Solo tenemos el ID, necesitamos cargar los detalles
      config.command_details = {
        note: "Detalles del comando disponibles en la visualización completa",
        command_reference: unit.command_id,
        target: "Ver configuración en el visualizador del pipeline",
        args: "Ver configuración en el visualizador del pipeline",
        working_directory: "Ver configuración en el visualizador del pipeline"
      };
    }
  }
  
  if (unit.query_queue_id) {
    config.query_queue_id = unit.query_queue_id;
    if (unit.QueryQueue) {
      config.query_details = {
        name: unit.QueryQueue.name,
        description: unit.QueryQueue.description,
        queries: unit.QueryQueue.Queries?.map((q: any) => ({
          id: q.id,
          order: q.order,
          statement: q.statement,
          path: q.path,
          return_output: q.return_output,
          sql_connection: q.SQLConn ? {
            name: q.SQLConn.name,
            driver: q.SQLConn.driver,
            connection_string: q.SQLConn.connection_string
          } : null
        })) || []
      };
    }
  }
  
  if (unit.sftp_downloader_id) {
    config.sftp_downloader_id = unit.sftp_downloader_id;
    if (unit.SFTPDownloader) {
      config.sftp_download_details = {
        name: unit.SFTPDownloader.name,
        description: unit.SFTPDownloader.description,
        sftp_connection: unit.SFTPDownloader.SFTPLink ? {
          name: unit.SFTPDownloader.SFTPLink.name,
          server: unit.SFTPDownloader.SFTPLink.server,
          port: unit.SFTPDownloader.SFTPLink.port,
          user: unit.SFTPDownloader.SFTPLink.user
        } : null,
        file_streams: unit.SFTPDownloader.FileStreamSftpDownloaders?.map((fs: any) => ({
          input: fs.input,
          output: fs.output,
          return_output: fs.return_output
        })) || []
      };
    }
  }
  
  if (unit.sftp_uploader_id) {
    config.sftp_uploader_id = unit.sftp_uploader_id;
    if (unit.SFTPUploader) {
      config.sftp_upload_details = {
        name: unit.SFTPUploader.name,
        description: unit.SFTPUploader.description,
        sftp_connection: unit.SFTPUploader.SFTPLink ? {
          name: unit.SFTPUploader.SFTPLink.name,
          server: unit.SFTPUploader.SFTPLink.server,
          port: unit.SFTPUploader.SFTPLink.port,
          user: unit.SFTPUploader.SFTPLink.user
        } : null,
        file_streams: unit.SFTPUploader.FileStreamSftpUploaders?.map((fs: any) => ({
          input: fs.input,
          output: fs.output,
          return_output: fs.return_output
        })) || []
      };
    }
  }
  
  if (unit.zip_id) {
    config.zip_id = unit.zip_id;
    if (unit.Zip) {
      config.zip_details = {
        name: unit.Zip.name,
        description: unit.Zip.description,
        zip_name: unit.Zip.zip_name,
        file_streams: unit.Zip.FileStreamZips?.map((fs: any) => ({
          input: fs.input,
          wildcard_exp: fs.wildcard_exp
        })) || []
      };
    }
  }
  
  if (unit.unzip_id) {
    config.unzip_id = unit.unzip_id;
    if (unit.Unzip) {
      config.unzip_details = {
        name: unit.Unzip.name,
        description: unit.Unzip.description,
        file_streams: unit.Unzip.FileStreamUnzips?.map((fs: any) => ({
          input: fs.input,
          output: fs.output,
          return_output: fs.return_output
        })) || []
      };
    }
  }
  
  if (unit.call_pipeline) {
    config.call_pipeline = unit.call_pipeline;
    if (unit.Pipeline) {
      config.pipeline_call_details = {
        name: unit.Pipeline.name,
        description: unit.Pipeline.description
      };
    }
  }
  
  return config;
}

// Función principal que usa la misma lógica del visualizador
export function convertPipelineToYaml(pipelineData: any): string {
  try {
    const units = pipelineData.units || [];
    
    // Usar la misma lógica de procesamiento que el visualizador
    const processedUnits = units.map((unit: any) => {
      const type = detectUnitType(unit);
      const name = getUnitDisplayName(unit);
      const description = getDisplayDescription(unit);
      const detailedConfig = extractDetailedConfig(unit);
      
      return {
        id: unit.id,
        type: type.type,
        category: type.category,
        name: name,
        description: description,
        position: {
          x: unit.posx || 0,
          y: unit.posy || 0
        },
        configuration: detailedConfig,
        created_at: unit.created_at,
        updated_at: unit.updated_at
      };
    });
    
    // Construir dependencias (relaciones padre-hijo)
    const dependencies = units.filter((unit: any) => unit.pipeline_unit_id).map((unit: any) => ({
      from: unit.pipeline_unit_id,
      to: unit.id,
      type: 'dependency'
    }));
    
    const yamlData = {
      pipeline: {
        id: pipelineData.id,
        name: pipelineData.name || 'Pipeline sin nombre',
        description: pipelineData.description || '',
        agent_passport_id: pipelineData.agent_passport_id || '',
        configuration: {
          abort_on_error: pipelineData.abort_on_error || false,
          abort_on_timeout: pipelineData.abort_on_timeout || false,
          continue_on_error: pipelineData.continue_on_error || false
        },
        created_at: pipelineData.created_at,
        updated_at: pipelineData.updated_at
      },
      units: processedUnits,
      dependencies: dependencies,
      metadata: {
        total_units: units.length,
        generated_at: new Date().toISOString(),
        has_dependencies: dependencies.length > 0
      }
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