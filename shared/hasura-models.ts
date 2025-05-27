/**
 * Modelos centralizados de Hasura para el sistema Merlin
 * Basados en el código C# oficial del agente cliente
 * 
 * Este archivo centraliza todas las interfaces TypeScript que corresponden
 * exactamente a las estructuras de datos que Hasura retorna via GraphQL.
 */

// ===== INTERFACES BASE =====

export interface BaseEntity {
  id: string;
  created_at?: string;
  updated_at?: string;
}

// ===== AGENTES =====

export interface AgentPassport extends BaseEntity {
  name: string;
  description: string;
  is_testing: boolean;
  enabled: boolean;
  fabric_x_data_note_id: string;
  watch: boolean;
  agent_version_id: string;
  check_agent_update: boolean;
  is_healthy: boolean;
  auto_clean_update: boolean;
}

export interface AgentPassportPing extends BaseEntity {
  agent_passport_id: string;
  hostname: string;
  ips: string;
  last_ping_at: string;
  agent_local_time: Date; // DateTime en C#, Date en TypeScript
  current_directory: string;
  os_version: string;
  agent_version_from_source_code: string;
}

export interface AgentVersion {
  version: string;
  url: string;
  created_at: string;
  updated_at: string;
  url2: string;
  url3: string;
}

// ===== PIPELINES =====

export interface Pipeline extends BaseEntity {
  name: string;
  description: string;
  abort_on_error: boolean;
  notify_on_abort_email_id: string;
  notify_on_abort_webhook_id: string;
  agent_passport_id: string;
  disposable: boolean;
  
  // Relaciones
  PipelineUnits?: PipelineUnit[];
}

export interface PipelineUnit extends BaseEntity {
  pipeline_id: string;
  pipeline_unit_id: string;
  comment: string;
  retry_after_milliseconds: number;
  retry_count: number;
  timeout_milliseconds: number;
  abort_on_timeout: boolean;
  continue_on_error: boolean;
  notify_on_error_email: string;
  notify_on_error_webhook: string;
  notify_on_timeout_email: string;
  notify_on_timeout_webhook: string;
  posx: number;
  posy: number;
  call_pipeline: string;
  
  // Campos ID que determinan el tipo (solo uno debe tener valor)
  command_id?: string;
  query_queue_id?: string;
  sftp_downloader_id?: string;
  sftp_uploader_id?: string;
  zip_id?: string;
  unzip_id?: string;
  
  // Relaciones (basadas en el código C# oficial)
  Command?: Command;
  QueryQueue?: QueryQueue;
  SFTPDownloader?: SFTPDownloader;
  SFTPUploader?: SFTPUploader;
  Zip?: Zip;
  Unzip?: Unzip;
}

// ===== COMANDOS =====

export interface Command extends BaseEntity {
  target: string;
  working_directory: string;
  args: string;
  instant: boolean;
  name: string;
  description: string;
  dq_process_id: string;
  raw_script: string;
  return_output: boolean;
  return_output_type: string;
  labels: string[];
}

// ===== CONSULTAS SQL =====

export interface QueryQueue extends BaseEntity {
  name: string;
  description: string;
  
  // Relaciones
  Queries?: Query[];
}

export interface Query extends BaseEntity {
  order: number;
  name: string;
  query_string: string;
  path: string;
  print_headers: boolean;
  enabled: boolean;
  sqlconn_id: string;
  return_output: boolean;
  query_queue_id: string;
  date_format: string;
  separator: string;
  chunks: number;
  target_encoding: string;
  timeout: number;
  mssql_compatibility_level: string;
  retry_count: number;
  retry_after_milliseconds: number;
  remove_pipes_in_columns: boolean;
  trim_columns: boolean;
  labels: string[];
  force_dot_decimal_separator: boolean;
  
  // Relaciones
  SQLConn?: SQLConn;
}

export interface SQLConn extends BaseEntity {
  name: string;
  driver: string;
  connstring: string;
}

// ===== SFTP =====

