import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { executeQuery } from '@/lib/hasura-client';
import { AGENT_HEALTH_STATUS_QUERY } from '@shared/queries';
import { determineAgentStatus } from '@/lib/utils';

interface AgentStatusResult {
  agents: any[];
  healthySummary: {
    healthy: number;
    warning: number;
    error: number;
    offline: number;
    total: number;
  };
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useAgentStatus(): AgentStatusResult {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['/api/agents/status'],
    queryFn: async () => {
      const result = await executeQuery(AGENT_HEALTH_STATUS_QUERY);
      if (result.errors) {
        throw new Error(result.errors[0].message);
      }
      return result.data.merlin_agent_AgentPassport;
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Process agents to add status information
  const processedAgents = data?.map((agent: any) => {
    const lastPing = agent.AgentPassportPing?.[0]?.last_ping_at;
    const status = determineAgentStatus(agent.is_healthy, lastPing);
    
    return {
      ...agent,
      status,
    };
  }) || [];

  // Calculate health summary
  const healthySummary = processedAgents.reduce(
    (acc: any, agent: any) => {
      acc[agent.status]++;
      acc.total++;
      return acc;
    },
    { healthy: 0, warning: 0, error: 0, offline: 0, total: 0 }
  );

  const manualRefetch = useCallback(async () => {
    await refetch();
  }, [refetch]);

  return {
    agents: processedAgents,
    healthySummary,
    isLoading,
    error: error as Error | null,
    refetch: manualRefetch,
  };
}
