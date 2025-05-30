// Pipeline YAML Converter
// Convierte entre formato de pipeline de Merlin y YAML

export interface PipelineYamlStructure {
  name: string;
  description?: string;
  agent_passport_id?: string;
  abort_on_error?: boolean;
  disposable?: boolean;
  units: PipelineUnitYaml[];
}

export interface PipelineUnitYaml {
  id: string;
  type: string;
  name: string;
  description?: string;
  position: { x: number; y: number };
  configuration: {
    [key: string]: any;
  };
  error_handling?: {
    continue_on_error?: boolean;
    retry_count?: number;
    retry_after_milliseconds?: number;
    timeout_milliseconds?: number;
    abort_on_timeout?: boolean;
    notify_on_error_email?: string;
    notify_on_error_webhook?: string;
    notify_on_timeout_email?: string;
    notify_on_timeout_webhook?: string;
  };
  connections?: string[];
}

// Función para detectar el tipo de unidad según documentación
function detectUnitType(unit: any): string {
  if (unit.command_id) return 'command';
  if (unit.query_queue_id) return 'query_queue';
  if (unit.sftp_downloader_id) return 'sftp_downloader';
  if (unit.sftp_uploader_id) return 'sftp_uploader';
  if (unit.zip_id) return 'zip';
  if (unit.unzip_id) return 'unzip';
  if (unit.call_pipeline_id) return 'call_pipeline';
  return 'unknown';
}

// Función para obtener el nombre de la unidad
function getUnitName(unit: any): string {
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
  if (unit.call_pipeline_id && unit.CallPipeline && unit.CallPipeline.Pipeline) {
    return unit.CallPipeline.Pipeline.name || `Pipeline ${unit.id?.slice(-4) || 'PIP'}`;
  }
  
  return `Unidad ${unit.id?.slice(-4) || 'N/A'}`;
}

// Función para obtener la descripción de la unidad
function getUnitDescription(unit: any): string | undefined {
  if (unit.command_id && unit.Command && unit.Command.description) {
    return unit.Command.description;
  }
  if (unit.query_queue_id && unit.QueryQueue && unit.QueryQueue.description) {
    return unit.QueryQueue.description;
  }
  if (unit.sftp_downloader_id && unit.SFTPDownloader && unit.SFTPDownloader.description) {
    return unit.SFTPDownloader.description;
  }
  if (unit.sftp_uploader_id && unit.SFTPUploader && unit.SFTPUploader.description) {
    return unit.SFTPUploader.description;
  }
  if (unit.zip_id && unit.Zip && unit.Zip.description) {
    return unit.Zip.description;
  }
  if (unit.unzip_id && unit.Unzip && unit.Unzip.description) {
    return unit.Unzip.description;
  }
  if (unit.call_pipeline && unit.Pipeline && unit.Pipeline.description) {
    return unit.Pipeline.description;
  }
  
  return undefined;
}

