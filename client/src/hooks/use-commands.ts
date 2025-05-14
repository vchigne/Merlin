import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/hasura-client';
import { COMMANDS_LIST_QUERY, COMMAND_DETAIL_QUERY, COMMAND_USAGE_QUERY } from '@shared/queries';
import { Command } from '@shared/types';

// Hook para obtener la lista de comandos
export function useCommands() {
  return useQuery({
    queryKey: ['commands'],
    queryFn: async () => {
      const response = await apiRequest(COMMANDS_LIST_QUERY);
      return response.data.merlin_agent_Command as Command[];
    },
  });
}

// Hook para obtener detalles de un comando específico
export function useCommandDetail(id: string) {
  return useQuery({
    queryKey: ['command', id],
    queryFn: async () => {
      const response = await apiRequest(COMMAND_DETAIL_QUERY, { id });
      return response.data.merlin_agent_Command_by_pk;
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
    queryKey: ['command-usage', id],
    queryFn: async () => {
      const response = await apiRequest(COMMAND_USAGE_QUERY, { id });
      return response.data;
    },
    enabled: !!id,
  });
}