export interface SFTPLink extends BaseEntity {
  name: string;
  server: string;
  port: number;
  user: string;
  password: string;
}

export interface SFTPDownloader extends BaseEntity {
  name: string;
  output: string;
  return_output: boolean;
  sftp_link_id: string;
  input: string;
  
  // Relaciones
  SFTPLink?: SFTPLink;
  FileStreamSftpDownloaders?: FileStreamSftpDownloader[];
}

export interface SFTPUploader extends BaseEntity {
  name: string;
  input: string;
  return_output: boolean;
  sftp_link_id: string;
  output: string;
  
  // Relaciones
  SFTPLink?: SFTPLink;
  FileStreamSftpUploaders?: FileStreamSftpUploader[];
}

export interface FileStreamSftpDownloader extends BaseEntity {
  input: string;
  output: string;
  return_output: boolean;
}

export interface FileStreamSftpUploader extends BaseEntity {
  input: string;
  output: string;
  return_output: boolean;
}

// ===== COMPRESIÓN =====

export interface Zip extends BaseEntity {
  name: string;
  output: string;
  return_output: boolean;
  
  // Relaciones
  FileStreamZips?: FileStreamZip[];
}

export interface Unzip extends BaseEntity {
  name: string;
  input: string;
  output: string;
  return_output: boolean;
  
  // Relaciones
  FileStreamUnzips?: FileStreamUnzip[];
}

export interface FileStreamZip extends BaseEntity {
  input: string;
  return_output: boolean;
  wildcard_exp: string;
}

export interface FileStreamUnzip extends BaseEntity {
  input: string;
  output: string;
  return_output: boolean;
}

// ===== JOBS Y LOGS =====

export interface PipelineJobQueue extends BaseEntity {
  pipeline_id: string;
  completed: boolean;
  running: boolean;
  aborted: boolean;
  started_by_agent: string;
  
  // Relaciones
  Pipeline?: Pipeline;
}

export interface PipelineJobLog extends BaseEntity {
  pipeline_job_id: string;
  pipeline_unit_id: string;
  logs: string;
  warnings: string;
  errors: string;
  dqprocess_status_id: string;
  log_order: number;
  milliseconds: number;
  checked_by_notificator: boolean;
}

export interface PipelineJobLogV2 {
  id: number;
  pipeline_job_id: string;
  pipeline_unit_id: string;
  dqprocess_status_id: string;
  log_order: number;
  milliseconds: number;
  checked_by_notificator: boolean;
  created_at: string;
}

export interface PipelineJobLogV2Body {
  id: number;
  pipeline_job_id: string;
  pipeline_unit_id: string;
  pipeline_unit_context_id: string;
  date: string;
  level: string;
  message: string;
  callsite: string;
  exception: string;
  exception_message: string;
  exception_stack_trace: string;
  created_at: string;
}

// ===== RESPUESTAS DE HASURA =====

export interface HasuraResponse<T> {
  data?: T;
  errors?: Array<{
    message: string;
    extensions?: {
      code: string;
      path?: string;
    };
  }>;
}

// Respuestas específicas para cada consulta
export interface AgentPassportResponse {
  merlin_agent_AgentPassport: AgentPassport[];
}

export interface PipelineResponse {
  merlin_agent_Pipeline: Pipeline[];
}

export interface PipelineUnitsResponse {
  merlin_agent_PipelineUnit: PipelineUnit[];
}

export interface PipelineJobsResponse {
  merlin_agent_PipelineJobQueue: PipelineJobQueue[];
}

export interface LogsResponse {
  merlin_agent_PipelineJobLogV2Body: PipelineJobLogV2Body[];
}

export interface SFTPLinksResponse {
  merlin_agent_SFTPLink: SFTPLink[];
}

export interface SQLConnectionsResponse {
  merlin_agent_SQLConn: SQLConn[];
}

export interface CommandsResponse {
  merlin_agent_Command: Command[];
}

// ===== RESPUESTAS DE MUTACIONES =====

