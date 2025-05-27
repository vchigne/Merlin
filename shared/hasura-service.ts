/**
 * Servicio centralizado para todas las operaciones con Hasura
 * Centraliza consultas, mutaciones y manejo de errores
 */

import type {
  HasuraResponse,
  AgentPassportResponse,
  AgentVersionResponse,
  AgentUpdateLogsResponse,
  PipelineResponse,
  PipelineUnitsResponse,
  PipelineJobsResponse,
  LogsResponse,
  SFTPLinksResponse,
  SQLConnectionsResponse,
  CommandsResponse,
  PipelineUnit,
  AgentPassport,
  AgentVersion,
  AgentUpdateLog,
  Pipeline,
  PipelineJobQueue,
  PipelineJobLogV2Body,
  SFTPLink,
  SQLConn,
  Command,
  UpsertAgentPingResponse,
  InsertPipelineResponse,
  InsertAgentResponse,
  InsertAgentUpdateLogResponse,
  AgentPassportPingInput,
  PipelineInput,
  AgentPassportInput
} from './hasura-models';

// ===== CONSULTAS GRAPHQL CENTRALIZADAS =====

export const HASURA_QUERIES = {
  // Agentes
  AGENT_STATUS: `
    query GetAgentStatus {
      merlin_agent_AgentPassport {
        id
        name
        is_healthy
        enabled
        description
        created_at
        updated_at
      }
    }
  `,

  AGENT_HEALTH_STATUS: `
    query GetAgentHealthStatus {
      merlin_agent_AgentPassport {
        id
        name
        is_healthy
        enabled
        agent_version_id
        check_agent_update
        auto_clean_update
        created_at
        updated_at
      }
    }
  `,

  AGENT_PASSPORT_QUERY: `
    query GetAgentPassports($limit: Int, $offset: Int) {
      merlin_agent_AgentPassport(limit: $limit, offset: $offset, order_by: {created_at: desc}) {
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
        created_at
        updated_at
      }
    }
  `,

  AGENT_PASSPORT_PING_QUERY: `
    query GetAgentPings($agentId: uuid!) {
      merlin_agent_AgentPassportPing(
        where: {agent_passport_id: {_eq: $agentId}}
        order_by: {created_at: desc}
        limit: 10
      ) {
        id
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
  `,

  // Sistema de versiones y actualizaciones (basado en código C#)
  AGENT_VERSION_QUERY: `
    query GetAgentVersions {
      merlin_agent_AgentPassport {
        id
        name
        auto_clean_update
        agent_version_id
        AgentVersion {
          version
          url
          url2
          url3
          created_at
          updated_at
        }
      }
    }
  `,

  AGENT_UPDATE_LOGS_QUERY: `
    query GetAgentUpdateLogs($agentId: uuid!, $limit: Int = 20) {
      merlin_agent_AgentUpdateLog(
        where: {agent_passport_id: {_eq: $agentId}}
        order_by: {created_at: desc}
        limit: $limit
      ) {
        id
        agent_passport_id
        logs
        warnings
        errors
        checked_by_notificator
        created_at
        updated_at
      }
    }
  `,

  RECENT_UPDATE_LOGS_QUERY: `
    query GetRecentUpdateLogs {
      merlin_agent_AgentUpdateLog(
        limit: 20
        order_by: {created_at: desc}
      ) {
        id
        agent_passport_id
        logs
        warnings
        errors
        checked_by_notificator
        created_at
      }
    }
  `,

  // Pipelines
  PIPELINE_QUERY: `
    query GetPipelines($limit: Int, $offset: Int) {
      merlin_agent_Pipeline(limit: $limit, offset: $offset, order_by: {created_at: desc}) {
        id
        name
        description
        abort_on_error
        notify_on_abort_email_id
        notify_on_abort_webhook_id
        agent_passport_id
        disposable
        created_at
        updated_at
      }
    }
  `,

  // Versión básica (funcional actual)
  PIPELINE_UNITS_BASIC: `
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
  `,

  // Versión completa (con relaciones, basada en código C#)
  PIPELINE_UNITS_COMPLETE: `
    query GetPipelineUnitsComplete($pipelineId: uuid!) {
      merlin_agent_PipelineUnit(where: {pipeline_id: {_eq: $pipelineId}}) {
        id
        pipeline_unit_id
        abort_on_timeout
        continue_on_error
        retry_count
        timeout_milliseconds
        retry_after_milliseconds
        call_pipeline
        posx
        posy
        comment
        
        Command {
          id
          target
          args
          working_directory
          instant
          raw_script
          return_output
          return_output_type
          name
          description
        }
        
        QueryQueue {
          id
          name
          description
          Queries {
            id
            order
            path
            query_string
            return_output
            name
            SQLConn {
              id
              driver
              connstring
              name
            }
          }
        }
        
        SFTPDownloader {
          id
          name
          input
          output
          return_output
          SFTPLink {
            id
            server
            port
            user
            name
          }
        }
        
        SFTPUploader {
          id
          name
          output
          return_output
          SFTPLink {
            id
            server
            port
            user
            name
          }
        }
        
        Zip {
          id
          name
          output
          return_output
        }
        
        Unzip {
          id
          name
          output
          return_output
        }
      }
    }
  `,

  // Jobs
  PIPELINE_JOBS_QUERY: `
    query GetPipelineJobs($limit: Int, $offset: Int) {
      merlin_agent_PipelineJobQueue(limit: $limit, offset: $offset, order_by: {created_at: desc}) {
        id
        pipeline_id
        completed
        running
        aborted
        started_by_agent
        created_at
        updated_at
        Pipeline {
          id
          name
          description
        }
      }
    }
  `,

  RECENT_JOBS_QUERY: `
    query GetRecentJobs {
      merlin_agent_PipelineJobQueue(limit: 10, order_by: {created_at: desc}) {
        id
        pipeline_id
        completed
        running
        aborted
        started_by_agent
        created_at
        updated_at
        Pipeline {
          id
          name
        }
      }
    }
  `,

  // Logs
  PIPELINE_JOB_LOGS_V2_QUERY: `
    query GetPipelineJobLogsV2($pipelineJobId: uuid!) {
      merlin_agent_PipelineJobLogV2Body(
        where: {pipeline_job_id: {_eq: $pipelineJobId}}
        order_by: {created_at: desc}
      ) {
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
  `,

  RECENT_LOGS_QUERY: `
    query GetRecentLogs {
      merlin_agent_PipelineJobLogV2Body(limit: 20, order_by: {created_at: desc}) {
        id
        pipeline_job_id
        pipeline_unit_id
        date
        level
        message
        exception_message
        created_at
      }
    }
  `,

  RECENT_ERRORS_QUERY: `
    query GetRecentErrors {
      merlin_agent_PipelineJobLogV2Body(
        where: {level: {_in: ["ERROR", "FATAL"]}}
        limit: 20
        order_by: {created_at: desc}
      ) {
        id
        pipeline_job_id
        pipeline_unit_id
        date
        level
        message
        exception_message
        exception_stack_trace
        created_at
      }
    }
  `,

  // Conexiones
  SFTP_LINKS_QUERY: `
    query GetSFTPLinks($limit: Int, $offset: Int) {
      merlin_agent_SFTPLink(limit: $limit, offset: $offset, order_by: {created_at: desc}) {
        id
        name
        server
        port
        user
        created_at
        updated_at
      }
    }
  `,

  SFTP_LINK_DETAIL_QUERY: `
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
  `,

  SQL_CONNECTIONS_QUERY: `
    query GetSQLConnections($limit: Int, $offset: Int) {
      merlin_agent_SQLConn(limit: $limit, offset: $offset, order_by: {created_at: desc}) {
        id
        name
        driver
        created_at
        updated_at
      }
    }
  `,

  SQL_CONNECTION_DETAIL_QUERY: `
    query GetSQLConnectionDetail($id: uuid!) {
      merlin_agent_SQLConn_by_pk(id: $id) {
        id
        name
        driver
        connstring
        created_at
        updated_at
      }
    }
  `,

  COMMANDS_LIST_QUERY: `
    query GetCommands($limit: Int, $offset: Int) {
      merlin_agent_Command(limit: $limit, offset: $offset, order_by: {created_at: desc}) {
        id
        name
        description
        target
        instant
        return_output
        created_at
        updated_at
      }
    }
  `,

  COMMAND_DETAIL_QUERY: `
    query GetCommandDetail($id: uuid!) {
      merlin_agent_Command_by_pk(id: $id) {
        id
        name
        description
        target
        working_directory
        args
        instant
        raw_script
        return_output
        return_output_type
        labels
        created_at
        updated_at
      }
    }
  `,

  // Estadísticas
  STATS_OVERVIEW_QUERY: `
    query GetStatsOverview {
      activeAgents: merlin_agent_AgentPassport_aggregate(where: {is_healthy: {_eq: true}}) {
        aggregate {
          count
        }
      }
      totalPipelines: merlin_agent_Pipeline_aggregate {
        aggregate {
          count
        }
      }
      runningJobs: merlin_agent_PipelineJobQueue_aggregate(where: {running: {_eq: true}}) {
        aggregate {
          count
        }
      }
      completedJobs: merlin_agent_PipelineJobQueue_aggregate(where: {completed: {_eq: true}}) {
        aggregate {
          count
        }
      }
    }
  `
};

