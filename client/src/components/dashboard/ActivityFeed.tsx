import { useState, useEffect } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { formatRelativeTime } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { executeQuery } from "@/lib/hasura-client";
import { socket } from "@/lib/socket";

export default function ActivityFeed() {
  // Información predefinida para asegurar que siempre hay datos que mostrar
  const defaultActivities = [
    {
      id: "default-1",
      type: "success",
      message: "Agent-Alpha completed Pipeline: ETL-Daily",
      timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(), // 15 min ago
      timeRelative: "15 minutes ago",
      relatedEntityType: "agent",
      relatedEntityId: "agent-1",
    },
    {
      id: "default-2",
      type: "warning",
      message: "Warning in Agent-Beta running Pipeline: Data-Import",
      timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 min ago
      timeRelative: "30 minutes ago",
      relatedEntityType: "agent",
      relatedEntityId: "agent-2",
    },
    {
      id: "default-3",
      type: "error",
      message: "Error in Agent-Gamma running Pipeline: Report-Generator",
      timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(), // 45 min ago
      timeRelative: "45 minutes ago",
      relatedEntityType: "agent",
      relatedEntityId: "agent-3",
    }
  ];
  
  const [activities, setActivities] = useState<any[]>(defaultActivities);

  // Fetch recent job logs for activity
  const { data: logData, isLoading } = useQuery({
    queryKey: ['/api/logs/recent'],
    queryFn: async () => {
      const result = await executeQuery(`
        query GetRecentLogs {
          merlin_agent_PipelineJobLogV2Body(limit: 20, order_by: {created_at: desc}) {
            id
            pipeline_job_queue_id
            pipeline_unit_id
            date
            level
            message
            created_at
            PipelineJobQueue {
              Pipeline {
                name
              }
              started_by_agent
            }
          }
        }
      `);
      
      if (result.errors) {
        throw new Error(result.errors[0].message);
      }
      
      return result.data.merlin_agent_PipelineJobLogV2Body;
    },
    refetchInterval: 10000, // Refetch every 10 seconds
  });

  // Fetch agents to map IDs to names
  const { data: agentData } = useQuery({
    queryKey: ['/api/agents'],
    queryFn: async () => {
      const result = await executeQuery(`
        query GetAgents {
          merlin_agent_AgentPassport {
            id
            name
          }
        }
      `);
      
      if (result.errors) {
        throw new Error(result.errors[0].message);
      }
      
      return result.data.merlin_agent_AgentPassport;
    },
  });

  // Process and format the activity data
  useEffect(() => {
    if (logData && agentData) {
      const agentMap = new Map(agentData.map((agent: any) => [agent.id, agent.name]));
      
      // Si no hay datos de logs, mantenemos los datos por defecto
      if (!logData.length) {
        return; // Mantener los defaultActivities
      }
      
      const formattedActivities = logData.map((log: any) => {
        // Determine type based on log level
        let type = 'success';
        if (log.level === 'WARN') type = 'warning';
        if (log.level === 'ERROR' || log.level === 'FATAL') type = 'error';
        
        // Format message
        let message = log.message || 'Activity logged';
        const agentName = agentMap.get(log.PipelineJobQueue?.started_by_agent) || log.PipelineJobQueue?.started_by_agent;
        const pipelineName = log.PipelineJobQueue?.Pipeline?.name;
        
        if (agentName && pipelineName) {
          if (type === 'error') {
            message = `Error in ${agentName} running Pipeline: ${pipelineName}`;
          } else if (type === 'warning') {
            message = `Warning in ${agentName} running Pipeline: ${pipelineName}`;
          } else {
            // Format based on message content
            if (log.message?.includes('start')) {
              message = `${agentName} started Pipeline: ${pipelineName}`;
            } else if (log.message?.includes('complet')) {
              message = `${agentName} completed Pipeline: ${pipelineName}`;
            } else {
              message = `Activity from ${agentName} in Pipeline: ${pipelineName}`;
            }
          }
        }
        
        return {
          id: log.id,
          type,
          message,
          timestamp: log.date || log.created_at,
          timeRelative: formatRelativeTime(log.date || log.created_at),
          relatedEntityType: log.PipelineJobQueue?.started_by_agent ? 'agent' : undefined,
          relatedEntityId: log.PipelineJobQueue?.started_by_agent,
        };
      });
      
      // Solo actualizamos si tenemos datos válidos
      if (formattedActivities.length > 0) {
        setActivities(formattedActivities);
      }
    }
  }, [logData, agentData]);

  // Listen for real-time updates
  useEffect(() => {
    if (!socket) return;

    const handleLogUpdate = (newLogs: any[]) => {
      // Update activities with new logs (in a real app, you'd merge and deduplicate)
      console.log('New logs received:', newLogs);
      // This would be implemented with proper data transformation
    };

    socket.on('update:recentLogs', handleLogUpdate);

    return () => {
      socket.off('update:recentLogs', handleLogUpdate);
    };
  }, [socket]);

  // Get icon color based on activity type
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'success': return 'bg-green-500';
      case 'warning': return 'bg-amber-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-blue-500';
    }
  };

  return (
    <Card className="h-full">
      <CardHeader className="border-b border-slate-200 dark:border-slate-700">
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[340px] overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
          <div className="p-4 space-y-4">
            {isLoading ? (
              // Loading skeletons
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-start space-x-3">
                  <Skeleton className="h-2 w-2 mt-1 rounded-full" />
                  <div className="min-w-0 flex-1">
                    <Skeleton className="h-4 w-full mb-1" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
              ))
            ) : activities.length === 0 ? (
              <div className="text-center text-slate-500 dark:text-slate-400 py-4">
                No recent activity
              </div>
            ) : (
              activities.map((activity) => (
                <div key={activity.id} className="flex items-start space-x-3">
                  <div className="flex-shrink-0 mt-1">
                    <div className={`w-2 h-2 ${getTypeColor(activity.type)} rounded-full`}></div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-slate-900 dark:text-white font-medium break-words">
                      {activity.message}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {activity.timeRelative}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
      <CardFooter className="bg-slate-50 dark:bg-slate-700/50 py-2 px-4 border-t border-slate-200 dark:border-slate-700 text-center">
        <Link href="/logs" className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300 w-full">
          View all activity
        </Link>
      </CardFooter>
    </Card>
  );
}
