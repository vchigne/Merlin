import { useQuery } from '@tanstack/react-query';
import { COMMANDS_LIST_QUERY, COMMAND_DETAIL_QUERY, COMMAND_USAGE_QUERY } from '@shared/queries';
import { Command } from '@shared/types';

// Hook para obtener la lista de comandos
export function useCommands() {
  return useQuery({
    queryKey: ['/api/graphql/commands'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/graphql', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            query: COMMANDS_LIST_QUERY,
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
        if (!result.data || !result.data.merlin_agent_Command) {
          console.error("Unexpected API response format:", result);
          throw new Error("Unexpected API response format");
        }
        
        return result.data.merlin_agent_Command as Command[];
      } catch (error) {
        console.error("Error fetching commands:", error);
        throw error;
      }
    },
  });
}

// Hook para obtener detalles de un comando específico
export function useCommandDetail(id: string) {
  return useQuery<CommandDetailResponse>({
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

interface PipelineUnit {
  id: string;
  comment?: string;
  pipeline_id: string;
  posx?: number;
  posy?: number;
  created_at?: string;
  updated_at?: string;
  pipeline?: {
    id: string;
    name: string;
    description?: string;
    agent_passport?: {
      id: string;
      name: string;
    };
  };
}

interface CommandDetailResponse {
  id: string;
  name: string;
  target: string;
  working_directory: string;
  args: string;
  description: string;
  created_at: string;
  updated_at: string;
  instant: boolean;
  raw_script: string;
  return_output: boolean;
  return_output_type: string;
  labels: string[];
  dq_process_id: string;
  DQProcess?: {
    id: string;
    action: string;
    area: string;
    procedure: string;
    responsible: string;
  };
}

// Hook para obtener el uso de un comando específico
export function useCommandUsage(id: string) {
  return useQuery<{ merlin_agent_PipelineUnit: PipelineUnit[] }>({
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