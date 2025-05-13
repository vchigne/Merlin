import { useQuery } from '@tanstack/react-query';
import { executeQuery } from '@/lib/hasura-client';
import { PIPELINE_UNITS_QUERY } from '@shared/queries';

export function usePipelineUnits(pipelineId: string) {
  return useQuery({
    queryKey: ['/api/pipelines/units', pipelineId],
    queryFn: async () => {
      const result = await executeQuery(PIPELINE_UNITS_QUERY, { pipelineId });
      
      if (result.errors) {
        throw new Error(result.errors[0].message);
      }
      
      return result.data.merlin_agent_PipelineUnit;
    },
    enabled: !!pipelineId,
  });
}

export function usePipelineUnitDetails(unitId: string, type: string) {
  // Determine which query to use based on unit type
  const getQueryForType = () => {
    switch (type) {
      case 'command':
        return `
          query GetCommandDetails($id: uuid!) {
            merlin_agent_Command(where: {id: {_eq: $id}}) {
              id
              target
              working_directory
              args
              name
              description
              raw_script
              return_output
              return_output_type
              labels
            }
          }
        `;
      case 'query':
        return `
          query GetQueryDetails($id: uuid!) {
            merlin_agent_QueryQueue(where: {id: {_eq: $id}}) {
              id
              name
              description
              Query {
                id
                name
                query_string
                path
                print_headers
                enabled
                sqlconn_id
                date_format
                separator
                target_encoding
                timeout
              }
            }
          }
        `;
      case 'sftp_download':
        return `
          query GetSFTPDownloaderDetails($id: String!) {
            merlin_agent_SFTPDownloader(where: {id: {_eq: $id}}) {
              id
              name
              output
              return_output
              sftp_link_id
              SFTPLink {
                name
                host
              }
            }
          }
        `;
      case 'sftp_upload':
        return `
          query GetSFTPUploaderDetails($id: String!) {
            merlin_agent_SFTPUploader(where: {id: {_eq: $id}}) {
              id
              name
              input
              return_output
              sftp_link_id
              SFTPLink {
                name
                host
              }
            }
          }
        `;
      case 'zip':
        return `
          query GetZipDetails($id: String!) {
            merlin_agent_Zip(where: {id: {_eq: $id}}) {
              id
              name
              output
              return_output
            }
          }
        `;
      case 'unzip':
        return `
          query GetUnzipDetails($id: String!) {
            merlin_agent_UnZip(where: {id: {_eq: $id}}) {
              id
              name
              input
              output
              return_output
            }
          }
        `;
      default:
        return null;
    }
  };

  const query = getQueryForType();
  
  return useQuery({
    queryKey: ['/api/pipelines/unit-details', unitId, type],
    queryFn: async () => {
      if (!query) {
        return null;
      }
      
      const result = await executeQuery(query, { id: unitId });
      
      if (result.errors) {
        throw new Error(result.errors[0].message);
      }
      
      // Extract data based on type
      switch (type) {
        case 'command':
          return result.data.merlin_agent_Command[0];
        case 'query':
          return result.data.merlin_agent_QueryQueue[0];
        case 'sftp_download':
          return result.data.merlin_agent_SFTPDownloader[0];
        case 'sftp_upload':
          return result.data.merlin_agent_SFTPUploader[0];
        case 'zip':
          return result.data.merlin_agent_Zip[0];
        case 'unzip':
          return result.data.merlin_agent_UnZip[0];
        default:
          return null;
      }
    },
    enabled: !!unitId && !!type && !!query,
  });
}
