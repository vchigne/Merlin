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

  // Debug: Log raw agent data
  console.log('Datos de agente en bruto (primero 2 registros):', data?.slice(0, 2));
  
  // Process agents to add status information
  const processedAgents = data?.map((agent: any) => {
    // No need to convert AgentPassportPing to array anymore, keep the original structure
    // Our function now handles both formats correctly
    const normalizedAgent = {
      ...agent,
      // Just ensure PipelineJobQueues exists (plural, not singular)
      PipelineJobQueues: agent.PipelineJobQueues || []
    };
    
    console.log('Processing agent:', {
      id: agent.id,
      name: agent.name,
      hasPings: agent.AgentPassportPing !== null && agent.AgentPassportPing !== undefined,
      lastPingAt: agent.AgentPassportPing?.last_ping_at,
      hasJobs: agent.PipelineJobQueues?.length > 0,
      totalJobs: agent.PipelineJobQueues?.length
    });
    
    // Use the algorithm to determine status, now with correct data structure
    const healthInfo = determineAgentStatus(normalizedAgent);
    console.log('Agent health info result:', {
      id: agent.id,
      name: agent.name,
      status: healthInfo.status,
      pingRatePercent: healthInfo.pingRatePercent,
      jobSuccessRatePercent: healthInfo.jobSuccessRatePercent,
    });
    
    return {
      ...agent,
      status: healthInfo.status,
      pingRatePercent: healthInfo.pingRatePercent,
      jobSuccessRatePercent: healthInfo.jobSuccessRatePercent,
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
