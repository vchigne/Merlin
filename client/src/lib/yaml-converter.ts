// Utilidades para conversión bidireccional Pipeline ↔ YAML
// Basado en la especificación YAML para Pipelines Merlin

import * as yaml from 'yaml';

// Tipos para la estructura YAML
interface YamlPipeline {
  id: string;
  name: string;
  description?: string;
  configuration: {
    agent_passport_id: string;
    abort_on_error: boolean;
    abort_on_timeout?: boolean;
    continue_on_error?: boolean;
    disposable?: boolean;
  };
  units: YamlUnit[];
}

interface YamlUnit {
  id: string;
  type: string;
  name: string;
  parent_unit_id?: string | null;
  position: {
    x: number;
    y: number;
  };
  execution: {
    retry_count: number;
    retry_after_milliseconds: number;
    timeout_milliseconds: number;
    continue_on_error: boolean;
    abort_on_error: boolean;
    abort_on_timeout: boolean;
  };
  configuration: any;
  connections: Array<{ to: string }>;
}

// Función para detectar el tipo de runner desde PipelineUnit
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

// Función para obtener el nombre real de la unidad
function getUnitDisplayName(unit: any): string {
  // Primero verificar si existe el campo comment de la unidad
  if (unit.comment) {
    return unit.comment;
  }
  
  const runnerType = detectRunnerType(unit);
  
  switch (runnerType) {
    case 'command':
      return unit.Command?.name || unit.Command?.description || `Command: ${unit.Command?.target || 'Unknown'}`;
    case 'query_queue':
      return unit.QueryQueue?.name || unit.QueryQueue?.description || `SQL Query (${unit.QueryQueue?.Queries?.length || 0} queries)`;
    case 'sftp_downloader':
      return unit.SFTPDownloader?.name || unit.SFTPDownloader?.description || `SFTP Download from ${unit.SFTPDownloader?.SFTPLink?.server || 'Unknown'}`;
    case 'sftp_uploader':
      return unit.SFTPUploader?.name || unit.SFTPUploader?.description || `SFTP Upload to ${unit.SFTPUploader?.SFTPLink?.server || 'Unknown'}`;
    case 'zip':
      return unit.Zip?.name || `Zip: ${unit.Zip?.output || 'Unknown'}`;
    case 'unzip':
      return unit.Unzip?.name || `Unzip: ${unit.Unzip?.input || 'Files'}`;
    case 'call_pipeline':
      const calledPipeline = unit.CalledPipeline || {};
      return calledPipeline.name || `Call Pipeline: ${unit.call_pipeline || 'Unknown'}`;
    default:
      return `Unknown Unit Type`;
  }
}

