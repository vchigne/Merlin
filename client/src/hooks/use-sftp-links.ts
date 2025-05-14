import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/hasura-client';
import { SFTP_LINKS_QUERY, SFTP_LINK_DETAIL_QUERY, SFTP_LINK_USAGE_QUERY } from '@shared/queries';
import { SFTPLink, SFTPDownloader, SFTPUploader } from '@shared/types';

// Hook para obtener la lista de conexiones SFTP
export function useSFTPLinks() {
  return useQuery({
    queryKey: ['sftp-links'],
    queryFn: async () => {
      const response = await apiRequest(SFTP_LINKS_QUERY);
      return response.data.merlin_agent_SFTPLink as SFTPLink[];
    },
  });
}

// Hook para obtener detalles de una conexión SFTP específica
export function useSFTPLinkDetail(id: string) {
  return useQuery({
    queryKey: ['sftp-link', id],
    queryFn: async () => {
      const response = await apiRequest(SFTP_LINK_DETAIL_QUERY, { id });
      return response.data.merlin_agent_SFTPLink_by_pk;
    },
    enabled: !!id,
  });
}

interface SFTPLinkUsage {
  downloaders: {
    id: string;
    name: string;
    merlin_agent_PipelineUnit: Array<{
      id: string;
      pipeline: {
        id: string;
        name: string;
        agent_passport: {
          id: string;
          name: string;
        }
      }
    }>
  }[];
  uploaders: {
    id: string;
    name: string;
    merlin_agent_PipelineUnit: Array<{
      id: string;
      pipeline: {
        id: string;
        name: string;
        agent_passport: {
          id: string;
          name: string;
        }
      }
    }>
  }[];
}

// Hook para obtener el uso de una conexión SFTP específica
export function useSFTPLinkUsage(id: string) {
  return useQuery<SFTPLinkUsage>({
    queryKey: ['sftp-link-usage', id],
    queryFn: async () => {
      const response = await apiRequest(SFTP_LINK_USAGE_QUERY, { id });
      return response.data;
    },
    enabled: !!id,
  });
}