import { useMemo, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { executeQuery } from "@/lib/hasura-client";
import { filterByRegex } from "@/lib/regex-parser";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { 
  AlertCircle, 
  Activity, 
  Bot, 
  GitBranch, 
  CheckCircle,
  Clock,
  XCircle,
  WifiOff,
  Wifi,
  AlertTriangle,
  Play
} from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";
import { 
  PIPELINE_QUERY,
  AGENT_HEALTH_STATUS_QUERY
} from "@shared/queries";
import { useExecutePipeline } from "@/hooks/use-execute-pipeline";
import { useNotifications } from "@/context/NotificationContext";

// Calcular fecha de hace 7 días
const getSevenDaysAgo = () => {
  const date = new Date();
  date.setDate(date.getDate() - 7);
  return date.toISOString();
};

// Calcular fecha de hace 30 días
const getThirtyDaysAgo = () => {
  const date = new Date();
  date.setDate(date.getDate() - 30);
  return date.toISOString();
};

const ERROR_LOGS_QUERY = `
  query GetRecentErrors($sevenDaysAgo: timestamptz!, $pipelineIds: [uuid!]!) {
    merlin_agent_PipelineJobLogV2Body(
      where: {
        level: {_eq: "ERROR"}
        created_at: {_gte: $sevenDaysAgo}
        PipelineJobQueue: {
          pipeline_id: {_in: $pipelineIds}
        }
      }
      order_by: {created_at: desc}
    ) {
      id
      message
      exception_message
      created_at
      pipeline_job_id
      PipelineJobQueue {
        id
        pipeline_id
        started_by_agent
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

const ACTIVITY_LOGS_QUERY = `
  query GetRecentLogs($sevenDaysAgo: timestamptz!, $pipelineIds: [uuid!]!) {
    merlin_agent_PipelineJobLogV2Body(
      where: {
        created_at: {_gte: $sevenDaysAgo}
        PipelineJobQueue: {
          pipeline_id: {_in: $pipelineIds}
        }
      }
      order_by: {created_at: desc}
    ) {
      id
      message
      level
      created_at
      pipeline_job_id
      PipelineJobQueue {
        id
        pipeline_id
        started_by_agent
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

const JOBS_LAST_MONTH_QUERY = `
  query GetJobsLastMonth($thirtyDaysAgo: timestamptz!, $pipelineIds: [uuid!]!) {
    merlin_agent_PipelineJobQueue(
      where: {
        created_at: {_gte: $thirtyDaysAgo}
        pipeline_id: {_in: $pipelineIds}
      }
      order_by: {created_at: desc}
    ) {
      id
      pipeline_id
      completed
      created_at
      updated_at
      running
      aborted
      started_by_agent
    }
  }
`;

export default function EmbedDashboard() {
  // Get filter from URL query string
  const [filterParam, setFilterParam] = useState('');
  const { executePipeline, isExecuting } = useExecutePipeline();
  const { addNotification } = useNotifications();
  
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    setFilterParam(searchParams.get('filter') || '');
  }, []);

  // 1. Primero cargar pipelines
  const { data: pipelinesData, isLoading: loadingPipelines } = useQuery({
    queryKey: ['/api/embed/pipelines'],
    queryFn: async () => {
      const result = await executeQuery(PIPELINE_QUERY);
      if (result.errors) throw new Error(result.errors[0].message);
      return result.data.merlin_agent_Pipeline;
    },
    refetchInterval: 30000,
  });

  // 2. Filtrar pipelines y obtener IDs + palabras clave
  const { filteredPipelineIds, pipelineKeywords } = useMemo(() => {
    if (!pipelinesData) return { filteredPipelineIds: [], pipelineKeywords: [] };
    
    const filtered = filterParam
      ? filterByRegex(pipelinesData, filterParam, (p: any) => `${p.name} ${p.description || ''}`)
      : pipelinesData;
    
    // Extraer palabras clave de los nombres de pipelines filtrados
    const keywords = new Set<string>();
    const stopWords = ['de', 'el', 'la', 'los', 'las', 'pipeline', 'para', 'con', 'en', 'y', 'o', 'a'];
    
    filtered.forEach((pipeline: any) => {
      const name = pipeline.name || '';
      
      // 1. Extraer texto entre corchetes [ALICORP], [DIJISA], etc.
      const bracketMatches = name.match(/\[([^\]]+)\]/g);
      if (bracketMatches) {
        bracketMatches.forEach((match: string) => {
          const content = match.replace(/[\[\]]/g, '');
          // Separar por guiones y espacios
          content.split(/[-\s]+/).forEach((word: string) => {
            const cleaned = word.trim().toUpperCase();
            if (cleaned.length > 2 && !stopWords.includes(cleaned.toLowerCase())) {
              keywords.add(cleaned);
            }
          });
        });
      }
      
      // 2. Extraer palabras significativas del nombre completo
      const words = name.split(/[\s\-_]+/);
      words.forEach((word: string) => {
        const cleaned = word.replace(/[\[\]]/g, '').trim().toUpperCase();
        if (cleaned.length > 2 && !stopWords.includes(cleaned.toLowerCase())) {
          keywords.add(cleaned);
        }
      });
    });
    
    const result = {
      filteredPipelineIds: filtered.map((p: any) => p.id),
      pipelineKeywords: Array.from(keywords)
    };
    
    return result;
  }, [pipelinesData, filterParam]);

  // 3. Cargar jobs, errores y actividad solo de los pipelines filtrados
  const { data: jobsData, isLoading: loadingJobs } = useQuery({
    queryKey: ['/api/embed/jobs', filteredPipelineIds],
    queryFn: async () => {
      if (filteredPipelineIds.length === 0) return [];
      const result = await executeQuery(JOBS_LAST_MONTH_QUERY, { 
        thirtyDaysAgo: getThirtyDaysAgo(),
        pipelineIds: filteredPipelineIds
      });
      if (result.errors) throw new Error(result.errors[0].message);
      return result.data.merlin_agent_PipelineJobQueue;
    },
    enabled: filteredPipelineIds.length > 0,
    refetchInterval: 30000,
  });

  const { data: errorLogsData, isLoading: loadingErrors } = useQuery({
    queryKey: ['/api/embed/errors', filteredPipelineIds],
    queryFn: async () => {
      if (filteredPipelineIds.length === 0) return [];
      const result = await executeQuery(ERROR_LOGS_QUERY, { 
        sevenDaysAgo: getSevenDaysAgo(),
        pipelineIds: filteredPipelineIds
      });
      if (result.errors) throw new Error(result.errors[0].message);
      return result.data.merlin_agent_PipelineJobLogV2Body;
    },
    enabled: filteredPipelineIds.length > 0,
    refetchInterval: 30000,
  });

  const { data: activityData, isLoading: loadingActivity } = useQuery({
    queryKey: ['/api/embed/activity', filteredPipelineIds],
    queryFn: async () => {
      if (filteredPipelineIds.length === 0) return [];
      const result = await executeQuery(ACTIVITY_LOGS_QUERY, { 
        sevenDaysAgo: getSevenDaysAgo(),
        pipelineIds: filteredPipelineIds
      });
      if (result.errors) throw new Error(result.errors[0].message);
      return result.data.merlin_agent_PipelineJobLogV2Body;
    },
    enabled: filteredPipelineIds.length > 0,
    refetchInterval: 30000,
  });

  // 4. Cargar agentes filtrados por palabras clave de pipelines
  const { data: agentsData, isLoading: loadingAgents } = useQuery({
    queryKey: ['/api/embed/agents', filteredPipelineIds, pipelineKeywords],
    queryFn: async () => {
      if (filteredPipelineIds.length === 0) return [];
      const result = await executeQuery(AGENT_HEALTH_STATUS_QUERY);
      if (result.errors) throw new Error(result.errors[0].message);
      
      const allAgents = result.data.merlin_agent_AgentPassport;
      
      // Filtrar agentes que coincidan con palabras clave de pipelines o filtro regex
      const filtered = allAgents.filter((agent: any) => {
        const agentName = (agent.name || '').toUpperCase();
        
        // Opción 1: Coincide con el regex del filtro directamente
        if (filterParam) {
          try {
            const regex = new RegExp(filterParam, 'i');
            if (regex.test(agent.name || '')) {
              return true;
            }
          } catch (e) {
            // Si el regex es inválido, hacer búsqueda simple
            if (agentName.includes(filterParam.toUpperCase())) {
              return true;
            }
          }
        }
        
        // Opción 2: Contiene alguna palabra clave de los pipelines filtrados
        const matchingKeyword = pipelineKeywords.find(keyword => 
          agentName.includes(keyword)
        );
        
        if (matchingKeyword) {
          return true;
        }
        
        // Opción 3: Tiene jobs relacionados con los pipelines filtrados (fallback)
        const relevantJobs = agent.PipelineJobQueues?.filter((job: any) => 
          filteredPipelineIds.includes(job.pipeline_id)
        ) || [];
        
        if (relevantJobs.length > 0) {
          return true;
        }
        
        return false;
      });
      
      return filtered;
    },
    enabled: filteredPipelineIds.length > 0,
    refetchInterval: 30000,
  });

  // Procesar y ordenar datos (ya vienen filtrados de las queries)
  const filteredData = useMemo(() => {
    try {
      if (!pipelinesData) {
        return { pipelines: [], agents: [], jobs: [], errors: [], activity: [] };
      }

      // Validación temprana: si hay demasiados datos, limitar inmediatamente
      const MAX_ITEMS = 100;
      
      // Los pipelines ya están filtrados en filteredPipelineIds
      const filteredPipelines = pipelinesData
        .filter((p: any) => filteredPipelineIds.includes(p.id))
        .slice(0, MAX_ITEMS);
      
      // Jobs, errores y actividad ya vienen filtrados de las queries
      // Limitar cantidad desde el inicio
      const filteredJobs = jobsData ? jobsData.slice(0, 500) : [];
      const filteredErrors = errorLogsData ? errorLogsData.slice(0, 200) : [];
      const filteredActivity = activityData ? activityData.slice(0, 200) : [];

    // Ordenar agentes por gravedad de problema: primero offline, luego warning, luego healthy
    // Dentro de cada categoría, ordenar por último job (más reciente primero)
    // Limitar a 100 agentes para evitar problemas de rendimiento
    const agentsList = agentsData || [];
    const limitedAgents = agentsList.slice(0, MAX_ITEMS);
    
    // Función auxiliar para obtener prioridad (fuera del sort)
    const getStatusPriority = (agent: any) => {
      try {
        const hasPing = agent?.AgentPassportPing?.last_ping_at;
        if (!agent?.is_healthy && !hasPing) return 0; // offline
        if (!agent?.is_healthy && hasPing) return 1; // warning
        return 2; // healthy
      } catch (e) {
        return 2;
      }
    };
    
    const sortedAgents = limitedAgents.slice().sort((a: any, b: any) => {
      try {
        const priorityA = getStatusPriority(a);
        const priorityB = getStatusPriority(b);
        
        if (priorityA !== priorityB) {
          return priorityA - priorityB;
        }
        
        // Si tienen la misma prioridad, ordenar por último job
        const lastJobA = a?.PipelineJobQueues?.[0]?.created_at;
        const lastJobB = b?.PipelineJobQueues?.[0]?.created_at;
        
        if (!lastJobA && !lastJobB) return 0;
        if (!lastJobA) return 1;
        if (!lastJobB) return -1;
        
        const timeA = new Date(lastJobA).getTime();
        const timeB = new Date(lastJobB).getTime();
        
        if (isNaN(timeA) || isNaN(timeB)) return 0;
        
        return timeB - timeA;
      } catch (e) {
        return 0;
      }
    });

    // Ordenar pipelines por actividad más reciente (último job)
    const pipelinesWithActivity = filteredPipelines.map((pipeline: any) => {
      try {
        // Buscar jobs de este pipeline de forma más eficiente
        let lastJobDate = null;
        let lastAgentId = null;
        let maxTime = 0;
        
        // En lugar de filter + loop, hacer un solo recorrido
        for (let i = 0; i < Math.min(filteredJobs.length, 200); i++) {
          const job = filteredJobs[i];
          if (job?.pipeline_id === pipeline?.id) {
            const jobTime = new Date(job.created_at || 0).getTime();
            if (!isNaN(jobTime) && jobTime > maxTime) {
              maxTime = jobTime;
              lastJobDate = job.created_at;
              lastAgentId = job.started_by_agent;
            }
          }
        }
        
        // Crear objeto plano sin spread operator para evitar referencias circulares
        return {
          id: pipeline?.id,
          name: pipeline?.name || '',
          description: pipeline?.description || '',
          abort_on_error: pipeline?.abort_on_error,
          lastJobDate,
          lastAgentId
        };
      } catch (e) {
        return {
          id: pipeline?.id,
          name: pipeline?.name || '',
          description: pipeline?.description || ''
        };
      }
    });
    
    const sortedPipelines = pipelinesWithActivity.slice().sort((a: any, b: any) => {
      try {
        if (!a?.lastJobDate && !b?.lastJobDate) return 0;
        if (!a?.lastJobDate) return 1;
        if (!b?.lastJobDate) return -1;
        
        const timeA = new Date(a.lastJobDate).getTime();
        const timeB = new Date(b.lastJobDate).getTime();
        
        if (isNaN(timeA) || isNaN(timeB)) return 0;
        
        return timeB - timeA;
      } catch (e) {
        return 0;
      }
    });

      return {
        pipelines: sortedPipelines,
        agents: sortedAgents,
        jobs: filteredJobs,
        errors: filteredErrors,
        activity: filteredActivity
      };
    } catch (error) {
      console.error('Error procesando datos del dashboard:', error);
      // Retornar datos vacíos en caso de error para evitar crash
      return { pipelines: [], agents: [], jobs: [], errors: [], activity: [] };
    }
  }, [pipelinesData, agentsData, jobsData, errorLogsData, activityData, filteredPipelineIds]);

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
      warningAgents: agents.filter((a: any) => !a.is_healthy && a.AgentPassportPing?.last_ping_at).length,
      offlineAgents: agents.filter((a: any) => !a.is_healthy && !a.AgentPassportPing?.last_ping_at).length,
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
        <div className="text-center">
          {/* Animated Robot/Bot */}
          <div className="relative inline-block mb-6">
            {/* Robot Body */}
            <div className="relative">
              {/* Antenna */}
              <div className="absolute left-1/2 -translate-x-1/2 -top-8">
                <div className="w-1 h-6 bg-gradient-to-t from-blue-500 to-transparent mx-auto animate-pulse" />
                <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce shadow-lg shadow-blue-500/50" />
              </div>
              
              {/* Head */}
              <div className="w-24 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-2xl relative overflow-hidden">
                {/* Eyes */}
                <div className="flex gap-4 justify-center mt-6">
                  <div className="w-3 h-3 bg-white rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
                  <div className="w-3 h-3 bg-white rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
                </div>
                {/* Mouth/Display */}
                <div className="mt-2 mx-auto w-12 h-1 bg-white/60 rounded-full" />
                
                {/* Shine effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent" />
              </div>
              
              {/* Body */}
              <div className="mt-2 w-28 h-16 bg-gradient-to-br from-slate-600 to-slate-700 dark:from-slate-700 dark:to-slate-800 rounded-xl shadow-xl relative -ml-2">
                {/* Control panel */}
                <div className="flex gap-1 justify-center pt-3">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" style={{ animationDelay: '200ms' }} />
                  <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse" style={{ animationDelay: '400ms' }} />
                </div>
                
                {/* Loading bar */}
                <div className="mt-2 mx-auto w-16 h-1.5 bg-slate-800 dark:bg-slate-900 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full animate-pulse" style={{ width: '60%' }} />
                </div>
              </div>
              
              {/* Arms */}
              <div className="absolute top-24 -left-6 w-5 h-12 bg-gradient-to-b from-slate-600 to-slate-700 dark:from-slate-700 dark:to-slate-800 rounded-lg shadow-lg animate-bounce" style={{ animationDuration: '1s', animationDelay: '0ms' }} />
              <div className="absolute top-24 -right-6 w-5 h-12 bg-gradient-to-b from-slate-600 to-slate-700 dark:from-slate-700 dark:to-slate-800 rounded-lg shadow-lg animate-bounce" style={{ animationDuration: '1s', animationDelay: '500ms' }} />
            </div>
          </div>
          
          {/* Loading Text */}
          <div className="space-y-2">
            <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">
              Cargando Merlin
            </h2>
            <div className="flex items-center justify-center gap-1">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Conectando con los agentes...
            </p>
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
                      {filteredData.errors.slice(0, 8).map((error: any) => {
                        const pipelineName = error.PipelineJobQueue?.Pipeline?.name;
                        const agentName = error.PipelineJobQueue?.AgentPassport?.name;
                        
                        return (
                          <div key={error.id} className="text-xs border-l-2 border-red-500 pl-3 py-1">
                            <p className="font-medium text-slate-900 dark:text-white line-clamp-2">
                              {error.exception_message || error.message}
                            </p>
                            <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-500 dark:text-slate-400 flex-wrap">
                              {pipelineName && (
                                <>
                                  <span className="flex items-center gap-1">
                                    <GitBranch className="h-3 w-3" />
                                    {pipelineName}
                                  </span>
                                  <span>•</span>
                                </>
                              )}
                              {agentName && (
                                <>
                                  <span className="flex items-center gap-1">
                                    <Bot className="h-3 w-3" />
                                    {agentName}
                                  </span>
                                  <span>•</span>
                                </>
                              )}
                              <span>{formatRelativeTime(error.created_at)}</span>
                            </div>
                          </div>
                        );
                      })}
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
                  {filteredData.activity.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-sm text-slate-500 dark:text-slate-400">No hay actividad reciente</p>
                    </div>
                  ) : (
                    <div className="space-y-2 pr-4">
                      {filteredData.activity.map((log: any) => {
                        const level = log.level || 'INFO';
                        const pipelineName = log.PipelineJobQueue?.Pipeline?.name;
                        const agentName = log.PipelineJobQueue?.AgentPassport?.name;
                        
                        return (
                          <div key={log.id} className="flex items-start gap-2 text-xs">
                            <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${getLevelColor(level)}`} />
                            <div className="flex-1 min-w-0">
                              <p className="text-slate-900 dark:text-white line-clamp-2">{log.message}</p>
                              <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-500 dark:text-slate-400">
                                {pipelineName && (
                                  <>
                                    <span className="flex items-center gap-1">
                                      <GitBranch className="h-3 w-3" />
                                      {pipelineName}
                                    </span>
                                    <span>•</span>
                                  </>
                                )}
                                {agentName && (
                                  <>
                                    <span className="flex items-center gap-1">
                                      <Bot className="h-3 w-3" />
                                      {agentName}
                                    </span>
                                    <span>•</span>
                                  </>
                                )}
                                <span>{formatRelativeTime(log.created_at)}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
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
                        const lastPing = agent.AgentPassportPing?.last_ping_at;
                        const status = agent.is_healthy 
                          ? 'healthy' 
                          : lastPing 
                          ? 'warning' 
                          : 'offline';
                        
                        // Buscar el último job de este agente
                        const agentJobs = filteredData.jobs.filter((j: any) => j.started_by_agent === agent.id);
                        const sortedJobs = agentJobs.sort((a: any, b: any) => 
                          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                        );
                        const lastJob = sortedJobs[0];
                        
                        // Determinar icono de ping
                        let pingIcon;
                        if (status === 'offline') {
                          pingIcon = <WifiOff className="h-3.5 w-3.5 text-red-500" />;
                        } else if (status === 'warning') {
                          pingIcon = <AlertTriangle className="h-3.5 w-3.5 text-yellow-500" />;
                        } else {
                          pingIcon = <Wifi className="h-3.5 w-3.5 text-green-500" />;
                        }
                        
                        return (
                          <div
                            key={agent.id}
                            className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600"
                          >
                            {pingIcon}
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-medium text-slate-900 dark:text-white truncate">
                                {agent.name}
                              </p>
                              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                                {agentJobs.length || 0} jobs
                              </p>
                              {lastJob && (
                                <p className="text-[10px] text-slate-400 dark:text-slate-500">
                                  Último: {formatRelativeTime(lastJob.created_at)}
                                </p>
                              )}
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
                      
                      // Buscar el agente que ejecutó este pipeline
                      const lastAgent = filteredData.agents.find((a: any) => a.id === pipeline.lastAgentId);
                      
                      // Determinar el estado principal del pipeline
                      let mainStatus = 'idle';
                      let statusBadge = null;
                      
                      if (running > 0) {
                        mainStatus = 'running';
                        statusBadge = (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-[10px] font-medium">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                            En proceso
                          </span>
                        );
                      } else if (aborted > 0) {
                        mainStatus = 'error';
                        statusBadge = (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-[10px] font-medium">
                            <XCircle className="h-3 w-3" />
                            Con errores
                          </span>
                        );
                      } else if (completed > 0) {
                        mainStatus = 'success';
                        statusBadge = (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-[10px] font-medium">
                            <CheckCircle className="h-3 w-3" />
                            Completado
                          </span>
                        );
                      }
                      
                      return (
                        <div
                          key={pipeline.id}
                          className="p-2 sm:p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <p className="text-xs sm:text-sm font-medium text-slate-900 dark:text-white truncate">
                                  {pipeline.name}
                                </p>
                                {statusBadge}
                              </div>
                              {pipeline.description && (
                                <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                                  {pipeline.description}
                                </p>
                              )}
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2 flex-shrink-0"
                              disabled={isExecuting || running > 0}
                              onClick={(e) => {
                                e.stopPropagation();
                                executePipeline(pipeline.id, pipeline.name);
                              }}
                            >
                              <Play className="h-3 w-3 mr-1" />
                              <span className="text-xs">Run</span>
                            </Button>
                          </div>
                          <div className="flex items-center gap-3 mt-2 text-[10px] flex-wrap">
                            {lastAgent && (
                              <>
                                <span className="flex items-center gap-1 text-slate-600 dark:text-slate-300 font-medium">
                                  <Bot className="h-3 w-3" />
                                  {lastAgent.name}
                                </span>
                                <span className="text-slate-400">•</span>
                              </>
                            )}
                            {running > 0 && (
                              <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400 font-medium">
                                <Clock className="h-3 w-3" />
                                {running} activos
                              </span>
                            )}
                            {completed > 0 && (
                              <span className="flex items-center gap-1 text-green-600 dark:text-green-400 font-medium">
                                <CheckCircle className="h-3 w-3" />
                                {completed} ok
                              </span>
                            )}
                            {aborted > 0 && (
                              <span className="flex items-center gap-1 text-red-600 dark:text-red-400 font-medium">
                                <XCircle className="h-3 w-3" />
                                {aborted} errores
                              </span>
                            )}
                            {pipelineJobs.length === 0 && (
                              <span className="text-slate-400 dark:text-slate-500">Sin jobs recientes</span>
                            )}
                          </div>
                          {pipeline.lastJobDate && (
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1.5 flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Última ejecución: {formatRelativeTime(pipeline.lastJobDate)}
                            </p>
                          )}
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