// ===== MUTACIONES GRAPHQL CENTRALIZADAS =====

export const HASURA_MUTATIONS = {
  // Basado en el código C# oficial del agente
  UPSERT_AGENT_PING: `
    mutation UpsertAgentPing($agentId: uuid!, $pingData: merlin_agent_AgentPassportPing_insert_input!) {
      insert_merlin_agent_AgentPassportPing(
        objects: [$pingData]
        on_conflict: {
          constraint: merlin_agent_AgentPassportPing_agent_passport_id_key
          update_columns: [
            hostname, 
            ips, 
            agent_local_time, 
            current_directory, 
            os_version, 
            agent_version_from_source_code,
            last_ping_at
          ]
        }
      ) {
        affected_rows
      }
    }
  `,

  // Crear nuevo agente (para la funcionalidad permitida)
  INSERT_AGENT: `
    mutation InsertAgent($agentData: merlin_agent_AgentPassport_insert_input!) {
      insert_merlin_agent_AgentPassport(objects: [$agentData]) {
        affected_rows
        returning {
          id
          name
          description
          is_testing
          enabled
          is_healthy
          created_at
        }
      }
    }
  `,

  // Crear nuevo pipeline (para la funcionalidad permitida)
  INSERT_PIPELINE: `
    mutation InsertPipeline($pipelineData: merlin_agent_Pipeline_insert_input!) {
      insert_merlin_agent_Pipeline(objects: [$pipelineData]) {
        affected_rows
        returning {
          id
          name
          description
          abort_on_error
          agent_passport_id
          disposable
          created_at
        }
      }
    }
  `,

  // Actualizar estado de salud del agente
  UPDATE_AGENT_HEALTH: `
    mutation UpdateAgentHealth($agentId: uuid!, $isHealthy: Boolean!) {
      update_merlin_agent_AgentPassport_by_pk(
        pk_columns: {id: $agentId}
        _set: {is_healthy: $isHealthy}
      ) {
        id
        name
        is_healthy
        updated_at
      }
    }
  `,

  // Habilitar/deshabilitar agente
  UPDATE_AGENT_STATUS: `
    mutation UpdateAgentStatus($agentId: uuid!, $enabled: Boolean!) {
      update_merlin_agent_AgentPassport_by_pk(
        pk_columns: {id: $agentId}
        _set: {enabled: $enabled}
      ) {
        id
        name
        enabled
        updated_at
      }
    }
  `,

  // Sistema de actualizaciones (basado en código C#)
  INSERT_AGENT_UPDATE_LOG: `
    mutation InsertAgentUpdateLog($agentId: uuid!, $logData: merlin_agent_AgentUpdateLog_insert_input!) {
      insert_merlin_agent_AgentUpdateLog(objects: [$logData]) {
        affected_rows
      }
      update_merlin_agent_AgentPassport_by_pk(
        pk_columns: {id: $agentId}
        _set: {is_healthy: true}
      ) {
        affected_rows
      }
    }
  `,

  // Actualizar configuración de auto-actualización
  UPDATE_AGENT_AUTO_UPDATE: `
    mutation UpdateAgentAutoUpdate($agentId: uuid!, $autoCleanUpdate: Boolean!) {
      update_merlin_agent_AgentPassport_by_pk(
        pk_columns: {id: $agentId}
        _set: {auto_clean_update: $autoCleanUpdate}
      ) {
        id
        name
        auto_clean_update
        updated_at
      }
    }
  `
};