// Función para extraer configuración específica del runner
function extractRunnerConfiguration(unit: any): any {
  const runnerType = detectRunnerType(unit);
  
  switch (runnerType) {
    case 'command':
      if (unit.Command) {
        return {
          target: unit.Command.target || null,
          args: unit.Command.args || null,
          working_directory: unit.Command.working_directory || null,
          raw_script: unit.Command.raw_script || null,
          instant: unit.Command.instant ?? true,
          return_output: unit.Command.return_output ?? true,
          return_output_type: unit.Command.return_output_type || 'PATHS'
        };
      }
      return {};
      
    case 'query_queue':
      if (unit.QueryQueue) {
        return {
          queries: unit.QueryQueue.Queries?.map((query: any, index: number) => ({
            order: query.order || index + 1,
            statement: query.query_string || query.statement || null,
            path: query.path || null,
            sql_connection: query.SQLConn ? {
              driver: query.SQLConn.driver || 'MSSQL',
              connection_string: query.SQLConn.connstring || query.SQLConn.connection_string || null,
              name: query.SQLConn.name || null
            } : null,
            output_settings: {
              return_output: query.return_output ?? true,
              print_headers: query.print_headers ?? true,
              separator: query.separator || ',',
              chunks: query.chunks || 1000,
              trim_columns: query.trim_columns ?? true,
              force_dot_decimal_separator: query.force_dot_decimal_separator ?? false,
              date_format: query.date_format || 'yyyy-MM-dd',
              target_encoding: query.target_encoding || 'UTF-8'
            },
            retry_settings: {
              retry_count: query.retry_count || 3,
              retry_after_milliseconds: query.retry_after_milliseconds || 5000
            }
          })) || []
        };
      }
      return {};
      
    case 'sftp_downloader':
      if (unit.SFTPDownloader) {
        return {
          sftp_connection: {
            server: unit.SFTPDownloader.SFTPLink?.server || null,
            port: unit.SFTPDownloader.SFTPLink?.port || 22,
            user: unit.SFTPDownloader.SFTPLink?.user || null,
            name: unit.SFTPDownloader.SFTPLink?.name || null
          },
          file_streams: unit.SFTPDownloader.FileStreamSftpDownloaders?.map((stream: any) => ({
            input: stream.input || null,
            output: stream.output || null,
            return_output: stream.return_output ?? true
          })) || [{
            input: unit.SFTPDownloader.input || null,
            output: unit.SFTPDownloader.output || null,
            return_output: unit.SFTPDownloader.return_output ?? true
          }]
        };
      }
      return {};
      
    case 'sftp_uploader':
      if (unit.SFTPUploader) {
        return {
          sftp_connection: {
            server: unit.SFTPUploader.SFTPLink?.server || null,
            port: unit.SFTPUploader.SFTPLink?.port || 22,
            user: unit.SFTPUploader.SFTPLink?.user || null,
            name: unit.SFTPUploader.SFTPLink?.name || null
          },
          file_streams: unit.SFTPUploader.FileStreamSftpUploaders?.map((stream: any) => ({
            input: stream.input || null,
            output: stream.output || null,
            return_output: stream.return_output ?? true
          })) || [{
            input: unit.SFTPUploader.input || null,
            output: unit.SFTPUploader.output || null,
            return_output: unit.SFTPUploader.return_output ?? true
          }]
        };
      }
      return {};
      
    case 'zip':
      if (unit.Zip) {
        return {
          zip_name: unit.Zip.output || unit.Zip.zip_name || null,
          file_streams: unit.Zip.FileStreamZips?.map((stream: any) => ({
            input: stream.input || null,
            wildcard_exp: stream.wildcard_exp || null
          })) || []
        };
      }
      return {};
      
    case 'unzip':
      if (unit.Unzip) {
        return {
          file_streams: unit.Unzip.FileStreamUnzips?.map((stream: any) => ({
            input: stream.input || null,
            output: stream.output || null,
            return_output: stream.return_output ?? true
          })) || [{
            input: unit.Unzip.input || null,
            output: unit.Unzip.output || null,
            return_output: unit.Unzip.return_output ?? true
          }]
        };
      }
      return {};
      
    case 'call_pipeline':
      if (unit.call_pipeline) {
        // Obtener información del pipeline llamado si está disponible
        const calledPipeline = unit.CalledPipeline || {};
        return {
          pipeline_reference: {
            id: unit.call_pipeline || null,
            name: calledPipeline.name || 'Pipeline sin nombre',
            description: calledPipeline.description || null
          },
          timeout_milliseconds: unit.timeout_milliseconds || 1800000 // 30 minutos por defecto
        };
      }
      return {};
      
    default:
      return {};
  }
}

// Función para encontrar las conexiones de una unidad basándose en pipeline_unit_id
function findUnitConnections(units: any[], currentUnitId: string): string[] {
  // Buscar todas las unidades que tienen como parent_unit_id el ID de la unidad actual
  return units
    .filter(u => u.pipeline_unit_id === currentUnitId)
    .map(u => u.id);
}

