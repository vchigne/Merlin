import { useEffect } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { executeQuery } from "@/lib/hasura-client";
import { formatRelativeTime, truncateText } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ExternalLink, AlertCircle, ChevronRight, Bot, GitBranch } from "lucide-react";

export default function RecentErrorsPanel() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['/api/logs/recent-errors'],
    queryFn: async () => {
      // Consulta para obtener los últimos errores
      const query = `
        query GetRecentErrors {
          merlin_agent_PipelineJobLogV2Body(
            where: {level: {_eq: "ERROR"}}
            order_by: {created_at: desc}
            limit: 10
          ) {
            id
            pipeline_job_id
            pipeline_unit_id
            level
            message
            created_at
            exception
            exception_message
            PipelineJobQueue {
              id
              pipeline_id
              Pipeline {
                id
                name
              }
              started_by_agent
              AgentPassport {
                id
                name
              }
            }
            PipelineUnit {
              id
              comment
            }
          }
        }
      `;
      
      const result = await executeQuery(query);
      if (result.errors) {
        throw new Error(result.errors[0].message);
      }
      return result.data.merlin_agent_PipelineJobLogV2Body;
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  useEffect(() => {
    // Set up interval for refreshing relative times
    const interval = setInterval(() => {
      if (data) {
        refetch();
      }
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [data, refetch]);

  // Loading skeleton
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="border-b border-slate-200 dark:border-slate-700">
          <div className="flex justify-between items-center">
            <CardTitle>Errores Recientes</CardTitle>
            <Link href="/logs?level=ERROR" className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300">
              Ver todos los errores
            </Link>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="flex flex-col">
                <div className="flex items-start">
                  <Skeleton className="h-5 w-5 rounded-full mr-2" />
                  <div className="flex-1">
                    <Skeleton className="h-5 w-full mb-2" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                </div>
                {index < 4 && <Separator className="my-4" />}
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
          <CardTitle>Errores Recientes</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="text-center text-red-500 py-4">
            Error cargando los errores recientes
          </div>
        </CardContent>
      </Card>
    );
  }

  // Empty state
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader className="border-b border-slate-200 dark:border-slate-700">
          <CardTitle>Errores Recientes</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="text-center text-slate-500 py-8 flex flex-col items-center">
            <div className="rounded-full bg-green-50 dark:bg-green-900/20 p-3 mb-4">
              <CheckCircle className="h-6 w-6 text-green-500 dark:text-green-400" />
            </div>
            <p>No hay errores recientes</p>
            <p className="text-sm text-slate-400 mt-1">¡Todo funciona correctamente!</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="border-b border-slate-200 dark:border-slate-700">
        <div className="flex justify-between items-center">
          <CardTitle>Errores Recientes</CardTitle>
          <Link href="/logs?level=ERROR" className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300">
            Ver todos los errores
          </Link>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="space-y-4">
          {data.slice(0, 5).map((log: any, index: number) => {
            const pipelineId = log.PipelineJobQueue?.pipeline_id;
            const pipelineName = log.PipelineJobQueue?.Pipeline?.name || "Pipeline desconocido";
            const agentId = log.PipelineJobQueue?.started_by_agent;
            const agentName = log.PipelineJobQueue?.AgentPassport?.name || "Agente desconocido";
            
            return (
              <div key={log.id} className="group">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="h-5 w-5 text-red-500 dark:text-red-400 flex-shrink-0 mt-1" />
                  <div className="flex-1 min-w-0">
                    <Link 
                      href={`/logs/${log.id}`} 
                      className="text-slate-800 dark:text-slate-200 font-medium hover:text-primary-600 dark:hover:text-primary-400 inline-flex items-center group"
                    >
                      <span className="truncate">{log.exception_message || log.message || "Error desconocido"}</span>
                      <ChevronRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity ml-1" />
                    </Link>
                    
                    <div className="flex flex-wrap items-center text-xs text-slate-500 dark:text-slate-400 mt-1 space-x-4">
                      <span className="inline-flex items-center">
                        <GitBranch className="h-3.5 w-3.5 mr-1" />
                        <Link href={`/pipelines/${pipelineId}`} className="hover:text-primary-600 dark:hover:text-primary-400">
                          {truncateText(pipelineName, 25)}
                        </Link>
                      </span>
                      
                      <span className="inline-flex items-center">
                        <Bot className="h-3.5 w-3.5 mr-1" />
                        <Link href={`/agents/${agentId}`} className="hover:text-primary-600 dark:hover:text-primary-400">
                          {truncateText(agentName, 20)}
                        </Link>
                      </span>
                      
                      <span>{formatRelativeTime(log.created_at)}</span>
                    </div>
                    
                    {log.exception && (
                      <div className="mt-2 text-sm bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 p-3 rounded-md overflow-x-auto">
                        <pre className="whitespace-pre-wrap break-words font-mono text-xs">
                          {truncateText(log.exception, 300)}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
                {index < data.length - 1 && <Separator className="my-4" />}
              </div>
            );
          })}
        </div>
        
        {data.length > 5 && (
          <div className="mt-4 text-center">
            <Button variant="outline" asChild>
              <Link href="/logs?level=ERROR" className="inline-flex items-center">
                Ver más errores
                <ExternalLink className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Import this component to fix empty state rendering
import { CheckCircle } from "lucide-react";