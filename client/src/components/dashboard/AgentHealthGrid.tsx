import { useEffect } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { executeQuery } from "@/lib/hasura-client";
import { AGENT_HEALTH_STATUS_QUERY } from "@shared/queries";
import { formatRelativeTime, determineAgentStatus } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function AgentHealthGrid() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['/api/agents/health'],
    queryFn: async () => {
      const result = await executeQuery(AGENT_HEALTH_STATUS_QUERY);
      if (result.errors) {
        throw new Error(result.errors[0].message);
      }
      return result.data.merlin_agent_AgentPassport;
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  useEffect(() => {
    // Set up interval for refreshing relative times
    const interval = setInterval(() => {
      if (data) {
        // Forcing a re-render to update relative times
        refetch();
      }
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [data, refetch]);

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-500';
      case 'warning':
        return 'bg-amber-500';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-slate-400';
    }
  };

  // Loading skeleton
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="border-b border-slate-200 dark:border-slate-700">
          <div className="flex justify-between items-center">
            <CardTitle>Agent Health Status</CardTitle>
            <Link href="/agents">
              <a className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300">
                View all agents
              </a>
            </Link>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4">
                <div className="flex flex-col items-center space-y-2">
                  <Skeleton className="h-3 w-3 rounded-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card>
        <CardHeader className="border-b border-slate-200 dark:border-slate-700">
          <CardTitle>Agent Health Status</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="text-center text-red-500 py-4">
            Error loading agent health data
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="border-b border-slate-200 dark:border-slate-700">
        <div className="flex justify-between items-center">
          <CardTitle>Agent Health Status</CardTitle>
          <Link href="/agents">
            <a className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300">
              View all agents
            </a>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {data?.slice(0, 18).map((agent: any) => {
            const lastPing = agent.AgentPassportPing?.[0]?.last_ping_at;
            const status = determineAgentStatus(agent.is_healthy, lastPing);
            
            return (
              <Link key={agent.id} href={`/agents/${agent.id}`}>
                <a className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4 flex flex-col items-center hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors duration-200">
                  <div className={`w-3 h-3 rounded-full ${getStatusClass(status)} mb-2`}></div>
                  <div className="text-sm font-medium text-slate-700 dark:text-slate-300 text-center truncate w-full">
                    {agent.name || `Agent-${agent.id.substring(0, 8)}`}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {lastPing ? formatRelativeTime(lastPing) : 'Never'}
                  </div>
                </a>
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