export interface UpsertAgentPingResponse {
  insert_merlin_agent_AgentPassportPing: {
    affected_rows: number;
  };
}

export interface InsertPipelineResponse {
  insert_merlin_agent_Pipeline: {
    affected_rows: number;
    returning: Pipeline[];
  };
}

export interface InsertAgentResponse {
  insert_merlin_agent_AgentPassport: {
    affected_rows: number;
    returning: AgentPassport[];
  };
}

// Input types para mutaciones
export interface AgentPassportPingInput {
  agent_passport_id: string;
  hostname: string;
  ips: string;
  agent_local_time: Date;
  current_directory: string;
  os_version: string;
  agent_version_from_source_code: string;
}

export interface PipelineInput {
  name: string;
  description: string;
  abort_on_error: boolean;
  agent_passport_id: string;
  disposable: boolean;
  notify_on_abort_email_id?: string;
  notify_on_abort_webhook_id?: string;
}

export interface AgentPassportInput {
  name: string;
  description: string;
  is_testing: boolean;
  enabled: boolean;
  fabric_x_data_note_id?: string;
  watch: boolean;
  agent_version_id: string;
  check_agent_update: boolean;
  is_healthy: boolean;
  auto_clean_update: boolean;
}

// ===== UTILIDADES DE TIPO =====

/**
 * Determina el tipo de una unidad de pipeline basándose en qué campo ID tiene valor
 */
export type PipelineUnitType = 
  | 'command' 
  | 'query_queue' 
  | 'sftp_download' 
  | 'sftp_upload' 
  | 'zip' 
  | 'unzip' 
  | 'pipeline_call'
  | 'unknown';

/**
 * Función helper para determinar el tipo de unidad
 */
export function determinePipelineUnitType(unit: PipelineUnit): PipelineUnitType {
  if (unit.command_id) return 'command';
  if (unit.query_queue_id) return 'query_queue';
  if (unit.sftp_downloader_id) return 'sftp_download';
  if (unit.sftp_uploader_id) return 'sftp_upload';
  if (unit.zip_id) return 'zip';
  if (unit.unzip_id) return 'unzip';
  if (unit.call_pipeline) return 'pipeline_call';
  return 'unknown';
}

/**
 * Función helper para obtener los detalles específicos de una unidad
 */
export function getPipelineUnitDetails(unit: PipelineUnit): any {
  const type = determinePipelineUnitType(unit);
  
  switch (type) {
    case 'command':
      return unit.Command;
    case 'query_queue':
      return unit.QueryQueue;
    case 'sftp_download':
      return unit.SFTPDownloader;
    case 'sftp_upload':
      return unit.SFTPUploader;
    case 'zip':
      return unit.Zip;
    case 'unzip':
      return unit.Unzip;
    default:
      return null;
  }
}

/**
 * Función helper para obtener el nombre/descripción de una unidad
 */
export function getPipelineUnitDisplayName(unit: PipelineUnit): string {
  const details = getPipelineUnitDetails(unit);
  const type = determinePipelineUnitType(unit);
  
  if (details?.name) {
    return details.name;
  }
  
  // Fallbacks basados en el tipo
  switch (type) {
    case 'command':
      return details?.target || `Comando ${unit.id.slice(0, 8)}`;
    case 'query_queue':
      return details?.name || `Consultas ${unit.id.slice(0, 8)}`;
    case 'sftp_download':
      return details?.name || `Descarga SFTP ${unit.id.slice(0, 8)}`;
    case 'sftp_upload':
      return details?.name || `Subida SFTP ${unit.id.slice(0, 8)}`;
    case 'zip':
      return details?.name || `Comprimir ${unit.id.slice(0, 8)}`;
    case 'unzip':
      return details?.name || `Descomprimir ${unit.id.slice(0, 8)}`;
    case 'pipeline_call':
      return `Pipeline: ${unit.call_pipeline}`;
    default:
      return `Unidad ${unit.id.slice(0, 8)}`;
  }
}