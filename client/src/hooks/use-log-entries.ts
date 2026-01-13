import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { executeQuery } from '@/lib/hasura-client';

interface UseLogEntriesOptions {
  limit?: number;
  offset?: number;
  level?: string;
  search?: string;
  pipelineId?: string;
  agentId?: string;
  jobId?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

export function useLogEntries({
  limit = 20,
  offset = 0,
  level,
  search,
  pipelineId,
  agentId,
  jobId,
  dateFrom,
  dateTo
}: UseLogEntriesOptions = {}) {
  // Build filter conditions
  const buildFilterConditions = useCallback(() => {
    const conditions: string[] = [];
    
    if (level && level !== 'all') {
      conditions.push(`level: {_eq: "${level}"}`);
    }
    
    if (search) {
      conditions.push(`_or: [
        {message: {_ilike: "%${search}%"}},
        {callsite: {_ilike: "%${search}%"}}
      ]`);
    }
    
    // No podemos acceder directamente a PipelineJobQueue, así que filtramos por ID
    // pero esto no establecerá la relación completa
    if (pipelineId) {
      conditions.push(`pipeline_unit_id: {_ilike: "%${pipelineId}%"}`);
    }
    
    // No podemos filtrar por agente directamente ya que no tenemos la relación
    
    if (jobId) {
      conditions.push(`pipeline_job_id: {_eq: "${jobId}"}`);
    }
    
    if (dateFrom) {
      conditions.push(`date: {_gte: "${dateFrom.toISOString()}"}`);
    }
    
    if (dateTo) {
      conditions.push(`date: {_lte: "${dateTo.toISOString()}"}`);
    }
    
    return conditions;
  }, [level, search, pipelineId, agentId, jobId, dateFrom, dateTo]);

  return useQuery({
    queryKey: ['/api/logs', { limit, offset, level, search, pipelineId, agentId, jobId, dateFrom, dateTo }],
    queryFn: async () => {
      const filterConditions = buildFilterConditions();
      const hasFilters = filterConditions.length > 0;
      const variables: Record<string, any> = { limit, offset };
      
      let result;
      
      if (hasFilters) {
        // Query with filters
        const whereClause = `where: {${filterConditions.join(', ')}}`;
        
        result = await executeQuery(`
          query GetLogEntriesWithFilters($limit: Int!, $offset: Int!) {
            merlin_agent_PipelineJobLogV2Body(
              ${whereClause}
              order_by: {date: desc}
              limit: $limit
              offset: $offset
            ) {
              id
              pipeline_job_id
              pipeline_unit_id
              date
              level
              message
              callsite
              exception
              exception_message
              exception_stack_trace
              created_at
              PipelineJobQueue {
                id
                Pipeline {
                  id
                  name
                }
                started_by_agent
              }
            }
            merlin_agent_PipelineJobLogV2Body_aggregate(${whereClause}) {
              aggregate {
                count
              }
            }
          }
        `, variables);
      } else {
        // Query without filters
        result = await executeQuery(`
          query GetLogEntries($limit: Int!, $offset: Int!) {
            merlin_agent_PipelineJobLogV2Body(
              order_by: {date: desc}
              limit: $limit
              offset: $offset
            ) {
              id
              pipeline_job_id
              pipeline_unit_id
              date
              level
              message
              callsite
              exception
              exception_message
              exception_stack_trace
              created_at
              PipelineJobQueue {
                id
                Pipeline {
                  id
                  name
                }
                started_by_agent
              }
            }
            merlin_agent_PipelineJobLogV2Body_aggregate {
              aggregate {
                count
              }
            }
          }
        `, variables);
      }
      
      if (result.errors) {
        throw new Error(result.errors[0].message);
      }
      
      // No podemos acceder a PipelineJobQueue directamente, así que no intentamos 
      // obtener información de agentes de esta manera
      
      // En su lugar, recuperamos toda la información disponible de los logs
      
      return {
        logs: result.data.merlin_agent_PipelineJobLogV2Body,
        totalCount: result.data.merlin_agent_PipelineJobLogV2Body_aggregate.aggregate.count
      };
    },
    refetchInterval: 15000, // Refetch every 15 seconds
  });
}

// Hook for getting log details by ID
export function useLogEntry(logId: number | string) {
  return useQuery({
    queryKey: ['/api/logs', logId],
    queryFn: async () => {
      const result = await executeQuery(`
        query GetLogEntry($logId: Int!) {
          merlin_agent_PipelineJobLogV2Body(where: {id: {_eq: $logId}}) {
            id
            pipeline_job_id
            pipeline_unit_id
            date
            level
            message
            callsite
            exception
            exception_message
            exception_stack_trace
            created_at
            PipelineJobQueue {
              id
              completed
              running
              aborted
              created_at
              updated_at
              started_by_agent
              Pipeline {
                id
                name
                description
              }
            }
          }
        }
      `, { logId: Number(logId) });
      
      if (result.errors) {
        throw new Error(result.errors[0].message);
      }
      
      const logEntry = result.data.merlin_agent_PipelineJobLogV2Body[0];
      
      // Si tenemos started_by_agent, buscar el nombre del agente
      if (logEntry?.PipelineJobQueue?.started_by_agent) {
        try {
          const agentResult = await executeQuery(`
            query GetAgentName($agentId: uuid!) {
              merlin_agent_AgentPassport(where: {id: {_eq: $agentId}}) {
                id
                name
              }
            }
          `, { agentId: logEntry.PipelineJobQueue.started_by_agent });
          
          if (agentResult.data?.merlin_agent_AgentPassport?.[0]) {
            logEntry.agent = agentResult.data.merlin_agent_AgentPassport[0];
          }
        } catch (e) {
          // Si falla la búsqueda del agente, continuar sin el nombre
        }
      }
      
      // Si tenemos pipeline_unit_id, buscar los detalles del comando
      if (logEntry?.pipeline_unit_id) {
        try {
          const unitResult = await executeQuery(`
            query GetPipelineUnitWithCommand($unitId: uuid!) {
              merlin_agent_PipelineUnit(where: {id: {_eq: $unitId}}) {
                id
                comment
                command_id
                query_queue_id
                sftp_downloader_id
                sftp_uploader_id
                Command {
                  id
                  name
                  description
                  target
                  args
                  working_directory
                  raw_script
                  return_output
                }
                QueryQueue {
                  id
                  name
                  description
                }
                SFTPDownloader {
                  id
                  name
                  description
                }
                SFTPUploader {
                  id
                  name
                  description
                }
              }
            }
          `, { unitId: logEntry.pipeline_unit_id });
          
          if (unitResult.data?.merlin_agent_PipelineUnit?.[0]) {
            logEntry.pipelineUnit = unitResult.data.merlin_agent_PipelineUnit[0];
          }
        } catch (e) {
          // Si falla la búsqueda del unit, continuar sin los detalles
        }
      }
      
      return logEntry;
    },
    enabled: !!logId,
  });
}