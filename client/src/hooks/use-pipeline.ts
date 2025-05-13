import { useQuery } from '@tanstack/react-query';
import { executeQuery } from '@/lib/hasura-client';
import { PIPELINE_QUERY, PIPELINE_UNITS_QUERY } from '@shared/queries';

interface UsePipelinesOptions {
  limit?: number;
  offset?: number;
  agentId?: string;
  includeJobInfo?: boolean;
}

export function usePipelines({
  limit = 20,
  offset = 0,
  agentId,
  includeJobInfo = true
}: UsePipelinesOptions = {}) {
  // Build where clause based on filters
  const whereClause = agentId ? `where: {agent_passport_id: {_eq: "${agentId}"}}` : '';
  
  // Build include jobs fragment based on option
  const jobsFragment = includeJobInfo ? `
    PipelineJobQueues(limit: 1, order_by: {created_at: desc}) {
      id
      completed
      running
      aborted
      created_at
    }
  ` : '';

  return useQuery({
    queryKey: ['/api/pipelines', { limit, offset, agentId }],
    queryFn: async () => {
      const result = await executeQuery(`
        query GetPipelines($limit: Int!, $offset: Int!) {
          merlin_agent_Pipeline(
            ${whereClause}
            order_by: {created_at: desc}
            limit: $limit
            offset: $offset
          ) {
            id
            name
            description
            abort_on_error
            agent_passport_id
            created_at
            updated_at
            disposable
            AgentPassport {
              name
            }
            ${jobsFragment}
          }
          merlin_agent_Pipeline_aggregate(${whereClause}) {
            aggregate {
              count
            }
          }
        }
      `, { limit, offset });
      
      if (result.errors) {
        throw new Error(result.errors[0].message);
      }
      
      return {
        pipelines: result.data.merlin_agent_Pipeline,
        totalCount: result.data.merlin_agent_Pipeline_aggregate.aggregate.count
      };
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}

export function usePipeline(pipelineId: string) {
  return useQuery({
    queryKey: ['/api/pipelines', pipelineId],
    queryFn: async () => {
      const result = await executeQuery(`
        query GetPipeline($pipelineId: uuid!) {
          merlin_agent_Pipeline(where: {id: {_eq: $pipelineId}}) {
            id
            name
            description
            abort_on_error
            agent_passport_id
            created_at
            updated_at
            disposable
            notify_on_abort_email_id
            notify_on_abort_webhook_id
            AgentPassport {
              id
              name
            }
            PipelineJobQueues(limit: 5, order_by: {created_at: desc}) {
              id
              completed
              running
              aborted
              created_at
              updated_at
            }
          }
        }
      `, { pipelineId });
      
      if (result.errors) {
        throw new Error(result.errors[0].message);
      }
      
      return result.data.merlin_agent_Pipeline[0];
    },
    enabled: !!pipelineId,
  });
}

export function usePipelineUnits(pipelineId: string) {
  return useQuery({
    queryKey: ['/api/pipelines', pipelineId, 'units'],
    queryFn: async () => {
      const result = await executeQuery(`
        query GetPipelineUnits($pipelineId: uuid!) {
          merlin_agent_PipelineUnit(where: {pipeline_id: {_eq: $pipelineId}}) {
            id
            pipeline_id
            command_id
            query_queue_id
            sftp_downloader_id
            sftp_uploader_id
            zip_id
            unzip_id
            pipeline_unit_id
            comment
            retry_after_milliseconds
            retry_count
            timeout_milliseconds
            abort_on_timeout
            continue_on_error
            posx
            posy
            call_pipeline
            created_at
            updated_at
            Command {
              id
              name
              description
              target
              working_directory
              args
              raw_script
              return_output
              return_output_type
            }
            QueryQueue {
              id
              name
              description
              Queries {
                id
                order
                name
                query_string
                path
                print_headers
                return_output
                sqlconn_id
                SQLConn {
                  id
                  name
                  driver
                }
              }
            }
            SftpDownloader {
              id
              name
              output
              return_output
              sftp_link_id
              SftpLink {
                id
                name
                host
                port
                username
              }
            }
            SftpUploader {
              id
              name
              input
              return_output
              sftp_link_id
              SftpLink {
                id
                name
                host
                port
                username
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
              input
              output
              return_output
            }
            PipelineJobLogs(limit: 1, order_by: {created_at: desc}) {
              id
              pipeline_job_queue_id
            }
          }
        }
      `, { pipelineId });
      
      if (result.errors) {
        throw new Error(result.errors[0].message);
      }
      
      return result.data.merlin_agent_PipelineUnit;
    },
    enabled: !!pipelineId,
  });
}