// Función principal: Convertir Pipeline de Hasura a YAML
export function pipelineToYaml(pipelineData: any): string {
  if (!pipelineData) {
    throw new Error('Datos de pipeline inválidos');
  }

  // Si no tiene PipelineUnits, crear un pipeline básico
  if (!pipelineData.PipelineUnits || pipelineData.PipelineUnits.length === 0) {
    const basicYaml: YamlPipeline = {
      id: pipelineData.id || '',
      name: pipelineData.name || 'Pipeline sin nombre',
      description: pipelineData.description || '',
      configuration: {
        agent_passport_id: pipelineData.agent_passport_id || '',
        abort_on_error: pipelineData.abort_on_error ?? false,
        abort_on_timeout: pipelineData.abort_on_timeout ?? false,
        continue_on_error: pipelineData.continue_on_error ?? false,
        disposable: pipelineData.disposable ?? false
      },
      units: []
    };

    return yaml.stringify(basicYaml, {
      indent: 2,
      lineWidth: 120,
      minContentWidth: 0,
      keepUndefined: false
    });
  }

  console.log("PipelineUnits recibidas:", pipelineData.PipelineUnits);
  
  // Convertir cada unidad a formato YAML completo
  const yamlUnits: YamlUnit[] = pipelineData.PipelineUnits.map((unit: any) => {
    const runnerType = detectRunnerType(unit);
    const displayName = getUnitDisplayName(unit);
    
    console.log("Procesando unidad:", {
      unitId: unit.id,
      runnerType,
      displayName,
      parentUnitId: unit.pipeline_unit_id,
      position: { x: unit.posx, y: unit.posy }
    });
    
    // Encontrar las conexiones de salida de esta unidad
    const connections = findUnitConnections(pipelineData.PipelineUnits, unit.id);
    
    // Construir la unidad YAML completa
    const yamlUnit: YamlUnit = {
      id: unit.id,
      type: runnerType,
      name: displayName || unit.comment || `${runnerType} unit`,
      parent_unit_id: unit.pipeline_unit_id || null,
      position: {
        x: unit.posx || 50,
        y: unit.posy || 50
      },
      execution: {
        retry_count: unit.retry_count ?? 3,
        retry_after_milliseconds: unit.retry_after_milliseconds ?? 5000,
        timeout_milliseconds: unit.timeout_milliseconds ?? 30000,
        continue_on_error: unit.continue_on_error ?? false,
        abort_on_error: false, // Este campo no existe en PipelineUnit, se usa valor por defecto
        abort_on_timeout: unit.abort_on_timeout ?? false
      },
      configuration: extractRunnerConfiguration(unit),
      connections: connections.map(toId => ({ to: toId }))
    };
    
    return yamlUnit;
  });

  // Construir el objeto YAML completo
  const yamlPipeline: YamlPipeline = {
    id: pipelineData.id || '',
    name: pipelineData.name || 'Pipeline sin nombre',
    description: pipelineData.description || undefined,
    configuration: {
      agent_passport_id: pipelineData.agent_passport_id || '',
      abort_on_error: pipelineData.abort_on_error ?? false,
      abort_on_timeout: pipelineData.abort_on_timeout ?? false,
      continue_on_error: pipelineData.continue_on_error ?? false,
      disposable: pipelineData.disposable ?? false
    },
    units: yamlUnits
  };

  // Convertir a YAML con formato limpio
  return yaml.stringify(yamlPipeline, {
    indent: 2,
    lineWidth: 120,
    minContentWidth: 0,
    keepUndefined: false
  });
}

