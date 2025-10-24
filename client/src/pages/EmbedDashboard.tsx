import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { executeQuery } from "@/lib/hasura-client";
import { useLocation } from "wouter";
import { filterByRegex } from "@/lib/regex-parser";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  AlertCircle, 
  Activity, 
  Bot, 
  GitBranch, 
  CheckCircle,
  Clock,
  XCircle
} from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";

const PIPELINE_QUERY = `
  query GetPipelines {
    merlin_agent_Pipeline {
      id
      name
      description
      aborted_on_failure
      timeout_minutes
      notify_on_success
      notify_on_failure
      queue_name
      AgentPipeline {
        AgentPassport {
          id
          name
        }
      }
    }
  }
`;

const AGENT_HEALTH_STATUS_QUERY = `
  query GetAgentHealthStatus {
    merlin_agent_AgentPassport {
      id
      name
      is_healthy
      last_ping_at
      PipelineJobQueue_aggregate {
        aggregate {
          count
        }
      }
    }
  }
`;

const PIPELINE_JOBS_QUERY = `
  query GetPipelineJobs {
    merlin_agent_PipelineJobQueue(limit: 20, order_by: {created_at: desc}) {
      id
      pipeline_id
      running
      completed
      aborted
      created_at
      completed_at
      agent_id
      Pipeline {
        name
      }
      AgentPassport {
        name
      }
    }
  }
`;

const ERROR_LOGS_QUERY = `
  query GetRecentErrors {
    merlin_agent_PipelineJobLogV2Body(
      where: {level: {_eq: "ERROR"}}
      limit: 20
      order_by: {created_at: desc}
    ) {
      id
      message
      exception_message
      created_at
      pipeline_job_id
      PipelineJobQueue {
        pipeline_id
        Pipeline {
          name
        }
      }
    }
  }
`;

const ACTIVITY_LOGS_QUERY = `
  query GetRecentLogs {
    merlin_agent_PipelineJobLogV2Body(limit: 20, order_by: {created_at: desc}) {
      id
      message
      level
      created_at
    }
  }
`;