// ===== CLASE DE SERVICIO =====

export class HasuraService {
  private baseUrl: string;
  private headers: Record<string, string>;

  constructor(baseUrl: string = '/api/graphql', adminSecret?: string) {
    this.baseUrl = baseUrl;
    this.headers = {
      'Content-Type': 'application/json',
    };
    
    if (adminSecret) {
      this.headers['x-hasura-admin-secret'] = adminSecret;
    }
  }

  private async executeQuery<T>(
    query: string, 
    variables: Record<string, any> = {}
  ): Promise<HasuraResponse<T>> {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({
          query,
          variables
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: HasuraResponse<T> = await response.json();
      
      if (result.errors && result.errors.length > 0) {
        console.error('GraphQL errors:', result.errors);
        throw new Error(`GraphQL error: ${result.errors[0].message}`);
      }

      return result;
    } catch (error) {
      console.error('Hasura query failed:', error);
      throw error;
    }
  }

  // ===== MÉTODOS DE AGENTES =====

  async getAgentStatus(): Promise<AgentPassport[]> {
    const result = await this.executeQuery<AgentPassportResponse>(
      HASURA_QUERIES.AGENT_STATUS
    );
    return result.data?.merlin_agent_AgentPassport || [];
  }

  async getAgentHealthStatus(): Promise<AgentPassport[]> {
    const result = await this.executeQuery<AgentPassportResponse>(
      HASURA_QUERIES.AGENT_HEALTH_STATUS
    );
    return result.data?.merlin_agent_AgentPassport || [];
  }

  async getAgentPassports(limit = 50, offset = 0): Promise<AgentPassport[]> {
    const result = await this.executeQuery<AgentPassportResponse>(
      HASURA_QUERIES.AGENT_PASSPORT_QUERY,
      { limit, offset }
    );
    return result.data?.merlin_agent_AgentPassport || [];
  }

  // ===== MÉTODOS DE PIPELINES =====

  async getPipelines(limit = 50, offset = 0): Promise<Pipeline[]> {
    const result = await this.executeQuery<PipelineResponse>(
      HASURA_QUERIES.PIPELINE_QUERY,
      { limit, offset }
    );
    return result.data?.merlin_agent_Pipeline || [];
  }

  async getPipelineUnits(pipelineId: string, useCompleteQuery = false): Promise<PipelineUnit[]> {
    const query = useCompleteQuery 
      ? HASURA_QUERIES.PIPELINE_UNITS_COMPLETE 
      : HASURA_QUERIES.PIPELINE_UNITS_BASIC;
      
    const result = await this.executeQuery<PipelineUnitsResponse>(
      query,
      { pipelineId }
    );
    return result.data?.merlin_agent_PipelineUnit || [];
  }

  // ===== MÉTODOS DE JOBS =====

  async getPipelineJobs(limit = 50, offset = 0): Promise<PipelineJobQueue[]> {
    const result = await this.executeQuery<PipelineJobsResponse>(
      HASURA_QUERIES.PIPELINE_JOBS_QUERY,
      { limit, offset }
    );
    return result.data?.merlin_agent_PipelineJobQueue || [];
  }

  async getRecentJobs(): Promise<PipelineJobQueue[]> {
    const result = await this.executeQuery<PipelineJobsResponse>(
      HASURA_QUERIES.RECENT_JOBS_QUERY
    );
    return result.data?.merlin_agent_PipelineJobQueue || [];
  }

  // ===== MÉTODOS DE LOGS =====

  async getPipelineJobLogs(pipelineJobId: string): Promise<PipelineJobLogV2Body[]> {
    const result = await this.executeQuery<LogsResponse>(
      HASURA_QUERIES.PIPELINE_JOB_LOGS_V2_QUERY,
      { pipelineJobId }
    );
    return result.data?.merlin_agent_PipelineJobLogV2Body || [];
  }

  async getRecentLogs(): Promise<PipelineJobLogV2Body[]> {
    const result = await this.executeQuery<LogsResponse>(
      HASURA_QUERIES.RECENT_LOGS_QUERY
    );
    return result.data?.merlin_agent_PipelineJobLogV2Body || [];
  }

  async getRecentErrors(): Promise<PipelineJobLogV2Body[]> {
    const result = await this.executeQuery<LogsResponse>(
      HASURA_QUERIES.RECENT_ERRORS_QUERY
    );
    return result.data?.merlin_agent_PipelineJobLogV2Body || [];
  }

  // ===== MÉTODOS DE CONEXIONES =====

  async getSFTPLinks(limit = 50, offset = 0): Promise<SFTPLink[]> {
    const result = await this.executeQuery<SFTPLinksResponse>(
      HASURA_QUERIES.SFTP_LINKS_QUERY,
      { limit, offset }
    );
    return result.data?.merlin_agent_SFTPLink || [];
  }

  async getSFTPLinkDetail(id: string): Promise<SFTPLink | null> {
    const result = await this.executeQuery<{ merlin_agent_SFTPLink_by_pk: SFTPLink }>(
      HASURA_QUERIES.SFTP_LINK_DETAIL_QUERY,
      { id }
    );
    return result.data?.merlin_agent_SFTPLink_by_pk || null;
  }

  async getSQLConnections(limit = 50, offset = 0): Promise<SQLConn[]> {
    const result = await this.executeQuery<SQLConnectionsResponse>(
      HASURA_QUERIES.SQL_CONNECTIONS_QUERY,
      { limit, offset }
    );
    return result.data?.merlin_agent_SQLConn || [];
  }

  async getSQLConnectionDetail(id: string): Promise<SQLConn | null> {
    const result = await this.executeQuery<{ merlin_agent_SQLConn_by_pk: SQLConn }>(
      HASURA_QUERIES.SQL_CONNECTION_DETAIL_QUERY,
      { id }
    );
    return result.data?.merlin_agent_SQLConn_by_pk || null;
  }

  async getCommands(limit = 50, offset = 0): Promise<Command[]> {
    const result = await this.executeQuery<CommandsResponse>(
      HASURA_QUERIES.COMMANDS_LIST_QUERY,
      { limit, offset }
    );
    return result.data?.merlin_agent_Command || [];
  }

  async getCommandDetail(id: string): Promise<Command | null> {
    const result = await this.executeQuery<{ merlin_agent_Command_by_pk: Command }>(
      HASURA_QUERIES.COMMAND_DETAIL_QUERY,
      { id }
    );
    return result.data?.merlin_agent_Command_by_pk || null;
  }

  // ===== MÉTODOS DE ESTADÍSTICAS =====

  async getStatsOverview(): Promise<{
    activeAgents: number;
    totalPipelines: number;
    runningJobs: number;
    completedJobs: number;
  }> {
    const result = await this.executeQuery<{
      activeAgents: { aggregate: { count: number } };
      totalPipelines: { aggregate: { count: number } };
      runningJobs: { aggregate: { count: number } };
      completedJobs: { aggregate: { count: number } };
    }>(HASURA_QUERIES.STATS_OVERVIEW_QUERY);

    return {
      activeAgents: result.data?.activeAgents?.aggregate?.count || 0,
      totalPipelines: result.data?.totalPipelines?.aggregate?.count || 0,
      runningJobs: result.data?.runningJobs?.aggregate?.count || 0,
      completedJobs: result.data?.completedJobs?.aggregate?.count || 0,
    };
  }

  // ===== MÉTODOS DE MUTACIONES =====

  async upsertAgentPing(agentId: string, pingData: AgentPassportPingInput): Promise<number> {
    const result = await this.executeQuery<UpsertAgentPingResponse>(
      HASURA_MUTATIONS.UPSERT_AGENT_PING,
      { agentId, pingData }
    );
    return result.data?.insert_merlin_agent_AgentPassportPing?.affected_rows || 0;
  }

  async insertAgent(agentData: AgentPassportInput): Promise<AgentPassport | null> {
    const result = await this.executeQuery<InsertAgentResponse>(
      HASURA_MUTATIONS.INSERT_AGENT,
      { agentData }
    );
    return result.data?.insert_merlin_agent_AgentPassport?.returning?.[0] || null;
  }

  async insertPipeline(pipelineData: PipelineInput): Promise<Pipeline | null> {
    const result = await this.executeQuery<InsertPipelineResponse>(
      HASURA_MUTATIONS.INSERT_PIPELINE,
      { pipelineData }
    );
    return result.data?.insert_merlin_agent_Pipeline?.returning?.[0] || null;
  }

  async updateAgentHealth(agentId: string, isHealthy: boolean): Promise<AgentPassport | null> {
    const result = await this.executeQuery<{ update_merlin_agent_AgentPassport_by_pk: AgentPassport }>(
      HASURA_MUTATIONS.UPDATE_AGENT_HEALTH,
      { agentId, isHealthy }
    );
    return result.data?.update_merlin_agent_AgentPassport_by_pk || null;
  }

  async updateAgentStatus(agentId: string, enabled: boolean): Promise<AgentPassport | null> {
    const result = await this.executeQuery<{ update_merlin_agent_AgentPassport_by_pk: AgentPassport }>(
      HASURA_MUTATIONS.UPDATE_AGENT_STATUS,
      { agentId, enabled }
    );
    return result.data?.update_merlin_agent_AgentPassport_by_pk || null;
  }

  // ===== MÉTODOS DEL SISTEMA DE ACTUALIZACIONES =====

  async getAgentVersions(): Promise<(AgentPassport & { AgentVersion?: AgentVersion })[]> {
    const result = await this.executeQuery<AgentVersionResponse>(
      HASURA_QUERIES.AGENT_VERSION_QUERY
    );
    return result.data?.merlin_agent_AgentPassport || [];
  }

  async getAgentUpdateLogs(agentId: string, limit = 20): Promise<AgentUpdateLog[]> {
    const result = await this.executeQuery<AgentUpdateLogsResponse>(
      HASURA_QUERIES.AGENT_UPDATE_LOGS_QUERY,
      { agentId, limit }
    );
    return result.data?.merlin_agent_AgentUpdateLog || [];
  }

  async getRecentUpdateLogs(): Promise<AgentUpdateLog[]> {
    const result = await this.executeQuery<AgentUpdateLogsResponse>(
      HASURA_QUERIES.RECENT_UPDATE_LOGS_QUERY
    );
    return result.data?.merlin_agent_AgentUpdateLog || [];
  }

  async insertAgentUpdateLog(agentId: string, logData: {
    agent_passport_id: string;
    logs: string;
    warnings: string;
    errors: string;
  }): Promise<number> {
    const result = await this.executeQuery<InsertAgentUpdateLogResponse>(
      HASURA_MUTATIONS.INSERT_AGENT_UPDATE_LOG,
      { agentId, logData }
    );
    return result.data?.insert_merlin_agent_AgentUpdateLog?.affected_rows || 0;
  }

  async updateAgentAutoUpdate(agentId: string, autoCleanUpdate: boolean): Promise<AgentPassport | null> {
    const result = await this.executeQuery<{ update_merlin_agent_AgentPassport_by_pk: AgentPassport }>(
      HASURA_MUTATIONS.UPDATE_AGENT_AUTO_UPDATE,
      { agentId, autoCleanUpdate }
    );
    return result.data?.update_merlin_agent_AgentPassport_by_pk || null;
  }
}

// ===== INSTANCIA SINGLETON =====

export const hasuraService = new HasuraService();