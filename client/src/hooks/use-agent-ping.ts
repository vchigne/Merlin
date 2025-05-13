import { useQuery } from '@tanstack/react-query';
import { executeQuery } from '@/lib/hasura-client';
import { formatRelativeTime } from '@/lib/utils';

interface UseAgentPingOptions {
  agentId: string;
  enabled?: boolean;
}

export function useAgentPing({ agentId, enabled = true }: UseAgentPingOptions) {
  return useQuery({
    queryKey: ['/api/agents/ping', agentId],
    queryFn: async () => {
      const result = await executeQuery(`
        query GetAgentPings($agentId: String!) {
          merlin_agent_AgentPassportPing(
            where: {agent_passport_id: {_eq: $agentId}},
            order_by: {last_ping_at: desc},
            limit: 10
          ) {
            agent_passport_id
            hostname
            ips
            created_at
            last_ping_at
            agent_local_time
            current_directory
            os_version
            agent_version_from_source_code
          }
        }
      `, { agentId });
      
      if (result.errors) {
        throw new Error(result.errors[0].message);
      }
      
      // Add relative time to each ping
      const pings = result.data.merlin_agent_AgentPassportPing;
      return pings.map((ping: any) => ({
        ...ping,
        relative_time: ping.last_ping_at ? formatRelativeTime(ping.last_ping_at) : 'Never'
      }));
    },
    enabled: !!agentId && enabled,
    refetchInterval: 60000, // Refetch every minute
  });
}
