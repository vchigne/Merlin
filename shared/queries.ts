export const AGENT_PASSPORT_QUERY = `
  query GetAgentPassports {
    merlin_agent_AgentPassport {
      id
      name
      description
      is_testing
      enabled
      fabric_x_data_note_id
      watch
      agent_version_id
      check_agent_update
      is_healthy
      auto_clean_update
    }
  }
`;

export const AGENT_PASSPORT_PING_QUERY = `
  query GetAgentPassportPings {
    merlin_agent_AgentPassportPing {
      agent_passport_id
      hostname
      ips
      created_at
      last_ping_at
      agent_local_time
      current_directory
      os_version
      agent_version_from_source_code
    }
  }
`;

export const AGENT_VERSION_QUERY = `
  query GetAgentVersions {
    merlin_agent_AgentVersion {
      version
      url
      created_at
      updated_at
      url2
      url3
    }
  }
`;

export const PIPELINE_QUERY = `
  query GetPipelines {
    merlin_agent_Pipeline {
      id
      name
      description
      abort_on_error
      notify_on_abort_email_id
      notify_on_abort_webhook_id
      created_at
      updated_at
      agent_passport_id
      disposable
    }
  }
`;

export const PIPELINE_UNITS_QUERY = `
  query GetPipelineUnits($pipelineId: uuid!) {
    merlin_agent_PipelineUnit(where: {pipeline_id: {_eq: $pipelineId}}) {
      id
      command_id
      query_queue_id
      sftp_downloader_id
      sftp_uploader_id
      zip_id
      unzip_id
      pipeline_id
      pipeline_unit_id
      created_at
      updated_at
      comment
      retry_after_milliseconds
      retry_count
      timeout_milliseconds
      abort_on_timeout
      continue_on_error
      notify_on_error_email
      notify_on_error_webhook
      notify_on_timeout_email
      notify_on_timeout_webhook
      posx
      posy
      call_pipeline
    }
  }
`;

export const PIPELINE_JOBS_QUERY = `
  query GetPipelineJobs($limit: Int, $offset: Int) {
    merlin_agent_PipelineJobQueue(limit: $limit, offset: $offset, order_by: {created_at: desc}) {
      id
      pipeline_id
      completed
      created_at
      updated_at
      running
      aborted
      started_by_agent
    }
  }
`;

export const PIPELINE_JOB_LOGS_QUERY = `
  query GetPipelineJobLogs($jobId: uuid!) {
    merlin_agent_PipelineJobLog(where: {pipeline_job_id: {_eq: $jobId}}, order_by: {log_order: asc}) {
      id
      pipeline_job_id
      pipeline_unit_id
      logs
      created_at
      updated_at
      warnings
      errors
      dqprocess_status_id
      log_order
      milliseconds
      checked_by_notificator
    }
  }
`;

export const PIPELINE_JOB_LOGS_V2_QUERY = `
  query GetPipelineJobLogsV2($jobId: uuid!) {
    merlin_agent_PipelineJobLogV2(where: {pipeline_job_id: {_eq: $jobId}}, order_by: {log_order: asc}) {
      id
      pipeline_job_id
      pipeline_unit_id
      dqprocess_status_id
      log_order
      milliseconds
      checked_by_notificator
      created_at
    }
  }
`;

export const PIPELINE_JOB_LOGS_V2_BODY_QUERY = `
  query GetPipelineJobLogsV2Body($logId: Int!) {
    merlin_agent_PipelineJobLogV2Body(where: {id: {_eq: $logId}}) {
      id
      pipeline_job_id
      pipeline_unit_id
      pipeline_unit_context_id
      date
      level
      message
      callsite
      exception
      exception_message
      exception_stack_trace
      created_at
    }
  }
`;

export const RECENT_JOBS_QUERY = `
  query GetRecentJobs($limit: Int!) {
    merlin_agent_PipelineJobQueue(limit: $limit, order_by: {created_at: desc}) {
      id
      pipeline_id
      completed
      created_at
      updated_at
      running
      aborted
      started_by_agent
    }
  }
`;

export const AGENT_HEALTH_STATUS_QUERY = `
  query GetAgentHealthStatus {
    merlin_agent_AgentPassport {
      id
      name
      is_healthy
      enabled
      AgentPassportPing {
        last_ping_at
        hostname
        ips
        created_at
      }
      PipelineJobQueues(limit: 20, order_by: {created_at: desc}) {
        id
        completed
        running
        aborted
        created_at
        updated_at
      }
    }
  }
`;

export const COMMAND_QUERY = `
  query GetCommand($id: uuid!) {
    merlin_agent_Command(where: {id: {_eq: $id}}) {
      id
      target
      working_directory
      args
      created_at
      updated_at
      instant
      name
      description
      dq_process_id
      raw_script
      return_output
      return_output_type
      labels
    }
  }
`;

export const QUERY_QUEUE_QUERY = `
  query GetQueryQueue($id: uuid!) {
    merlin_agent_QueryQueue(where: {id: {_eq: $id}}) {
      id
      name
      description
      created_at
      updated_at
    }
  }
`;

export const QUERY_DETAILS_QUERY = `
  query GetQuery($id: uuid!) {
    merlin_agent_Query(where: {query_queue_id: {_eq: $id}}) {
      id
      order
      name
      query_string
      path
      print_headers
      created_at
      updated_at
      enabled
      sqlconn_id
      return_output
      query_queue_id
      date_format
      separator
      chunks
      target_encoding
      timeout
      mssql_compatibility_level
      retry_count
      retry_after_milliseconds
      remove_pipes_in_columns
      trim_columns
      labels
      force_dot_decimal_separator
    }
  }
`;

