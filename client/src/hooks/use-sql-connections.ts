import { useQuery } from '@tanstack/react-query';
import { SQL_CONNECTIONS_QUERY, SQL_CONNECTION_DETAIL_QUERY, SQL_CONN_USAGE_QUERY } from '@shared/queries';
import { SQLConn } from '@shared/types';

// Hook para obtener la lista de conexiones SQL
export function useSQLConnections() {
  return useQuery({
    queryKey: ['/api/graphql/sql-connections'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/graphql', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            query: SQL_CONNECTIONS_QUERY, 
            variables: { limit: 100 } 
          }),
          credentials: 'include',
        });
        
        const result = await response.json();
        if (result.errors) {
          console.error("GraphQL error:", result.errors);
          throw new Error(result.errors[0].message);
        }
        
        // Verificamos que la respuesta tenga la estructura esperada
        if (!result.data || !result.data.merlin_agent_SQLConn) {
          console.error("Unexpected API response format:", result);
          throw new Error("Unexpected API response format");
        }
        
        return result.data.merlin_agent_SQLConn as SQLConn[];
      } catch (error) {
        console.error("Error fetching SQL connections:", error);
        throw error;
      }
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
      if (result.errors) {
        throw new Error(result.errors[0].message);
      }
      
      // Obtenemos los datos del primer elemento del array connection
      // y las consultas asociadas
      const connection = result.data?.connection?.[0] || null;
      const queries = result.data?.queries || [];
      
      // Devolvemos un objeto con la conexión y sus consultas
      return {
        ...connection,
        queries
      };
    },
    enabled: !!id,
  });
}

interface SQLConnUsage {
  queries: Array<{
    id: string;
    name: string;
    query_string?: string;
    enabled?: boolean;
    path?: string;
    query_queue?: {
      id: string;
      name: string;
      PipelineUnits?: Array<{
        id: string;
        pipeline?: {
          id: string;
          name: string;
          agent_passport?: {
            id: string;
            name: string;
          };
        };
      }>;
    };
  }>;
}

// Hook para obtener el uso de una conexión SQL específica
export function useSQLConnectionUsage(id: string) {
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