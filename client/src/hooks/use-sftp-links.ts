import { useQuery } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { SFTP_LINKS_QUERY, SFTP_LINK_DETAIL_QUERY, SFTP_LINK_USAGE_QUERY } from '@shared/queries';
import { SFTPLink, SFTPDownloader, SFTPUploader } from '@shared/types';

// Hook para obtener la lista de conexiones SFTP
export function useSFTPLinks() {
  return useQuery({
    queryKey: ['/api/graphql/sftp-links'],
    queryFn: async () => {
      const response = await fetch('/api/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: SFTP_LINKS_QUERY }),
        credentials: 'include',
      });
      
      const result = await response.json();
      return result.data.merlin_agent_SFTPLink as SFTPLink[];
    },
  });
}

// Hook para obtener detalles de una conexión SFTP específica
export function useSFTPLinkDetail(id: string) {
  return useQuery({
    queryKey: ['/api/graphql/sftp-link', id],
    queryFn: async () => {
      const response = await fetch('/api/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          query: SFTP_LINK_DETAIL_QUERY,
          variables: { id }
        }),
        credentials: 'include',
      });
      
      const result = await response.json();
      return result.data.merlin_agent_SFTPLink_by_pk;
    },
    enabled: !!id,
  });
}

interface SFTPLinkUsage {
  downloaders: {
    id: string;
    name: string;
    output?: string;
    return_output?: boolean;
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
    input?: string;
    return_output?: boolean;
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
    queryKey: ['/api/graphql/sftp-link-usage', id],
    queryFn: async () => {
      const response = await fetch('/api/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          query: SFTP_LINK_USAGE_QUERY,
          variables: { id }
        }),
        credentials: 'include',
      });
      
      const result = await response.json();
      return result.data;
    },
    enabled: !!id,
  });
}