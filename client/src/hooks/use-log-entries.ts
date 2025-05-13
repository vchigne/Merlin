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
  // Build where conditions based on filters
  const buildWhereClause = useCallback(() => {
    const conditions: string[] = [];
    
    if (level) {
      conditions.push(`level: {_eq: "${level}"}`);
    }
    
    if (search) {
      conditions.push(`_or: [
        {message: {_ilike: "%${search}%"}},
        {callsite: {_ilike: "%${search}%"}}
      ]`);
    }
    
    if (pipelineId) {
      conditions.push(`PipelineJobQueue: {pipeline_id: {_eq: "${pipelineId}"}}`);
    }
    
    if (agentId) {
      conditions.push(`PipelineJobQueue: {started_by_agent: {_eq: "${agentId}"}}`);
    }
    
    if (jobId) {
      conditions.push(`pipeline_job_queue_id: {_eq: "${jobId}"}`);
    }
    
    if (dateFrom) {
      conditions.push(`date: {_gte: "${dateFrom.toISOString()}"}`);
    }
    
    if (dateTo) {
      conditions.push(`date: {_lte: "${dateTo.toISOString()}"}`);
    }
    
    return conditions.length > 0 
      ? `where: {${conditions.join(', ')}}` 
      : '';
  }, [level, search, pipelineId, agentId, jobId, dateFrom, dateTo]);

  return useQuery({
    queryKey: ['/api/logs', { limit, offset, level, search, pipelineId, agentId, jobId, dateFrom, dateTo }],
    queryFn: async () => {
      const whereClause = buildWhereClause();
      
      const result = await executeQuery(`
        query GetLogEntries($limit: Int!, $offset: Int!) {
          merlin_agent_PipelineJobLogV2Body(
            ${whereClause}
            order_by: {date: desc}
            limit: $limit
            offset: $offset
          ) {
            id
            pipeline_job_queue_id
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
              pipeline_id
              started_by_agent
              Pipeline {
                id
                name
              }
            }
            PipelineUnit {
              id
              comment
            }
          }
          merlin_agent_PipelineJobLogV2Body_aggregate(${whereClause}) {
            aggregate {
              count
            }
          }
        }
      `, { limit, offset });
      
      if (result.errors) {
        throw new Error(result.errors[0].message);
      }
      
      // Get agents for log entries
      const agentIds = result.data.merlin_agent_PipelineJobLogV2Body
        .map((log: any) => log.PipelineJobQueue?.started_by_agent)
        .filter(Boolean);
      
      if (agentIds.length > 0) {
        // Create a uniqueAgentIds array without using Set spread
        const uniqueAgentIds: string[] = [];
        agentIds.forEach(id => {
          if (!uniqueAgentIds.includes(id)) {
            uniqueAgentIds.push(id);
          }
        });
        
        const agentsResult = await executeQuery(`
          query GetAgents($agentIds: [uuid!]) {
            merlin_agent_AgentPassport(where: {id: {_in: $agentIds}}) {
              id
              name
            }
          }
        `, { agentIds: uniqueAgentIds });
        
        if (!agentsResult.errors) {
          const agentsMap = new Map();
          agentsResult.data.merlin_agent_AgentPassport.forEach((agent: any) => {
            agentsMap.set(agent.id, agent);
          });
          
          // Add agent info to logs
          result.data.merlin_agent_PipelineJobLogV2Body = result.data.merlin_agent_PipelineJobLogV2Body.map((log: any) => {
            const agentId = log.PipelineJobQueue?.started_by_agent;
            if (agentId && agentsMap.has(agentId)) {
              return {
                ...log,
                AgentPassport: agentsMap.get(agentId)
              };
            }
            return log;
          });
        }
      }
      
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
            pipeline_job_queue_id
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
              pipeline_id
              started_by_agent
              Pipeline {
                id
                name
              }
            }
            PipelineUnit {
              id
              comment
            }
          }
        }
      `, { logId: Number(logId) });
      
      if (result.errors) {
        throw new Error(result.errors[0].message);
      }
      
      return result.data.merlin_agent_PipelineJobLogV2Body[0];
    },
    enabled: !!logId,
  });
}
