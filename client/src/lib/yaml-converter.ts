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
  const runnerType = detectRunnerType(unit);
  
  switch (runnerType) {
    case 'command':
      return unit.Command?.name || `Command: ${unit.Command?.target || 'Unknown'}`;
    case 'query_queue':
      return unit.QueryQueue?.name || `SQL Query (${unit.QueryQueue?.Queries?.length || 0} queries)`;
    case 'sftp_downloader':
      return unit.SFTPDownloader?.name || `SFTP Download from ${unit.SFTPDownloader?.SFTPLink?.server || 'Unknown'}`;
    case 'sftp_uploader':
      return unit.SFTPUploader?.name || `SFTP Upload to ${unit.SFTPUploader?.SFTPLink?.server || 'Unknown'}`;
    case 'zip':
      return unit.Zip?.name || `Zip: ${unit.Zip?.zip_name || 'Unknown'}`;
    case 'unzip':
      return unit.Unzip?.name || `Unzip Files`;
    case 'call_pipeline':
      return unit.CallPipeline?.Pipeline?.name || `Call Pipeline: ${unit.CallPipeline?.pipeline_id || 'Unknown'}`;
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
          instant: unit.Command.instant || false,
          return_output: unit.Command.return_output || false,
          return_output_type: unit.Command.return_output_type || null
        };
      }
      return {};
      
    case 'query_queue':
      if (unit.QueryQueue) {
        return {
          queries: unit.QueryQueue.Queries?.map((query: any) => ({
            id: query.id,
            order: query.order || 0,
            path: query.path || null,
            query_string: query.query_string || null,
            return_output: query.return_output || false,
            sql_connection: query.SQLConn ? {
              id: query.SQLConn.id,
              driver: query.SQLConn.driver || null,
              connstring: query.SQLConn.connstring || null,
              name: query.SQLConn.name || null
            } : null
          })) || []
        };
      }
      return {};
      
    case 'sftp_downloader':
      return {
        sftp_connection: {
          server: unit.SFTPDownloader?.SFTPLink?.server,
          port: unit.SFTPDownloader?.SFTPLink?.port,
          user: unit.SFTPDownloader?.SFTPLink?.user,
          name: unit.SFTPDownloader?.SFTPLink?.name
        },
        file_streams: unit.SFTPDownloader?.FileStreamSftpDownloaders?.map((stream: any) => ({
          input: stream.input,
          output: stream.output,
          return_output: stream.return_output
        })) || []
      };
      
    case 'sftp_uploader':
      if (unit.SFTPUploader) {
        return {
          return_output: unit.SFTPUploader.return_output || false,
          sftp_connection: unit.SFTPUploader.SFTPLink ? {
            id: unit.SFTPUploader.SFTPLink.id,
            server: unit.SFTPUploader.SFTPLink.server || null,
            port: unit.SFTPUploader.SFTPLink.port || null,
            user: unit.SFTPUploader.SFTPLink.user || null,
            name: unit.SFTPUploader.SFTPLink.name || null
          } : null
        };
      }
      return {};
      
    case 'zip':
      if (unit.Zip) {
        return {
          output_path: unit.Zip.output || null,
          return_output: unit.Zip.return_output || false,
          file_streams: unit.Zip.FileStreamZips?.map((stream: any) => ({
            id: stream.id,
            input: stream.input || null,
            return_output: stream.return_output || false,
            wildcard_exp: stream.wildcard_exp || null
          })) || []
        };
      }
      return {};
      
    case 'unzip':
      if (unit.Unzip) {
        return {
          input: unit.Unzip.input || null,
          output: unit.Unzip.output || null,
          return_output: unit.Unzip.return_output || false,
          file_streams: unit.Unzip.FileStreamUnzips?.map((stream: any) => ({
            id: stream.id,
            input: stream.input || null,
            output: stream.output || null,
            return_output: stream.return_output || false
          })) || []
        };
      }
      return {};
      
    case 'call_pipeline':
      return {
        pipeline_reference: {
          id: unit.CallPipeline?.pipeline_id,
          name: unit.CallPipeline?.Pipeline?.name,
          description: unit.CallPipeline?.Pipeline?.description
        },
        timeout_milliseconds: unit.CallPipeline?.timeout_milliseconds
      };
      
    default:
      return {};
  }
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
        abort_on_error: pipelineData.abort_on_error || false,
        abort_on_timeout: pipelineData.abort_on_timeout || false,
        continue_on_error: pipelineData.continue_on_error || false,
        disposable: pipelineData.disposable || false
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

  // Simplificar: solo convertir unidades básicas con id, nombre y tipo
  console.log("PipelineUnits recibidas:", pipelineData.PipelineUnits);
  
  const yamlUnits: YamlUnit[] = pipelineData.PipelineUnits.map((unit: any) => {
    const runnerType = detectRunnerType(unit);
    const displayName = getUnitDisplayName(unit);
    
    console.log("Procesando unidad:", {
      unitId: unit.id,
      runnerType,
      displayName,
      hasCommand: !!unit.Command,
      hasQueryQueue: !!unit.QueryQueue,
      hasZip: !!unit.Zip,
      hasSFTPUploader: !!unit.SFTPUploader,
      sftpUploaderData: unit.SFTPUploader
    });
    
    const baseUnit = {
      id: unit.id,
      name: displayName,
      type: runnerType
    };

    // Para unidades de tipo command, query_queue, zip o sftp_uploader, agregar configuración completa
    if ((runnerType === 'command' && unit.Command) || 
        (runnerType === 'query_queue' && unit.QueryQueue) ||
        (runnerType === 'zip' && unit.Zip) ||
        (runnerType === 'sftp_uploader' && unit.SFTPUploader)) {
      return {
        ...baseUnit,
        configuration: extractRunnerConfiguration(unit)
      };
    }
    
    return baseUnit;
  });

  // Construir el objeto YAML completo
  const yamlPipeline: YamlPipeline = {
    id: pipelineData.id || '',
    name: pipelineData.name || 'Pipeline sin nombre',
    description: pipelineData.description || undefined,
    configuration: {
      agent_passport_id: pipelineData.agent_passport_id || '',
      abort_on_error: pipelineData.abort_on_error || false,
      abort_on_timeout: pipelineData.abort_on_timeout || false,
      continue_on_error: pipelineData.continue_on_error || false,
      disposable: pipelineData.disposable || false
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