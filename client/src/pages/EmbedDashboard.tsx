import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { executeQuery } from "@/lib/hasura-client";
import { 
  PIPELINE_QUERY, 
  AGENT_HEALTH_STATUS_QUERY,
  PIPELINE_JOBS_QUERY
} from "@shared/queries";
import { filterByRegex } from "@/lib/regex-parser";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { determineAgentStatus } from "@/lib/utils";
import { 
  Bot, 
  GitBranch, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Activity
} from "lucide-react";

export default function EmbedDashboard() {
  // Obtener el parámetro filter de la URL
  const urlParams = new URLSearchParams(window.location.search);
  const filterRegex = urlParams.get('filter') || '';

  // Fetch pipelines
  const { data: pipelinesData, isLoading: pipelinesLoading } = useQuery({
    queryKey: ['/api/pipelines'],
    queryFn: async () => {
      const result = await executeQuery(PIPELINE_QUERY);
      if (result.errors) throw new Error(result.errors[0].message);
      return result.data.merlin_agent_Pipeline;
    },
    refetchInterval: 30000,
  });

  // Fetch agents
  const { data: agentsData, isLoading: agentsLoading } = useQuery({
    queryKey: ['/api/agents/status'],
    queryFn: async () => {
      const result = await executeQuery(AGENT_HEALTH_STATUS_QUERY);
      if (result.errors) throw new Error(result.errors[0].message);
      return result.data.merlin_agent_AgentPassport;
    },
    refetchInterval: 30000,
  });

  // Fetch recent jobs
  const { data: jobsData, isLoading: jobsLoading } = useQuery({
    queryKey: ['/api/jobs/recent'],
    queryFn: async () => {
      const result = await executeQuery(PIPELINE_JOBS_QUERY, { limit: 50, offset: 0 });
      if (result.errors) throw new Error(result.errors[0].message);
      return result.data.merlin_agent_PipelineJobQueue;
    },
    refetchInterval: 30000,
  });

  // Filtrar datos basándose en el regex
  const filteredData = useMemo(() => {
    if (!pipelinesData) {
      return { pipelines: [], agents: [], jobs: [], agentIds: new Set() };
    }

    // 1. Filtrar pipelines por nombre usando el regex
    const filteredPipelines = filterByRegex(
      pipelinesData,
      filterRegex,
      (pipeline: any) => pipeline.name || ''
    );

    // 2. Obtener IDs de pipelines filtrados
    const filteredPipelineIds = new Set(filteredPipelines.map((p: any) => p.id));

    // 3. Obtener IDs de agentes únicos de los pipelines filtrados
    const agentIds = new Set(
      filteredPipelines
        .map((p: any) => p.agent_passport_id)
        .filter(Boolean)
    );

    // 4. Filtrar agentes que están asociados a los pipelines filtrados
    const filteredAgents = agentsData?.filter((agent: any) => 
      agentIds.has(agent.id)
    ) || [];

    // 5. Filtrar jobs que pertenecen a los pipelines filtrados
    const filteredJobs = jobsData?.filter((job: any) =>
      filteredPipelineIds.has(job.pipeline_id)
    ) || [];

    return {
      pipelines: filteredPipelines,
      agents: filteredAgents,
      jobs: filteredJobs,
      agentIds
    };
  }, [pipelinesData, agentsData, jobsData, filterRegex]);

  // Calcular estadísticas
  const stats = useMemo(() => {
    const { agents, jobs } = filteredData;

    // Contar agentes por estado
    let healthyAgents = 0;
    let totalAgents = agents.length;

    agents.forEach((agent: any) => {
      const healthInfo = determineAgentStatus(agent);
      if (healthInfo.status === 'healthy') {
        healthyAgents++;
      }
    });

    // Contar jobs por estado
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
      successRate
    };
  }, [filteredData]);

  const isLoading = pipelinesLoading || agentsLoading || jobsLoading;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header con filtro aplicado */}
        <div className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              Merlin Dashboard
            </h1>
            {filterRegex && (
              <div className="text-sm text-slate-600 dark:text-slate-400 font-mono bg-slate-100 dark:bg-slate-700 px-3 py-1 rounded">
                Filter: {filterRegex}
              </div>
            )}
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {filteredData.pipelines.length} pipeline(s) matched
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card data-testid="card-agents">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                Agentes Activos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  {isLoading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    <>
                      <div className="text-2xl font-bold text-slate-900 dark:text-white" data-testid="text-healthy-agents">
                        {stats.healthyAgents}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        de {stats.totalAgents} total
                      </p>
                    </>
                  )}
                </div>
                <Bot className="h-8 w-8 text-primary-500" />
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-pipelines">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                Pipelines
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  {isLoading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    <div className="text-2xl font-bold text-slate-900 dark:text-white" data-testid="text-pipelines">
                      {filteredData.pipelines.length}
                    </div>
                  )}
                </div>
                <GitBranch className="h-8 w-8 text-primary-500" />
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-jobs">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                Trabajos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  {isLoading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    <>
                      <div className="text-2xl font-bold text-slate-900 dark:text-white" data-testid="text-jobs">
                        {stats.totalJobs}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {stats.runningJobs} en ejecución
                      </p>
                    </>
                  )}
                </div>
                <Activity className="h-8 w-8 text-primary-500" />
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-success-rate">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                Tasa de Éxito
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  {isLoading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    <>
                      <div className="text-2xl font-bold text-slate-900 dark:text-white" data-testid="text-success-rate">
                        {stats.successRate}%
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {stats.abortedJobs} abortados
                      </p>
                    </>
                  )}
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Agents Status */}
        <Card data-testid="card-agents-status">
          <CardHeader>
            <CardTitle>Estado de Agentes</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
              </div>
            ) : filteredData.agents.length === 0 ? (
              <p className="text-center text-slate-500 dark:text-slate-400 py-8">
                No hay agentes asociados a los pipelines filtrados
              </p>
            ) : (
              <div className="space-y-3">
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
                      className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg"
                      data-testid={`agent-${agent.id}`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${statusColors[healthInfo.status] || 'bg-slate-400'}`} />
                        <div>
                          <p className="font-medium text-slate-900 dark:text-white">
                            {agent.name}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {agent.AgentPassportPing?.hostname || 'Sin ping'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-300 capitalize">
                          {healthInfo.status}
                        </p>
                        {agent.AgentPassportPing?.last_ping_at && (
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            Último ping: {new Date(agent.AgentPassportPing.last_ping_at).toLocaleTimeString()}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Jobs */}
        <Card data-testid="card-recent-jobs">
          <CardHeader>
            <CardTitle>Trabajos Recientes</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : filteredData.jobs.length === 0 ? (
              <p className="text-center text-slate-500 dark:text-slate-400 py-8">
                No hay trabajos recientes para los pipelines filtrados
              </p>
            ) : (
              <div className="space-y-2">
                {filteredData.jobs.slice(0, 10).map((job: any) => {
                  const pipeline: any = filteredData.pipelines.find((p: any) => p.id === job.pipeline_id);
                  
                  return (
                    <div
                      key={job.id}
                      className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg"
                      data-testid={`job-${job.id}`}
                    >
                      <div className="flex items-center space-x-3">
                        {job.running && <Clock className="h-4 w-4 text-blue-500 animate-spin" />}
                        {job.completed && !job.aborted && <CheckCircle className="h-4 w-4 text-green-500" />}
                        {job.aborted && <XCircle className="h-4 w-4 text-red-500" />}
                        {!job.running && !job.completed && !job.aborted && <Clock className="h-4 w-4 text-slate-400" />}
                        
                        <div>
                          <p className="font-medium text-slate-900 dark:text-white text-sm">
                            {pipeline?.name || 'Pipeline desconocido'}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {new Date(job.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div>
                        {job.running && (
                          <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-1 rounded">
                            En ejecución
                          </span>
                        )}
                        {job.completed && !job.aborted && (
                          <span className="text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-2 py-1 rounded">
                            Completado
                          </span>
                        )}
                        {job.aborted && (
                          <span className="text-xs bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 px-2 py-1 rounded">
                            Abortado
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