// Función para parsear YAML y convertir a estructura de pipeline
export function yamlToPipeline(yamlContent: string): any {
  try {
    const parsed = yaml.parse(yamlContent) as YamlPipeline;
    
    if (!parsed || !parsed.units) {
      throw new Error('Estructura YAML inválida: faltan unidades');
    }

    // Validar estructura básica
    if (!parsed.configuration?.agent_passport_id) {
      throw new Error('Falta agent_passport_id en la configuración');
    }

    // Construir el pipeline data compatible con Hasura
    const pipelineData = {
      id: parsed.id,
      name: parsed.name,
      description: parsed.description,
      agent_passport_id: parsed.configuration.agent_passport_id,
      abort_on_error: parsed.configuration.abort_on_error,
      abort_on_timeout: parsed.configuration.abort_on_timeout || false,
      continue_on_error: parsed.configuration.continue_on_error || false,
      disposable: parsed.configuration.disposable || false,
      PipelineUnits: parsed.units.map(unit => ({
        id: unit.id,
        pipeline_unit_id: unit.parent_unit_id,
        posx: unit.position.x,
        posy: unit.position.y,
        retry_count: unit.execution.retry_count,
        retry_after_milliseconds: unit.execution.retry_after_milliseconds,
        timeout_milliseconds: unit.execution.timeout_milliseconds,
        continue_on_error: unit.execution.continue_on_error,
        abort_on_error: unit.execution.abort_on_error,
        abort_on_timeout: unit.execution.abort_on_timeout,
        // Los IDs específicos y configuraciones se reconstruirán según el tipo
        ...reconstructRunnerFields(unit)
      }))
    };

    return pipelineData;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Error al parsear YAML: ${error.message}`);
    }
    throw new Error('Error desconocido al parsear YAML');
  }
}

// Función auxiliar para reconstruir campos específicos del runner
function reconstructRunnerFields(yamlUnit: YamlUnit): any {
  const config = yamlUnit.configuration;
  
  switch (yamlUnit.type) {
    case 'command':
      return {
        command_id: yamlUnit.id, // Temporal, se debe generar nuevo ID
        Command: {
          id: yamlUnit.id,
          name: yamlUnit.name,
          target: config.target,
          args: config.args,
          working_directory: config.working_directory,
          raw_script: config.raw_script,
          instant: config.instant,
          return_output: config.return_output,
          return_output_type: config.return_output_type
        }
      };
      
    case 'query_queue':
      return {
        query_queue_id: yamlUnit.id,
        QueryQueue: {
          id: yamlUnit.id,
          name: yamlUnit.name,
          Queries: config.queries?.map((query: any, index: number) => ({
            id: `${yamlUnit.id}_query_${index}`,
            order: query.order,
            statement: query.statement,
            path: query.path,
            return_output: query.output_settings?.return_output,
            print_headers: query.output_settings?.print_headers,
            separator: query.output_settings?.separator,
            chunks: query.output_settings?.chunks,
            trim_columns: query.output_settings?.trim_columns,
            force_dot_decimal_separator: query.output_settings?.force_dot_decimal_separator,
            date_format: query.output_settings?.date_format,
            target_encoding: query.output_settings?.target_encoding,
            retry_count: query.retry_settings?.retry_count,
            retry_after_milliseconds: query.retry_settings?.retry_after_milliseconds,
            SQLConn: {
              id: `${yamlUnit.id}_sqlconn`,
              driver: query.sql_connection?.driver,
              connection_string: query.sql_connection?.connection_string,
              name: query.sql_connection?.name
            }
          })) || []
        }
      };
      
    // Agregar más casos según sea necesario...
    default:
      return {};
  }
}

// Función para validar la estructura YAML
export function validateYamlStructure(yamlContent: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  try {
    const parsed = yaml.parse(yamlContent) as YamlPipeline;
    
    // Validaciones básicas
    if (!parsed.name) {
      errors.push('Falta el nombre del pipeline');
    }
    
    if (!parsed.configuration) {
      errors.push('Falta la sección de configuración');
    } else {
      if (!parsed.configuration.agent_passport_id) {
        errors.push('Falta agent_passport_id en la configuración');
      }
    }
    
    if (!parsed.units || !Array.isArray(parsed.units)) {
      errors.push('Falta la lista de unidades o no es un array');
    } else {
      // Validar cada unidad
      parsed.units.forEach((unit, index) => {
        if (!unit.id) {
          errors.push(`Unidad ${index}: falta ID`);
        }
        if (!unit.type) {
          errors.push(`Unidad ${index}: falta tipo`);
        }
        if (!unit.position) {
          errors.push(`Unidad ${index}: falta posición`);
        }
        if (!unit.execution) {
          errors.push(`Unidad ${index}: falta configuración de ejecución`);
        }
      });
      
      // Validar referencias entre unidades
      const unitIds = new Set(parsed.units.map(u => u.id));
      parsed.units.forEach((unit, index) => {
        if (unit.parent_unit_id && !unitIds.has(unit.parent_unit_id)) {
          errors.push(`Unidad ${index}: parent_unit_id "${unit.parent_unit_id}" no existe`);
        }
        unit.connections?.forEach(conn => {
          if (!unitIds.has(conn.to)) {
            errors.push(`Unidad ${index}: conexión a "${conn.to}" no existe`);
          }
        });
      });
    }
    
  } catch (error) {
    errors.push(`Error de sintaxis YAML: ${error instanceof Error ? error.message : 'Error desconocido'}`);
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}