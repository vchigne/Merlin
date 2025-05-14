import { useQuery } from '@tanstack/react-query';
import { SFTP_LINKS_QUERY, SFTP_LINK_DETAIL_QUERY, SFTP_LINK_USAGE_QUERY } from '@shared/queries';
import { SFTPLink } from '@shared/types';

// Hook para obtener la lista de enlaces SFTP
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
      if (result.errors) {
        throw new Error(result.errors[0].message);
      }
      return result.data?.merlin_agent_SFTPLink || [];
    },
  });
}

// Hook para obtener detalles de un enlace SFTP específico
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
      if (result.errors) {
        throw new Error(result.errors[0].message);
      }
      return result.data?.merlin_agent_SFTPLink_by_pk;
    },
    enabled: !!id,
  });
}

interface SFTPLinkUsage {
  downloaders: Array<{
    id: string;
    name: string;
    output: string;
  }>;
  uploaders: Array<{
    id: string;
    name: string;
    input: string;
  }>;
}

// Hook para obtener el uso de un enlace SFTP específico
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
      if (result.errors) {
        throw new Error(result.errors[0].message);
      }
      
      return {
        downloaders: result.data?.merlin_agent_SFTPDownloader || [],
        uploaders: result.data?.merlin_agent_SFTPUploader || []
      };
    },
    enabled: !!id,
  });
}