// Función para obtener la configuración específica de la unidad
function getUnitConfiguration(unit: any): { [key: string]: any } {
  const config: { [key: string]: any } = {};
  
  // Configuración específica por tipo de unidad
  if (unit.command_id && unit.Command) {
    // Unidad de comando - Command table
    const cmd = unit.Command;
    config.command_id = unit.command_id;
    if (cmd.target) config.target = cmd.target;
    if (cmd.working_directory) config.working_directory = cmd.working_directory;
    if (cmd.args) config.args = cmd.args;
    if (cmd.raw_script) config.raw_script = cmd.raw_script;
    if (cmd.return_output !== undefined) config.return_output = cmd.return_output;
    if (cmd.return_output_type) config.return_output_type = cmd.return_output_type;
    if (cmd.instant !== undefined) config.instant = cmd.instant;
    if (cmd.labels && cmd.labels.length > 0) config.labels = cmd.labels;
    
  } else if (unit.query_queue_id && unit.QueryQueue) {
    // Unidad de query queue - QueryQueue table + Query table (según documentación)
    const qq = unit.QueryQueue;
    config.query_queue_id = unit.query_queue_id;
    if (qq.name) config.queue_name = qq.name;
    if (qq.description) config.queue_description = qq.description;
    
    // Agregar queries siguiendo la estructura de la documentación
    if (qq.Queries && qq.Queries.length > 0) {
      config.queries = qq.Queries.map((query: any) => {
        const queryConfig: any = {};
        if (query.order !== undefined) queryConfig.order = query.order;
        if (query.statement) queryConfig.statement = query.statement; // Nombre correcto según docs
        if (query.path) queryConfig.path = query.path;
        if (query.print_headers !== undefined) queryConfig.print_headers = query.print_headers;
        if (query.return_output !== undefined) queryConfig.return_output = query.return_output;
        if (query.separator) queryConfig.separator = query.separator;
        if (query.chunks) queryConfig.chunks = query.chunks;
        if (query.trim_columns !== undefined) queryConfig.trim_columns = query.trim_columns;
        if (query.force_dot_decimal_separator !== undefined) queryConfig.force_dot_decimal_separator = query.force_dot_decimal_separator;
        if (query.date_format) queryConfig.date_format = query.date_format;
        if (query.target_encoding) queryConfig.target_encoding = query.target_encoding;
        if (query.retry_count) queryConfig.retry_count = query.retry_count;
        if (query.retry_after_milliseconds) queryConfig.retry_after_milliseconds = query.retry_after_milliseconds;
        
        // Información de conexión SQL según estructura de documentación
        if (query.SQLConn) {
          queryConfig.sql_connection = {
            name: query.SQLConn.name,
            driver: query.SQLConn.driver,
            connection_string: query.SQLConn.connection_string
          };
        }
        
        return queryConfig;
      });
    }
    
  } else if (unit.sftp_downloader_id) {
    // Unidad de descarga SFTP
    config.sftp_downloader_id = unit.sftp_downloader_id;
    config.note = "Configuración SFTP completa disponible en la base de datos";
    
  } else if (unit.sftp_uploader_id) {
    // Unidad de carga SFTP
    config.sftp_uploader_id = unit.sftp_uploader_id;
    config.note = "Configuración SFTP completa disponible en la base de datos";
    
  } else if (unit.zip_id) {
    // Unidad de compresión
    config.zip_id = unit.zip_id;
    config.note = "Configuración de archivos a comprimir disponible en la base de datos";
    
  } else if (unit.unzip_id) {
    // Unidad de descompresión
    config.unzip_id = unit.unzip_id;
    config.note = "Configuración de archivos a extraer disponible en la base de datos";
    
  } else if (unit.call_pipeline || unit.call_pipeline_id) {
    // Pipeline Call
    config.call_pipeline = unit.call_pipeline || unit.call_pipeline_id;
    config.note = "Información del pipeline llamado disponible en la base de datos";
  }
  
  return config;
}