export const SFTP_DOWNLOADER_QUERY = `
  query GetSFTPDownloader($id: uuid!) {
    merlin_agent_SFTPDownloader(where: {id: {_eq: $id}}) {
      id
      name
      output
      return_output
      sftp_link_id
      created_at
      updated_at
    }
  }
`;

export const SFTP_LINK_QUERY = `
  query GetSFTPLink($id: uuid!) {
    merlin_agent_SFTPLink(where: {id: {_eq: $id}}) {
      id
      name
      server
      port
      user
      created_at
      updated_at
    }
  }
`;

export const SFTP_UPLOADER_QUERY = `
  query GetSFTPUploader($id: uuid!) {
    merlin_agent_SFTPUploader(where: {id: {_eq: $id}}) {
      id
      name
      input
      return_output
      sftp_link_id
      created_at
      updated_at
    }
  }
`;

export const ZIP_QUERY = `
  query GetZip($id: uuid!) {
    merlin_agent_Zip(where: {id: {_eq: $id}}) {
      id
      name
      output
      return_output
      created_at
      updated_at
    }
  }
`;

export const UNZIP_QUERY = `
  query GetUnzip($id: uuid!) {
    merlin_agent_UnZip(where: {id: {_eq: $id}}) {
      id
      name
      input
      output
      return_output
      created_at
      updated_at
    }
  }
`;

export const STATS_OVERVIEW_QUERY = `
  query GetStatsOverview {
    activeAgents: merlin_agent_AgentPassport_aggregate(where: {is_healthy: {_eq: true}, enabled: {_eq: true}}) {
      aggregate {
        count
      }
    }
    totalAgents: merlin_agent_AgentPassport_aggregate {
      aggregate {
        count
      }
    }
    pipelineJobs: merlin_agent_PipelineJobQueue_aggregate {
      aggregate {
        count
      }
    }
    completedJobs: merlin_agent_PipelineJobQueue_aggregate(where: {completed: {_eq: true}}) {
      aggregate {
        count
      }
    }
    abortedJobs: merlin_agent_PipelineJobQueue_aggregate(where: {aborted: {_eq: true}}) {
      aggregate {
        count
      }
    }
    errorLogs: merlin_agent_PipelineJobLogV2Body_aggregate(where: {level: {_eq: "ERROR"}}) {
      aggregate {
        count
      }
    }
  }
`;

// Consultas para conexiones SFTP
export const SFTP_LINKS_QUERY = `
  query GetSFTPLinks($limit: Int!) {
    merlin_agent_SFTPLink(limit: $limit) {
      id
      name
      server
      port
      user
      created_at
      updated_at
    }
  }
`;

export const SFTP_LINK_DETAIL_QUERY = `
  query GetSFTPLinkDetail($id: uuid!) {
    merlin_agent_SFTPLink_by_pk(id: $id) {
      id
      name
      server
      port
      user
      created_at
      updated_at
    }
  }
`;

export const SFTP_LINK_USAGE_QUERY = `
  query GetSFTPLinkUsage($id: uuid!) {
    downloaders: merlin_agent_SFTPDownloader(where: {sftp_link_id: {_eq: $id}}, limit: 50) {
      id
      name
      output
      return_output
    }
    uploaders: merlin_agent_SFTPUploader(where: {sftp_link_id: {_eq: $id}}, limit: 50) {
      id
      name
      output
      return_output
    }
  }
`;

// Consultas para conexiones SQL
export const SQL_CONNECTIONS_QUERY = `
  query GetSQLConnections($limit: Int!) {
    merlin_agent_SQLConn(limit: $limit) {
      id
      name
      driver
      connstring
      created_at
      updated_at
    }
  }
`;

export const SQL_CONNECTION_DETAIL_QUERY = `
  query GetSQLConnectionDetail($id: uuid!) {
    connection: merlin_agent_SQLConn(where: {id: {_eq: $id}}, limit: 1) {
      id
      name
      driver
      connstring
      created_at
      updated_at
    }
    queries: merlin_agent_Query(where: {sqlconn_id: {_eq: $id}}, limit: 50) {
      id
      name
      query_string
      path
      enabled
      chunks
      date_format
      separator
      target_encoding
      timeout
      return_output
      order
      query_queue_id
      QueryQueue {
        id
        name
        description
        created_at
        updated_at
      }
    }
  }
`;

export const SQL_CONN_USAGE_QUERY = `
  query GetSQLConnUsage($id: uuid!) {
    queries: merlin_agent_Query(where: {sqlconn_id: {_eq: $id}}, limit: 50) {
      id
      name
      query_string
      enabled
      path
      query_queue {
        id
        name
        PipelineUnits {
          id
          pipeline {
            id
            name
            agent_passport {
              id
              name
            }
          }
        }
      }
    }
  }
`;

// Consultas para Commands
export const COMMANDS_LIST_QUERY = `
  query GetCommandsList($limit: Int!) {
    merlin_agent_Command(limit: $limit) {
      id
      name
      target
      working_directory
      args
      created_at
      updated_at
      description
      instant
      labels
    }
  }
`;

export const COMMAND_DETAIL_QUERY = `
  query GetCommandDetail($id: uuid!) {
    merlin_agent_Command_by_pk(id: $id) {
      id
      name
      target
      working_directory
      args
      created_at
      updated_at
      description
      instant
      raw_script
      return_output
      return_output_type
      labels
      dq_process_id
      DQProcess {
        id
        action
        area
        procedure
        responsible
      }
    }
  }
`;

export const COMMAND_USAGE_QUERY = `
  query GetCommandUsage($id: uuid!) {
    merlin_agent_PipelineUnit(where: {command_id: {_eq: $id}}) {
      id
      comment
      pipeline_id
      posx
      posy
      created_at
      updated_at
      Pipeline {
        id
        name
        description
        agent_passport_id
      }
    }
  }
`;
