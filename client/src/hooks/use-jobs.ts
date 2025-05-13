import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { executeQuery } from '@/lib/hasura-client';

interface UseJobsOptions {
  limit?: number;
  offset?: number;
  filters?: {
    pipelineId?: string;
    agentId?: string;
    status?: 'completed' | 'running' | 'error' | 'all';
  };
}

export function useJobs({ 
  limit = 20, 
  offset = 0, 
  filters = {}
}: UseJobsOptions = {}) {
  // Build filter conditions
  const buildFilterConditions = useCallback(() => {
    const conditions: string[] = [];
    
    if (filters.pipelineId) {
      conditions.push(`pipeline_id: {_eq: "${filters.pipelineId}"}`);
    }
    
    if (filters.agentId) {
      conditions.push(`started_by_agent: {_eq: "${filters.agentId}"}`);
    }
    
    if (filters.status) {
      switch (filters.status) {
        case 'completed':
          conditions.push('completed: {_eq: true}');
          break;
        case 'running':
          conditions.push('running: {_eq: true}');
          break;
        case 'error':
          conditions.push('aborted: {_eq: true}');
          break;
      }
    }
    
    return conditions;
  }, [filters]);

  return useQuery({
    queryKey: ['/api/jobs', { limit, offset, ...filters }],
    queryFn: async () => {
      const filterConditions = buildFilterConditions();
      const hasFilters = filterConditions.length > 0;
      const variables: Record<string, any> = { limit, offset };
      
      let result;
      
      if (hasFilters) {
        // Query with filters
        const whereClause = `where: {${filterConditions.join(', ')}}`;
        
        result = await executeQuery(`
          query GetJobsWithFilters($limit: Int!, $offset: Int!) {
            merlin_agent_PipelineJobQueue(
              ${whereClause}
              order_by: {created_at: desc}
              limit: $limit
              offset: $offset
            ) {
              id
              pipeline_id
              completed
              running
              aborted
              created_at
              updated_at
              started_by_agent
              Pipeline {
                name
              }
              AgentPassport {
                name
              }
              PipelineJobLogs(limit: 3) {
                id
                logs
                warnings
                errors
              }
            }
            merlin_agent_PipelineJobQueue_aggregate(${whereClause}) {
              aggregate {
                count
              }
            }
          }
        `, variables);
      } else {
        // Query without filters
        result = await executeQuery(`
          query GetJobs($limit: Int!, $offset: Int!) {
            merlin_agent_PipelineJobQueue(
              order_by: {created_at: desc}
              limit: $limit
              offset: $offset
            ) {
              id
              pipeline_id
              completed
              running
              aborted
              created_at
              updated_at
              started_by_agent
              Pipeline {
                name
              }
              AgentPassport {
                name
              }
              PipelineJobLogs(limit: 3) {
                id
                logs
                warnings
                errors
              }
            }
            merlin_agent_PipelineJobQueue_aggregate {
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
      
      return {
        jobs: result.data.merlin_agent_PipelineJobQueue,
        totalCount: result.data.merlin_agent_PipelineJobQueue_aggregate.aggregate.count
      };
    },
    refetchInterval: 10000, // Refetch every 10 seconds
  });
}

export function useJob(jobId: string) {
  return useQuery({
    queryKey: ['/api/jobs', jobId],
    queryFn: async () => {
      const result = await executeQuery(`
        query GetJob($jobId: uuid!) {
          merlin_agent_PipelineJobQueue(where: {id: {_eq: $jobId}}) {
            id
            pipeline_id
            completed
            running
            aborted
            created_at
            updated_at
            started_by_agent
            Pipeline {
              name
              description
            }
            AgentPassport {
              id
              name
            }
            PipelineJobLogs(order_by: {log_order: asc}) {
              id
              pipeline_unit_id
              logs
              warnings
              errors
              created_at
              updated_at
              log_order
              milliseconds
              PipelineUnit {
                id
                comment
              }
            }
          }
        }
      `, { jobId });
      
      if (result.errors) {
        throw new Error(result.errors[0].message);
      }
      
      return result.data.merlin_agent_PipelineJobQueue[0];
    },
    enabled: !!jobId,
  });
}