// Convertir pipeline de Merlin a YAML
export function convertPipelineToYaml(pipelineData: any, pipelineUnits: any[]): string {
  const yamlStructure: PipelineYamlStructure = {
    name: pipelineData.name || 'Pipeline sin nombre',
    description: pipelineData.description || undefined,
    agent_passport_id: pipelineData.agent_passport_id || undefined,
    abort_on_error: pipelineData.abort_on_error || false,
    disposable: pipelineData.disposable || false,
    units: []
  };

  // Convertir cada unidad
  pipelineUnits.forEach((unit, index) => {
    const unitYaml: PipelineUnitYaml = {
      id: unit.id,
      type: detectUnitType(unit),
      name: getUnitName(unit),
      position: {
        x: unit.posx || (index * 200 + 50),
        y: unit.posy || (Math.floor(index / 3) * 200 + 150)
      },
      configuration: getUnitConfiguration(unit)
    };

    // Agregar descripción si existe
    const description = getUnitDescription(unit);
    if (description) {
      unitYaml.description = description;
    }

    // Agregar manejo de errores si está presente
    if (unit.continue_on_error !== undefined || 
        unit.retry_count !== undefined || 
        unit.retry_after_milliseconds !== undefined ||
        unit.timeout_milliseconds !== undefined ||
        unit.abort_on_timeout !== undefined ||
        unit.notify_on_error_email ||
        unit.notify_on_error_webhook ||
        unit.notify_on_timeout_email ||
        unit.notify_on_timeout_webhook) {
      
      unitYaml.error_handling = {};
      
      if (unit.continue_on_error !== undefined) {
        unitYaml.error_handling.continue_on_error = unit.continue_on_error;
      }
      if (unit.retry_count !== undefined) {
        unitYaml.error_handling.retry_count = unit.retry_count;
      }
      if (unit.retry_after_milliseconds !== undefined) {
        unitYaml.error_handling.retry_after_milliseconds = unit.retry_after_milliseconds;
      }
      if (unit.timeout_milliseconds !== undefined) {
        unitYaml.error_handling.timeout_milliseconds = unit.timeout_milliseconds;
      }
      if (unit.abort_on_timeout !== undefined) {
        unitYaml.error_handling.abort_on_timeout = unit.abort_on_timeout;
      }
      if (unit.notify_on_error_email) {
        unitYaml.error_handling.notify_on_error_email = unit.notify_on_error_email;
      }
      if (unit.notify_on_error_webhook) {
        unitYaml.error_handling.notify_on_error_webhook = unit.notify_on_error_webhook;
      }
      if (unit.notify_on_timeout_email) {
        unitYaml.error_handling.notify_on_timeout_email = unit.notify_on_timeout_email;
      }
      if (unit.notify_on_timeout_webhook) {
        unitYaml.error_handling.notify_on_timeout_webhook = unit.notify_on_timeout_webhook;
      }
    }

    yamlStructure.units.push(unitYaml);
  });

  // Convertir a YAML string
  return convertObjectToYaml(yamlStructure);
}

// Función auxiliar para convertir objeto a YAML string
function convertObjectToYaml(obj: any, indent: number = 0): string {
  const spaces = '  '.repeat(indent);
  let yaml = '';

  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) continue;
    
    yaml += `${spaces}${key}:`;
    
    if (value === null) {
      yaml += ' null\n';
    } else if (typeof value === 'string') {
      // Escapar comillas si es necesario
      const escapedValue = value.includes('"') ? `'${value}'` : `"${value}"`;
      yaml += ` ${escapedValue}\n`;
    } else if (typeof value === 'number' || typeof value === 'boolean') {
      yaml += ` ${value}\n`;
    } else if (Array.isArray(value)) {
      if (value.length === 0) {
        yaml += ' []\n';
      } else {
        yaml += '\n';
        value.forEach(item => {
          if (typeof item === 'object') {
            yaml += `${spaces}  -\n`;
            yaml += convertObjectToYaml(item, indent + 2).replace(/^/gm, '    ');
          } else {
            yaml += `${spaces}  - ${item}\n`;
          }
        });
      }
    } else if (typeof value === 'object') {
      yaml += '\n';
      yaml += convertObjectToYaml(value, indent + 1);
    }
  }

  return yaml;
}

// Convertir YAML a estructura de pipeline (función placeholder por ahora)
export function convertYamlToPipeline(yamlContent: string): { pipelineData: any; pipelineUnits: any[] } {
  // TODO: Implementar parser de YAML a estructura de pipeline
  // Por ahora retornamos estructura vacía
  return {
    pipelineData: {
      name: 'Pipeline desde YAML',
      description: 'Convertido desde YAML',
      abort_on_error: false,
      disposable: false
    },
    pipelineUnits: []
  };
}