export default function EmbedDashboard() {
  const [location] = useLocation();
  const searchParams = new URLSearchParams(location.split('?')[1]);
  const filterParam = searchParams.get('filter') || '';

  // Fetch data
  const { data: pipelinesData, isLoading: loadingPipelines } = useQuery({
    queryKey: ['/api/embed/pipelines'],
    queryFn: async () => {
      const result = await executeQuery(PIPELINE_QUERY);
      if (result.errors) throw new Error(result.errors[0].message);
      return result.data.merlin_agent_Pipeline;
    },
    refetchInterval: 30000,
  });

  const { data: agentsData, isLoading: loadingAgents } = useQuery({
    queryKey: ['/api/embed/agents'],
    queryFn: async () => {
      const result = await executeQuery(AGENT_HEALTH_STATUS_QUERY);
      if (result.errors) throw new Error(result.errors[0].message);
      return result.data.merlin_agent_AgentPassport;
    },
    refetchInterval: 30000,
  });

  const { data: jobsData, isLoading: loadingJobs } = useQuery({
    queryKey: ['/api/embed/jobs'],
    queryFn: async () => {
      const result = await executeQuery(PIPELINE_JOBS_QUERY);
      if (result.errors) throw new Error(result.errors[0].message);
      return result.data.merlin_agent_PipelineJobQueue;
    },
    refetchInterval: 30000,
  });

  const { data: errorLogsData, isLoading: loadingErrors } = useQuery({
    queryKey: ['/api/embed/errors'],
    queryFn: async () => {
      const result = await executeQuery(ERROR_LOGS_QUERY);
      if (result.errors) throw new Error(result.errors[0].message);
      return result.data.merlin_agent_PipelineJobLogV2Body;
    },
    refetchInterval: 30000,
  });

  const { data: activityData, isLoading: loadingActivity } = useQuery({
    queryKey: ['/api/embed/activity'],
    queryFn: async () => {
      const result = await executeQuery(ACTIVITY_LOGS_QUERY);
      if (result.errors) throw new Error(result.errors[0].message);
      return result.data.merlin_agent_PipelineJobLogV2Body;
    },
    refetchInterval: 30000,
  });

  // Filter data based on regex
  const filteredData = useMemo(() => {
    if (!pipelinesData) {
      return { pipelines: [], agents: [], jobs: [], errors: [], activity: [], agentIds: new Set() };
    }

    const filteredPipelines = filterParam
      ? filterByRegex(pipelinesData, filterParam, ['name', 'description'])
      : pipelinesData;

    const filteredPipelineIds = new Set(filteredPipelines.map((p: any) => p.id));
    
    const agentIds = new Set<string>();
    filteredPipelines.forEach((p: any) => {
      p.AgentPipeline?.forEach((ap: any) => {
        if (ap.AgentPassport?.id) {
          agentIds.add(ap.AgentPassport.id);
        }
      });
    });

    const filteredAgents = agentsData?.filter((agent: any) =>
      agentIds.has(agent.id)
    ) || [];

    const filteredJobs = jobsData?.filter((job: any) =>
      filteredPipelineIds.has(job.pipeline_id)
    ) || [];

    const filteredErrors = errorLogsData?.filter((error: any) =>
      filteredPipelineIds.has(error.PipelineJobQueue?.pipeline_id)
    ) || [];

    const filteredActivity = activityData?.filter((log: any) => {
      const jobQueue = log.PipelineJobQueue;
      if (!jobQueue) return true;
      return filteredPipelineIds.has(jobQueue.pipeline_id);
    }) || [];

    return {
      pipelines: filteredPipelines,
      agents: filteredAgents,
      jobs: filteredJobs,
      errors: filteredErrors,
      activity: filteredActivity,
      agentIds
    };
  }, [pipelinesData, agentsData, jobsData, errorLogsData, activityData, filterParam]);

  // Calculate stats
  const stats = useMemo(() => {
    const { agents, jobs, errors } = filteredData;

    const healthyAgents = agents.filter((a: any) => a.is_healthy).length;
    const totalJobs = jobs.length;
    const completedJobs = jobs.filter((j: any) => j.completed && !j.aborted).length;
    const runningJobs = jobs.filter((j: any) => j.running).length;
    const abortedJobs = jobs.filter((j: any) => j.aborted).length;
    const successRate = totalJobs > 0 ? ((completedJobs / totalJobs) * 100).toFixed(0) : '0';

    return {
      totalAgents: agents.length,
      healthyAgents,
      warningAgents: agents.filter((a: any) => !a.is_healthy && a.last_ping_at).length,
      offlineAgents: agents.filter((a: any) => !a.last_ping_at).length,
      totalJobs,
      runningJobs,
      completedJobs,
      abortedJobs,
      successRate,
      errorCount: errors.length
    };
  }, [filteredData]);

  const isLoading = loadingPipelines || loadingAgents || loadingJobs || loadingErrors || loadingActivity;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-green-500';
      case 'warning': return 'bg-yellow-500';
      case 'error': return 'bg-red-500';
      case 'offline': return 'bg-slate-400';
      default: return 'bg-blue-500';
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'ERROR':
      case 'FATAL':
        return 'bg-red-500';
      case 'WARN':
        return 'bg-amber-500';
      case 'INFO':
        return 'bg-blue-500';
      default:
        return 'bg-green-500';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 p-4">
        <div className="max-w-[1600px] mx-auto space-y-3">
          <Skeleton className="h-8 w-64" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <Skeleton className="h-80" />
            <Skeleton className="h-80" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 p-3 sm:p-4">
      <div className="max-w-[1600px] mx-auto space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary-600 to-blue-600 dark:from-primary-400 dark:to-blue-400 flex items-center gap-2">
              <Activity className="h-5 w-5 sm:h-6 sm:w-6 text-primary-600 dark:text-primary-400" />
              Merlin Control Center
            </h1>
            {filterParam && (
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
                Filtro: <code className="bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded text-xs">{filterParam}</code>
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="hidden sm:inline">En vivo</span>
          </div>
        </div>

        {/* Stats Cards - Compact 4 columns */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
          <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur border-slate-200 dark:border-slate-700 shadow-lg">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Agentes</p>
                  <p className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-1">
                    {stats.healthyAgents}<span className="text-sm text-slate-400">/{stats.totalAgents}</span>
                  </p>
                </div>
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 rounded-full p-2 sm:p-3">
                  <Bot className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur border-slate-200 dark:border-slate-700 shadow-lg">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Trabajos</p>
                  <p className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-1">
                    {stats.runningJobs}<span className="text-sm text-slate-400">/{stats.totalJobs}</span>
                  </p>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/30 rounded-full p-2 sm:p-3">
                  <GitBranch className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur border-slate-200 dark:border-slate-700 shadow-lg">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Éxito</p>
                  <p className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-1">
                    {stats.successRate}%
                  </p>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 rounded-full p-2 sm:p-3">
                  <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur border-slate-200 dark:border-slate-700 shadow-lg">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Errores</p>
                  <p className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-1">
                    {stats.errorCount}
                  </p>
                </div>
                <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/30 dark:to-red-800/30 rounded-full p-2 sm:p-3">
                  <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-red-600 dark:text-red-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Grid - 2 columns */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {/* LEFT COLUMN */}
          <div className="space-y-3">
            {/* 1. Errores Recientes - Primero */}
            <Card className="bg-white/90 dark:bg-slate-800/90 backdrop-blur border-slate-200 dark:border-slate-700 shadow-lg">
              <CardHeader className="pb-2 sm:pb-3">
                <CardTitle className="text-sm sm:text-base font-semibold flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  Errores Recientes
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-2 sm:pb-3">
                <ScrollArea className="h-[240px] sm:h-[280px]">
                  {filteredData.errors.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="rounded-full bg-green-50 dark:bg-green-900/20 p-2 inline-flex mb-2">
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      </div>
                      <p className="text-sm text-slate-500 dark:text-slate-400">¡Sin errores!</p>
                    </div>
                  ) : (
                    <div className="space-y-2 sm:space-y-3 pr-4">
                      {filteredData.errors.slice(0, 8).map((error: any) => (
                        <div key={error.id} className="text-xs border-l-2 border-red-500 pl-3 py-1">
                          <p className="font-medium text-slate-900 dark:text-white line-clamp-2">
                            {error.exception_message || error.message}
                          </p>
                          <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-500 dark:text-slate-400">
                            <span className="flex items-center gap-1">
                              <GitBranch className="h-3 w-3" />
                              {error.PipelineJobQueue?.Pipeline?.name || 'N/A'}
                            </span>
                            <span>•</span>
                            <span>{formatRelativeTime(error.created_at)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>

            {/* 2. Actividad - Segundo */}
            <Card className="bg-white/90 dark:bg-slate-800/90 backdrop-blur border-slate-200 dark:border-slate-700 shadow-lg">
              <CardHeader className="pb-2 sm:pb-3">
                <CardTitle className="text-sm sm:text-base font-semibold flex items-center gap-2">
                  <Activity className="h-4 w-4 text-blue-500" />
                  Actividad Reciente
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-2 sm:pb-3">
                <ScrollArea className="h-[240px] sm:h-[280px]">
                  <div className="space-y-2 pr-4">
                    {filteredData.activity.slice(0, 15).map((log: any) => {
                      const level = log.level || 'INFO';
                      return (
                        <div key={log.id} className="flex items-start gap-2 text-xs">
                          <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${getLevelColor(level)}`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-slate-900 dark:text-white line-clamp-2">{log.message}</p>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                              {formatRelativeTime(log.created_at)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* RIGHT COLUMN */}
          <div className="space-y-3">
            {/* 3. Estado de Agentes - Tercero */}
            <Card className="bg-white/90 dark:bg-slate-800/90 backdrop-blur border-slate-200 dark:border-slate-700 shadow-lg">
              <CardHeader className="pb-2 sm:pb-3">
                <CardTitle className="text-sm sm:text-base font-semibold flex items-center gap-2">
                  <Bot className="h-4 w-4 text-blue-600" />
                  Estado de Agentes
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-2 sm:pb-3">
                <ScrollArea className="h-[240px] sm:h-[280px]">
                  {filteredData.agents.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-sm text-slate-500 dark:text-slate-400">No hay agentes</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pr-4">
                      {filteredData.agents.map((agent: any) => {
                        const status = agent.is_healthy 
                          ? 'healthy' 
                          : agent.last_ping_at 
                          ? 'warning' 
                          : 'offline';
                        
                        return (
                          <div
                            key={agent.id}
                            className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600"
                          >
                            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${getStatusColor(status)}`} />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-medium text-slate-900 dark:text-white truncate">
                                {agent.name}
                              </p>
                              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                                {agent.PipelineJobQueue_aggregate?.aggregate?.count || 0} jobs
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>

            {/* 4. Pipelines & Jobs - Cuarto */}
            <Card className="bg-white/90 dark:bg-slate-800/90 backdrop-blur border-slate-200 dark:border-slate-700 shadow-lg">
              <CardHeader className="pb-2 sm:pb-3">
                <CardTitle className="text-sm sm:text-base font-semibold flex items-center gap-2">
                  <GitBranch className="h-4 w-4 text-purple-600" />
                  Pipelines ({filteredData.pipelines.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-2 sm:pb-3">
                <ScrollArea className="h-[240px] sm:h-[280px]">
                  <div className="space-y-2 pr-4">
                    {filteredData.pipelines.map((pipeline: any) => {
                      const pipelineJobs = filteredData.jobs.filter((j: any) => j.pipeline_id === pipeline.id);
                      const running = pipelineJobs.filter((j: any) => j.running).length;
                      const completed = pipelineJobs.filter((j: any) => j.completed && !j.aborted).length;
                      const aborted = pipelineJobs.filter((j: any) => j.aborted).length;
                      
                      return (
                        <div
                          key={pipeline.id}
                          className="p-2 sm:p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="text-xs sm:text-sm font-medium text-slate-900 dark:text-white truncate">
                                {pipeline.name}
                              </p>
                              {pipeline.description && (
                                <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                                  {pipeline.description}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-3 mt-2 text-[10px]">
                            {running > 0 && (
                              <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                                <Clock className="h-3 w-3" />
                                {running} activos
                              </span>
                            )}
                            {completed > 0 && (
                              <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                                <CheckCircle className="h-3 w-3" />
                                {completed}
                              </span>
                            )}
                            {aborted > 0 && (
                              <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
                                <XCircle className="h-3 w-3" />
                                {aborted}
                              </span>
                            )}
                            {pipelineJobs.length === 0 && (
                              <span className="text-slate-400 dark:text-slate-500">Sin jobs</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
