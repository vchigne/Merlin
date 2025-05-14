import { useQuery } from '@tanstack/react-query';
import { SQL_CONNECTIONS_QUERY, SQL_CONNECTION_DETAIL_QUERY, SQL_CONN_USAGE_QUERY } from '@shared/queries';
import { SQLConn } from '@shared/types';

// Hook para obtener la lista de conexiones SQL
export function useSQLConnections() {
  return useQuery({
    queryKey: ['/api/graphql/sql-connections'],
    queryFn: async () => {
      const response = await fetch('/api/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: SQL_CONNECTIONS_QUERY }),
        credentials: 'include',
      });
      
      const result = await response.json();
      return result.data.merlin_agent_SQLConn as SQLConn[];
    },
  });
}

// Hook para obtener detalles de una conexión SQL específica
export function useSQLConnectionDetail(id: string) {
  return useQuery({
    queryKey: ['/api/graphql/sql-connection', id],
    queryFn: async () => {
      const response = await fetch('/api/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          query: SQL_CONNECTION_DETAIL_QUERY,
          variables: { id }
        }),
        credentials: 'include',
      });
      
      const result = await response.json();
      return result.data.merlin_agent_SQLConn_by_pk;
    },
    enabled: !!id,
  });
}

interface SQLConnUsage {
  queries: {
    id: string;
    name: string;
    query_queue: {
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
    }
  }[];
}

// Hook para obtener el uso de una conexión SQL específica
export function useSQLConnUsage(id: string) {
  return useQuery<SQLConnUsage>({
    queryKey: ['/api/graphql/sql-connection-usage', id],
    queryFn: async () => {
      const response = await fetch('/api/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          query: SQL_CONN_USAGE_QUERY,
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