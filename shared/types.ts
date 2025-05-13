// Merlin types based on the attached documentation

// Agent related types
export interface AgentPassport {
  id: string;
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

export interface AgentPassportPing {
  agent_passport_id: string;
  hostname: string;
  ips: string;
  created_at: string;
  last_ping_at: string;
  agent_local_time: string;
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

export interface AgentUpdateLog {
  id: string;
  agent_passport_id: string;
  logs: string;
  warnings: string;
  errors: string;
  checked_by_notificator: boolean;
  created_at: string;
  updated_at: string;
}

// Pipeline related types
export interface Pipeline {
  id: string;
  name: string;
  description: string;
  abort_on_error: boolean;
  notify_on_abort_email_id: string;
  notify_on_abort_webhook_id: string;
  created_at: string;
  updated_at: string;
  agent_passport_id: string;
  disposable: boolean;
}

export interface PipelineUnit {
  id: string;
  command_id: string;
  query_queue_id: string;
  sftp_downloader_id: string;
  sftp_uploader_id: string;
  zip_id: string;
  unzip_id: string;
  pipeline_id: string;
  pipeline_unit_id: string;
  created_at: string;
  updated_at: string;
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
}

export interface PipelineCall {
  id: string;
  pipeline_id: string;
  allowed_agent_id: string;
  created_at: string;
  updated_at: string;
}

export interface PipelineJobQueue {
  id: string;
  pipeline_id: string;
  completed: boolean;
  created_at: string;
  updated_at: string;
  running: boolean;
  aborted: boolean;
  started_by_agent: string;
}

export interface PipelineJobLog {
  id: string;
  pipeline_job_queue_id: string;
  pipeline_unit_id: string;
  logs: string;
  created_at: string;
  updated_at: string;
  warnings: string;
  errors: string;
  dqprocess_status_id: string;
  log_order: number;
  milliseconds: number;
  checked_by_notificator: boolean;
}

export interface PipelineJobLogV2 {
  id: number;
  pipeline_job_queue_id: string;
  pipeline_unit_id: string;
  dqprocess_status_id: string;
  log_order: number;
  milliseconds: number;
  checked_by_notificator: boolean;
  created_at: string;
}

export interface PipelineJobLogV2Body {
  id: number;
  pipeline_job_queue_id: string;
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

// Operation related types
export interface Command {
  id: string;
  target: string;
  working_directory: string;
  args: string;
  created_at: string;
  updated_at: string;
  instant: boolean;
  name: string;
  description: string;
  dq_process_id: string;
  raw_script: string;
  return_output: boolean;
  return_output_type: string;
  labels: string[];
}

export interface Query {
  id: string;
  order: number;
  name: string;
  query_string: string;
  path: string;
  print_headers: boolean;
  created_at: string;
  updated_at: string;
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
}

export interface QueryQueue {
  id: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
}

export interface SFTPDownloader {
  id: string;
  name: string;
  output: string;
  return_output: boolean;
  sftp_link_id: string;
}

export interface SFTPUploader {
  id: string;
  name: string;
  input: string;
  return_output: boolean;
  sftp_link_id: string;
}

export interface FileStreamSFTP {
  id: string;
  input: string;
  output: string;
  return_output: boolean;
  created_at: string;
  updated_at: string;
}

export interface Zip {
  id: string;
  name: string;
  output: string;
  return_output: boolean;
  created_at: string;
  updated_at: string;
}

export interface UnZip {
  id: string;
  name: string;
  input: string;
  output: string;
  return_output: boolean;
  created_at: string;
  updated_at: string;
}

export interface SQLConn {
  id: string;
  name: string;
  driver: string;
  connection_string: string;
  created_at: string;
  updated_at: string;
}

export interface SFTPLink {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  password: string;
  created_at: string;
  updated_at: string;
}

// Dashboard specific types
export interface AgentStatus {
  id: string;
  name: string;
  status: 'healthy' | 'warning' | 'error' | 'offline';
  lastPingTime: string;
  lastPingRelative: string;
  version: string;
}

export interface PipelineStatus {
  id: string;
  name: string;
  status: 'completed' | 'running' | 'error' | 'pending';
  lastRun: string;
  agentId: string;
  agentName: string;
}

export interface JobStatus {
  id: string;
  pipeline: {
    id: string;
    name: string;
  };
  agent: {
    id: string;
    name: string;
  };
  status: 'completed' | 'running' | 'error' | 'aborted' | 'pending';
  createdAt: string;
  updatedAt: string;
}

export interface LogEntry {
  id: string;
  pipelineJobId: string;
  pipelineUnitId: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'FATAL';
  message: string;
  timestamp: string;
  agent?: {
    id: string;
    name: string;
  };
  pipeline?: {
    id: string;
    name: string;
  };
}

export interface ActivityItem {
  id: string;
  type: 'success' | 'warning' | 'error';
  message: string;
  timestamp: string;
  timeRelative: string;
  relatedEntityType?: 'agent' | 'pipeline' | 'job';
  relatedEntityId?: string;
}

export interface PipelineNode {
  id: string;
  type: string;
  data: {
    label: string;
    status: 'completed' | 'running' | 'error' | 'pending' | 'standby';
    details?: any;
  };
  position: {
    x: number;
    y: number;
  };
}

export interface PipelineEdge {
  id: string;
  source: string;
  target: string;
  animated?: boolean;
  style?: any;
}

export interface PipelineFlow {
  nodes: PipelineNode[];
  edges: PipelineEdge[];
}

export interface StatsOverview {
  activeAgents: number;
  pipelineExecutions: number;
  successRate: number;
  errorCount: number;
  trend?: {
    activeAgents: number;
    pipelineExecutions: number;
    successRate: number;
    errorCount: number;
  };
}
