import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { executeQuery } from "@/lib/hasura-client";
import { 
  PIPELINE_QUERY, 
  AGENT_HEALTH_STATUS_QUERY,
  PIPELINE_JOBS_QUERY,
  STATS_OVERVIEW_QUERY
} from "@shared/queries";
import { filterByRegex, parseRegexWithFlags } from "@/lib/regex-parser";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { determineAgentStatus, formatRelativeTime, getStatusStyle, truncateText } from "@/lib/utils";
import { 
  GitBranch, 
  Bot, 
  CheckCircle, 
  AlertTriangle,
  Clock,
  XCircle,
  Laptop,
  Check,
  AlertCircle,
  Wifi,
  ArrowUp,
  ArrowDown,
  Activity,
  ChevronRight
} from "lucide-react";

export default function EmbedDashboard() {
  // Get regex filter from URL params
  const params = new URLSearchParams(window.location.search);
  const filterParam = params.get('filter') || '';
  
  // Parse regex with flags
  const filterRegex = parseRegexWithFlags(filterParam);

  // Fetch all data
  const { data: pipelinesData, isLoading: loadingPipelines } = useQuery({
    queryKey: ['/api/pipelines'],
    queryFn: async () => {
      const result = await executeQuery(PIPELINE_QUERY);
      if (result.errors) throw new Error(result.errors[0].message);
      return result.data.merlin_agent_Pipeline;
    },
    refetchInterval: 30000,
  });

  const { data: agentsData, isLoading: loadingAgents } = useQuery({
    queryKey: ['/api/agents/health'],
    queryFn: async () => {
      const result = await executeQuery(AGENT_HEALTH_STATUS_QUERY);
      if (result.errors) throw new Error(result.errors[0].message);
      return result.data.merlin_agent_AgentPassport;
    },
    refetchInterval: 30000,
  });

  const { data: jobsData, isLoading: loadingJobs } = useQuery({
    queryKey: ['/api/jobs'],
    queryFn: async () => {
      const result = await executeQuery(PIPELINE_JOBS_QUERY);
      if (result.errors) throw new Error(result.errors[0].message);
      return result.data.merlin_agent_PipelineJobQueue;
    },
    refetchInterval: 30000,
  });

  // Fetch error logs
  const { data: errorLogsData, isLoading: loadingErrors } = useQuery({
    queryKey: ['/api/logs/errors'],
    queryFn: async () => {
      const query = `
        query GetRecentErrors {
          merlin_agent_PipelineJobLogV2Body(
            where: {level: {_eq: "ERROR"}}
            order_by: {created_at: desc}
            limit: 10
          ) {
            id
            pipeline_job_id
            level
            message
            created_at
            exception_message
            PipelineJobQueue {
              pipeline_id
              Pipeline {
                name
              }
              AgentPassport {
                name
              }
            }
          }
        }
      `;
      const result = await executeQuery(query);
      if (result.errors) throw new Error(result.errors[0].message);
      return result.data.merlin_agent_PipelineJobLogV2Body;
    },
    refetchInterval: 30000,
  });

  // Fetch activity logs
  const { data: activityData, isLoading: loadingActivity } = useQuery({
    queryKey: ['/api/logs/activity'],
    queryFn: async () => {
      const query = `
        query GetRecentLogs {
          merlin_agent_PipelineJobLogV2Body(limit: 20, order_by: {created_at: desc}) {
            id
            level
            message
            created_at
          }
        }
      `;
      const result = await executeQuery(query);
      if (result.errors) throw new Error(result.errors[0].message);
      return result.data.merlin_agent_PipelineJobLogV2Body;
    },
    refetchInterval: 10000,
  });

  // Filter data based on regex
  const filteredData = useMemo(() => {
    if (!pipelinesData) {
      return { pipelines: [], agents: [], jobs: [], errors: [], agentIds: new Set() };
    }

    // 1. Filter pipelines by name using regex
    const filteredPipelines = filterByRegex(
      pipelinesData,
      filterParam,
      (pipeline: any) => pipeline.name || ''
    );

    // 2. Get filtered pipeline IDs
    const filteredPipelineIds = new Set(filteredPipelines.map((p: any) => p.id));

    // 3. Get unique agent IDs from filtered pipelines
    const agentIds = new Set(
      filteredPipelines
        .map((p: any) => p.agent_passport_id)
        .filter(Boolean)
    );

    // 4. Filter agents associated with filtered pipelines
    const filteredAgents = agentsData?.filter((agent: any) => 
      agentIds.has(agent.id)
    ) || [];

    // 5. Filter jobs belonging to filtered pipelines
    const filteredJobs = jobsData?.filter((job: any) =>
      filteredPipelineIds.has(job.pipeline_id)
    ) || [];

    // 6. Filter errors belonging to filtered pipelines
    const filteredErrors = errorLogsData?.filter((error: any) =>
      filteredPipelineIds.has(error.PipelineJobQueue?.pipeline_id)
    ) || [];

    return {
      pipelines: filteredPipelines,
      agents: filteredAgents,
      jobs: filteredJobs,
      errors: filteredErrors,
      agentIds
    };
  }, [pipelinesData, agentsData, jobsData, errorLogsData, filterParam]);

  // Calculate stats from filtered data
  const stats = useMemo(() => {
    const { agents, jobs, errors } = filteredData;

    // Count agents by status
    let healthyAgents = 0;
    let totalAgents = agents.length;

    agents.forEach((agent: any) => {
      const healthInfo = determineAgentStatus(agent);
      if (healthInfo.status === 'healthy') {
        healthyAgents++;
      }
    });

    // Count jobs by status
    const totalJobs = jobs.length;
    const completedJobs = jobs.filter((j: any) => j.completed).length;
    const runningJobs = jobs.filter((j: any) => j.running).length;
    const abortedJobs = jobs.filter((j: any) => j.aborted).length;

    const successRate = totalJobs > 0
      ? ((completedJobs / totalJobs) * 100).toFixed(1)
      : '0';

    return {
      totalAgents,
      healthyAgents,
      totalJobs,
      completedJobs,
      runningJobs,
      abortedJobs,
      successRate,
      errorCount: errors.length
    };
  }, [filteredData]);

  const isLoading = loadingPipelines || loadingAgents || loadingJobs || loadingErrors;

  // Activity formatting
  const activities = useMemo(() => {
    if (!activityData) return [];
    
    return activityData.slice(0, 15).map((log: any) => {
      let type = 'success';
      if (log.level === 'WARN') type = 'warning';
      if (log.level === 'ERROR' || log.level === 'FATAL') type = 'error';
      
      return {
        id: log.id,
        type,
        message: log.message || 'Activity logged',
        timeRelative: formatRelativeTime(log.created_at),
      };
    });
  }, [activityData]);

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'success': return 'bg-green-500';
      case 'warning': return 'bg-amber-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-blue-500';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4">
        <div className="space-y-4">
          <Skeleton className="h-8 w-64" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4">
      <div className="max-w-[1600px] mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Activity className="h-6 w-6 text-primary-600" />
              Merlin Control Center
            </h1>
            {filterParam && (
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Filtrando: <code className="bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded">{filterParam}</code>
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            Actualizando en tiempo real
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Active Agents */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Agentes Activos</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                    {stats.healthyAgents}/{stats.totalAgents}
                  </p>
                </div>
                <div className="bg-primary-50 dark:bg-primary-900/30 rounded-full p-3">
                  <Bot className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pipeline Executions */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Ejecuciones</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{stats.totalJobs}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{stats.runningJobs} en curso</p>
                </div>
                <div className="bg-primary-50 dark:bg-primary-900/30 rounded-full p-3">
                  <GitBranch className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Success Rate */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Tasa de Éxito</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{stats.successRate}%</p>
                  <p className="text-xs text-green-600 dark:text-green-400 mt-0.5">{stats.completedJobs} completados</p>
                </div>
                <div className="bg-green-50 dark:bg-green-900/30 rounded-full p-3">
                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Errors */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Errores</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{stats.errorCount}</p>
                  <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">{stats.abortedJobs} abortados</p>
                </div>
                <div className="bg-red-50 dark:bg-red-900/30 rounded-full p-3">
                  <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left Column: Agents + Errors */}
          <div className="space-y-4">
            {/* Agent Status - Compact */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Laptop className="h-4 w-4" />
                  Estado de Agentes
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-3">
                {filteredData.agents.length === 0 ? (
                  <p className="text-center text-slate-500 dark:text-slate-400 text-sm py-4">
                    No hay agentes asociados
                  </p>
                ) : (
                  <div className="space-y-2">
                    {filteredData.agents.map((agent: any) => {
                      const healthInfo = determineAgentStatus(agent);
                      const statusColors: Record<string, string> = {
                        healthy: 'bg-green-500',
                        warning: 'bg-yellow-500',
                        error: 'bg-red-500',
                        offline: 'bg-slate-400'
                      };

                      return (
                        <div
                          key={agent.id}
                          className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-800 rounded text-xs"
                          data-testid={`agent-${agent.id}`}
                        >
                          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${statusColors[healthInfo.status] || 'bg-slate-400'}`} />
                          <span className="font-medium text-slate-900 dark:text-white truncate flex-1">
                            {agent.name}
                          </span>
                          <span className="text-slate-500 dark:text-slate-400 text-[10px]">
                            {healthInfo.pingRatePercent}%
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Errors - Compact */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  Errores Recientes
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-3">
                <ScrollArea className="h-[300px]">
                  {filteredData.errors.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="rounded-full bg-green-50 dark:bg-green-900/20 p-2 inline-flex mb-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      </div>
                      <p className="text-xs text-slate-500">¡Sin errores!</p>
                    </div>
                  ) : (
                    <div className="space-y-3 pr-4">
                      {filteredData.errors.slice(0, 10).map((error: any) => (
                        <div key={error.id} className="text-xs">
                          <p className="font-medium text-slate-900 dark:text-white line-clamp-2">
                            {error.exception_message || error.message}
                          </p>
                          <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-500">
                            <span className="flex items-center gap-1">
                              <GitBranch className="h-3 w-3" />
                              {truncateText(error.PipelineJobQueue?.Pipeline?.name || 'N/A', 15)}
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
          </div>

          {/* Middle Column: Jobs Table */}
          <div className="lg:col-span-2 space-y-4">
            {/* Recent Jobs */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Trabajos Recientes</CardTitle>
              </CardHeader>
              <CardContent className="pb-3">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Pipeline</TableHead>
                        <TableHead className="text-xs">Estado</TableHead>
                        <TableHead className="text-xs">Creado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredData.jobs.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center text-slate-500 text-xs py-8">
                            No hay trabajos recientes
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredData.jobs.slice(0, 10).map((job: any) => {
                          const pipeline: any = filteredData.pipelines.find((p: any) => p.id === job.pipeline_id);
                          let status = 'Pending';
                          if (job.aborted) status = 'Error';
                          else if (job.completed) status = 'Completed';
                          else if (job.running) status = 'Running';
                          
                          const statusStyle = getStatusStyle(status);

                          return (
                            <TableRow key={job.id} data-testid={`job-${job.id}`}>
                              <TableCell className="text-xs font-medium">
                                {truncateText(pipeline?.name || 'Unknown', 30)}
                              </TableCell>
                              <TableCell>
                                <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${statusStyle.badgeClass}`}>
                                  {statusStyle.label}
                                </span>
                              </TableCell>
                              <TableCell className="text-xs text-slate-500">
                                {formatRelativeTime(job.created_at)}
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Activity Feed */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Actividad en Tiempo Real
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-3">
                <ScrollArea className="h-[240px]">
                  <div className="space-y-2 pr-4">
                    {loadingActivity ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <Skeleton className="h-2 w-2 mt-1 rounded-full flex-shrink-0" />
                          <div className="flex-1">
                            <Skeleton className="h-3 w-full mb-1" />
                            <Skeleton className="h-2 w-16" />
                          </div>
                        </div>
                      ))
                    ) : activities.length === 0 ? (
                      <div className="text-center text-slate-500 text-xs py-4">
                        No hay actividad reciente
                      </div>
                    ) : (
                      activities.map((activity: any) => (
                        <div key={activity.id} className="flex items-start gap-2">
                          <div className="flex-shrink-0 mt-1">
                            <div className={`w-2 h-2 ${getTypeColor(activity.type)} rounded-full`}></div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-slate-900 dark:text-white font-medium line-clamp-2">
                              {activity.message}
                            </p>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                              {activity.timeRelative}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
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
