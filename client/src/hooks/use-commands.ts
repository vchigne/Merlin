import { useQuery } from '@tanstack/react-query';
import { COMMANDS_LIST_QUERY, COMMAND_DETAIL_QUERY, COMMAND_USAGE_QUERY } from '@shared/queries';
import { Command } from '@shared/types';

// Hook para obtener la lista de comandos
export function useCommands() {
  return useQuery({
    queryKey: ['/api/graphql/commands'],
    queryFn: async () => {
      const response = await fetch('/api/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: COMMANDS_LIST_QUERY }),
        credentials: 'include',
      });
      
      const result = await response.json();
      return result.data.merlin_agent_Command as Command[];
    },
  });
}

// Hook para obtener detalles de un comando específico
export function useCommandDetail(id: string) {
  return useQuery({
    queryKey: ['/api/graphql/command', id],
    queryFn: async () => {
      const response = await fetch('/api/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          query: COMMAND_DETAIL_QUERY,
          variables: { id }
        }),
        credentials: 'include',
      });
      
      const result = await response.json();
      return result.data.merlin_agent_Command_by_pk;
    },
    enabled: !!id,
  });
}

interface CommandUsage {
  command: {
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
  };
}

// Hook para obtener el uso de un comando específico
export function useCommandUsage(id: string) {
  return useQuery<CommandUsage>({
    queryKey: ['/api/graphql/command-usage', id],
    queryFn: async () => {
      const response = await fetch('/api/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          query: COMMAND_USAGE_QUERY,
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