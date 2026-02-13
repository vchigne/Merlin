import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { usePipeline, usePipelineUnits } from "@/hooks/use-pipeline";
import { useQuery } from "@tanstack/react-query";
import { executeQuery } from "@/lib/hasura-client";
import { Button } from "@/components/ui/button";
import { Calendar, Settings, StopCircle } from "lucide-react";
import { EditableDescription } from "@/components/EditableDescription";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { differenceInMinutes } from "date-fns";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface PipelineJob {
  id: string;
  pipeline_id: string;
  completed: boolean;
  running: boolean;
  aborted: boolean;
  created_at: string;
  updated_at: string;
  started_by_agent?: string;
  Pipeline?: { name: string };
}

interface PipelineLog {
  id: string;
  pipeline_job_id: string;
  pipeline_unit_id?: string;
  date: string;
  level: string;
  message: string;
  callsite?: string;
  exception?: string;
  exception_message?: string;
  exception_stack_trace?: string;
  created_at: string;
  PipelineJobQueue?: {
    id: string;
    pipeline_id: string;
    started_by_agent?: string;
    Pipeline?: { id: string; name: string };
  };
  PipelineUnit?: { id: string; comment?: string };
}
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription,
  CardFooter 
} from "@/components/ui/card";
import { 
  ArrowLeft, 
  Clock, 
  AlertTriangle,
  CheckCircle, 
  AlertCircle,
  Bot,
  GitBranch,
  ExternalLink,
  RefreshCw,
  Play
} from "lucide-react";
import { useExecutePipeline } from "@/hooks/use-execute-pipeline";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PipelineVisualizerNew from "@/components/dashboard/PipelineVisualizerNew";
import JobItem from "@/components/jobs/JobItem";
import LogEntry from "@/components/logs/LogEntry";
import { Link } from "wouter";
import { formatDate, formatRelativeTime } from "@/lib/utils";

// Hook para obtener detalles de un job específico
function useJobDetails(jobId: string) {
  return useQuery({
    queryKey: ['/api/jobs', jobId],
    queryFn: async () => {
      const result = await executeQuery(`
        query GetJobDetails($jobId: uuid!) {
          merlin_agent_PipelineJobQueue(where: {id: {_eq: $jobId}}) {
            id
            pipeline_id
            completed
            created_at
            updated_at
            running
            aborted
            started_by_agent
            Pipeline {
              id
              name
              description
              agent_passport_id
            }
          }
        }
      `, { jobId });
      
      if (result.errors) {
        throw new Error(result.errors[0].message);
      }
      
      return result.data.merlin_agent_PipelineJobQueue[0];
    },
    enabled: !!jobId,
  });
}

// Hook para obtener logs de un job específico
function useJobLogs(jobId: string) {
  return useQuery<PipelineLog[]>({
    queryKey: ['/api/job-logs', jobId],
    queryFn: async () => {
      const result = await executeQuery(`
        query GetJobLogs($jobId: uuid!) {
          merlin_agent_PipelineJobLogV2Body(
            where: {pipeline_job_id: {_eq: $jobId}}
            order_by: {date: desc}
          ) {
            id
            pipeline_job_id
            pipeline_unit_id
            date
            level
            message
            callsite
            exception
            exception_message
            exception_stack_trace
            created_at
          }
        }
      `, { jobId });
      
      if (result.errors) {
        throw new Error(result.errors[0].message);
      }
      
      return result.data.merlin_agent_PipelineJobLogV2Body;
    },
    enabled: !!jobId,
    refetchInterval: 15000,
  });
}

export default function PipelineDetails() {
  const { id } = useParams();
  const [_, navigate] = useLocation();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const { executePipeline, isExecuting } = useExecutePipeline();
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const { toast } = useToast();
  
  // Determinar si estamos viendo un pipeline o un job
  const pathname = window.location.pathname;
  const isJobView = pathname.startsWith('/jobs/');
  
  // Fetch job details (solo para vista de job)
  const {
    data: jobDetails,
    isLoading: isJobDetailsLoading,
    error: jobDetailsError,
    refetch: refetchJobDetails
  } = useQuery({
    queryKey: ['/api/jobs', id],
    queryFn: async () => {
      const result = await executeQuery(`
        query GetJobDetails($jobId: uuid!) {
          merlin_agent_PipelineJobQueue(where: {id: {_eq: $jobId}}) {
            id
            pipeline_id
            completed
            created_at
            updated_at
            running
            aborted
            started_by_agent
            Pipeline {
              id
              name
              description
              agent_passport_id
            }
          }
        }
      `, { jobId: id });
      
      if (result.errors) {
        throw new Error(result.errors[0].message);
      }
      
      return result.data.merlin_agent_PipelineJobQueue[0];
    },
    enabled: !!id && isJobView,
  });
  
  // Fetch job logs (solo para vista de job)
  const {
    data: jobLogs,
    isLoading: isJobLogsLoading,
    error: jobLogsError,
    refetch: refetchJobLogs
  } = useQuery({
    queryKey: ['/api/job-logs', id, jobDetails?.Pipeline?.id],
    queryFn: async () => {
      // First try to get logs by job_id
      let result = await executeQuery(`
        query GetJobLogs($jobId: uuid!) {
          merlin_agent_PipelineJobLogV2Body(
            where: {pipeline_job_id: {_eq: $jobId}}
            order_by: {date: desc}
            limit: 100
          ) {
            id
            pipeline_job_id
            pipeline_unit_id
            date
            level
            message
            callsite
            exception
            exception_message
            exception_stack_trace
            created_at
            PipelineJobQueue {
              id
              Pipeline {
                id
                name
              }
              started_by_agent
            }
            PipelineUnit {
              id
              comment
            }
          }
        }
      `, { jobId: id });
      
      if (result.errors) {
        console.error('Error fetching job logs:', result.errors);
        throw new Error(result.errors[0].message);
      }
      
      let logs = result.data.merlin_agent_PipelineJobLogV2Body || [];
      console.log(`Job logs by job_id: ${logs.length} found`);
      
      // If no logs found and we have pipeline_id, try fetching by pipeline
      if (logs.length === 0 && jobDetails?.Pipeline?.id) {
        console.log(`No logs by job_id, trying pipeline_id: ${jobDetails.Pipeline.id}`);
        const pipelineResult = await executeQuery(`
          query GetPipelineLogs($pipelineId: uuid!) {
            merlin_agent_PipelineJobLogV2Body(
              where: {
                PipelineJobQueue: {pipeline_id: {_eq: $pipelineId}}
              }
              order_by: {date: desc}
              limit: 50
            ) {
              id
              pipeline_job_id
              pipeline_unit_id
              date
              level
              message
              callsite
              exception
              exception_message
              exception_stack_trace
              created_at
              PipelineJobQueue {
                id
                Pipeline {
                  id
                  name
                }
                started_by_agent
              }
              PipelineUnit {
                id
                comment
              }
            }
          }
        `, { pipelineId: jobDetails.Pipeline.id });
        
        if (!pipelineResult.errors) {
          logs = pipelineResult.data.merlin_agent_PipelineJobLogV2Body || [];
          console.log(`Pipeline logs: ${logs.length} found`);
        }
      }
      
      return logs;
    },
    enabled: !!id && isJobView,
    refetchInterval: 15000, 
  });
  
  // Fetch pipeline details (solo si no estamos en vista de job)
  const {
    data: pipeline,
    isLoading: isPipelineLoading,
    error: pipelineError,
    refetch: refetchPipeline
  } = useQuery({
    queryKey: ['/api/pipelines', id],
    queryFn: async () => {
      const result = await executeQuery(`
        query GetPipeline($pipelineId: uuid!) {
          merlin_agent_Pipeline(where: {id: {_eq: $pipelineId}}) {
            id
            name
            description
            abort_on_error
            notify_on_abort_email_id
            notify_on_abort_webhook_id
            created_at
            updated_at
            agent_passport_id
            disposable
            PipelineJobQueues(limit: 1, order_by: {created_at: desc}) {
              id
              created_at
              completed
              running
              aborted
            }
          }
        }
      `, { pipelineId: id });
      
      if (result.errors) {
        throw new Error(result.errors[0].message);
      }
      
      return result.data.merlin_agent_Pipeline[0];
    },
    enabled: !!id && !isJobView,
  });
  
  // Fetch pipeline units (solo para vista de pipeline)
  const {
    data: pipelineUnits,
    isLoading: isUnitsLoading,
    refetch: refetchUnits
  } = useQuery({
    queryKey: ['/api/pipeline-units', id],
    queryFn: async () => {
      const result = await executeQuery(`
        query GetPipelineUnits($pipelineId: uuid!) {
          merlin_agent_PipelineUnit(where: {pipeline_id: {_eq: $pipelineId}}) {
            id
            pipeline_id
            command_id
            query_queue_id
            sftp_downloader_id
            sftp_uploader_id
            zip_id
            unzip_id
            posx
            posy
            comment
            retry_count
            timeout_milliseconds
            abort_on_timeout
            continue_on_error
          }
        }
      `, { pipelineId: id });
      
      if (result.errors) {
        throw new Error(result.errors[0].message);
      }
      
      return result.data.merlin_agent_PipelineUnit;
    },
    enabled: !!id && !isJobView,
  });
  
  // Fetch pipeline jobs (solo para vista de pipeline)
  const {
    data: jobs,
    isLoading: isJobsLoading,
    refetch: refetchJobs
  } = useQuery<PipelineJob[]>({
    queryKey: ['/api/pipelines/jobs', id],
    queryFn: async () => {
      const result = await executeQuery(`
        query GetPipelineJobs($id: uuid!) {
          merlin_agent_PipelineJobQueue(
            where: {pipeline_id: {_eq: $id}}
            order_by: {created_at: desc}
            limit: 10
          ) {
            id
            pipeline_id
            completed
            running
            aborted
            created_at
            updated_at
            started_by_agent
            Pipeline {
              name
            }
          }
        }
      `, { id });
      
      if (result.errors) {
        throw new Error(result.errors[0].message);
      }
      
      return result.data.merlin_agent_PipelineJobQueue;
    },
    enabled: !!id && !isJobView && activeTab === "jobs",
  });
  
  // Fetch pipeline logs (solo para vista de pipeline)
  const {
    data: logs,
    isLoading: isLogsLoading,
    refetch: refetchLogs
  } = useQuery<PipelineLog[]>({
    queryKey: ['/api/pipelines/logs', id],
    queryFn: async () => {
      const result = await executeQuery(`
        query GetPipelineLogs($id: uuid!) {
          merlin_agent_PipelineJobLogV2Body(
            where: {PipelineJobQueue: {pipeline_id: {_eq: $id}}}
            order_by: {date: desc}
            limit: 20
          ) {
            id
            pipeline_job_id
            pipeline_unit_id
            date
            level
            message
            callsite
            exception
            exception_message
            exception_stack_trace
            created_at
            PipelineJobQueue {
              id
              pipeline_id
              started_by_agent
              Pipeline {
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
      `, { id });
      
      if (result.errors) {
        throw new Error(result.errors[0].message);
      }
      
      return result.data.merlin_agent_PipelineJobLogV2Body;
    },
    enabled: !!id && !isJobView && activeTab === "logs",
  });
  
  // Fetch schedules that include this pipeline (solo para vista de pipeline)
  interface ScheduleInfo {
    id: number;
    label: string;
    timeOfDay: string;
    timezone: string;
    frequencyType: string;
    enabled: boolean;
  }
  
  const {
    data: pipelineSchedules,
    isLoading: isSchedulesLoading,
    refetch: refetchPipelineSchedules
  } = useQuery<ScheduleInfo[]>({
    queryKey: ['/api/pipeline-schedules', id],
    queryFn: async () => {
      const response = await fetch(`/api/schedules/by-pipeline/${id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch schedules');
      }
      return response.json();
    },
    enabled: !!id && !isJobView,
  });
  
  const {
    data: allSchedules,
    isLoading: isAllSchedulesLoading
  } = useQuery<ScheduleInfo[]>({
    queryKey: ['/api/schedules'],
    queryFn: async () => {
      const response = await fetch(`/api/schedules`);
      if (!response.ok) {
        throw new Error('Failed to fetch all schedules');
      }
      return response.json();
    },
    enabled: !!id && !isJobView,
  });
  
  const [schedulesDialogOpen, setSchedulesDialogOpen] = useState(false);
  const [showSchedulePicker, setShowSchedulePicker] = useState(false);
  const [addingToSchedule, setAddingToSchedule] = useState<number | null>(null);
  
  const handleAddToSchedule = async (scheduleId: number) => {
    if (!id || !pipeline) return;
    setAddingToSchedule(scheduleId);
    try {
      const response = await fetch(`/api/schedules/${scheduleId}/targets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pipelineId: id,
          pipelineName: pipeline.name,
          clientName: pipeline.description || 'Unknown',
          enabled: true
        })
      });
      if (!response.ok) {
        throw new Error('Failed to add pipeline to schedule');
      }
      await refetchPipelineSchedules();
      setShowSchedulePicker(false);
    } catch (error) {
      console.error('Error adding to schedule:', error);
    }
    setAddingToSchedule(null);
  };
  
  const availableSchedules = allSchedules?.filter(
    s => !pipelineSchedules?.some(ps => ps.id === s.id)
  ) || [];
  
  const handleCancelJob = async () => {
    if (!id) return;
    setIsCancelling(true);
    try {
      const result = await executeQuery(`
        mutation CancelJob($id: uuid!) {
          update_merlin_agent_PipelineJobQueue_by_pk(
            pk_columns: { id: $id }
            _set: { completed: true, running: false, aborted: true }
          ) {
            id
            completed
            running
            aborted
          }
        }
      `, { id });

      if (result.errors) {
        throw new Error(result.errors[0].message);
      }

      toast({
        title: "Job cancelado",
        description: `El job fue cancelado correctamente.`,
      });

      queryClient.invalidateQueries({ queryKey: ['/api/jobs', id] });
      queryClient.invalidateQueries({ queryKey: ['/api/graphql', 'running-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['/api/graphql', 'recent-jobs'] });
      await refetchJobDetails();
    } catch (error: any) {
      toast({
        title: "Error al cancelar",
        description: error.message || "No se pudo cancelar el job.",
        variant: "destructive",
      });
    } finally {
      setIsCancelling(false);
      setShowCancelDialog(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      if (isJobView) {
        // Estamos viendo un job
        await refetchJobDetails();
        await refetchJobLogs();
      } else {
        // Estamos viendo un pipeline
        await refetchPipeline();
        await refetchUnits();
        
        if (activeTab === "jobs") {
          await refetchJobs();
        } else if (activeTab === "logs") {
          await refetchLogs();
        }
      }
    } catch (error) {
      console.error("Error refreshing data:", error);
    }
    setTimeout(() => setIsRefreshing(false), 500);
  };
  
  // Handle tab change
  useEffect(() => {
    if (!isJobView) {
      // Solo para vista de pipeline
      if (activeTab === "jobs" && !jobs) {
        refetchJobs();
      } else if (activeTab === "logs" && !logs) {
        refetchLogs();
      }
    }
  }, [activeTab, jobs, logs, refetchJobs, refetchLogs, isJobView]);
  
  // Determinar si estamos cargando datos
  const isLoading = isJobView 
    ? isJobDetailsLoading || isJobLogsLoading
    : isPipelineLoading || isUnitsLoading || 
      (activeTab === "jobs" && isJobsLoading) ||
      (activeTab === "logs" && isLogsLoading);
    
  // Calculate job statistics
  const jobStats = !jobs ? { total: 0, completed: 0, running: 0, failed: 0 } : {
    total: jobs.length,
    completed: jobs.filter(job => job.completed).length,
    running: jobs.filter(job => job.running).length,
    failed: jobs.filter(job => job.aborted).length
  };
  
  return (
    <div className="space-y-6">
      {/* Page title and back button */}
      <div className="flex flex-wrap sm:flex-row items-center gap-2 sm:gap-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(isJobView ? "/jobs" : "/pipelines")}
          className="px-2 mr-auto sm:mr-2"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          <span className="text-sm">Back</span>
        </Button>
        <Separator orientation="vertical" className="h-6 mx-2 hidden sm:block" />
        <h1 className="text-xl sm:text-2xl font-bold dark:text-white w-full sm:w-auto order-first sm:order-none mb-2 sm:mb-0">
          {isJobView ? "Job Details" : "Pipeline Details"}
        </h1>
      </div>
      
      {/* Item not found error (pipeline o job) */}
      {((isJobView && !isJobDetailsLoading && jobDetailsError) || 
        (!isJobView && !isPipelineLoading && pipelineError)) && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-10">
            <AlertCircle className="h-16 w-16 text-red-500 mb-4" />
            <h2 className="text-xl font-semibold mb-2">
              {isJobView ? "Job Not Found" : "Pipeline Not Found"}
            </h2>
            <p className="text-slate-500 dark:text-slate-400 mb-4">
              The {isJobView ? "job" : "pipeline"} you're looking for doesn't exist or you don't have access to view it.
            </p>
            <Button onClick={() => navigate(isJobView ? "/jobs" : "/pipelines")}>
              Return to {isJobView ? "Jobs" : "Pipelines"}
            </Button>
          </CardContent>
        </Card>
      )}
      
      {/* Detalles (pipeline o job) */}
      {((isJobView && !jobDetailsError) || (!isJobView && !pipelineError)) && (
        <>
          {/* Tarjeta de información general */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 sm:gap-0">
                <div>
                  <CardTitle className="text-lg sm:text-xl">
                    {isJobView ? (
                      isJobDetailsLoading ? (
                        <Skeleton className="h-6 sm:h-7 w-48 sm:w-56" />
                      ) : (
                        jobDetails?.Pipeline?.name || `Job ${id?.substring(0, 8)}`
                      )
                    ) : (
                      isPipelineLoading ? (
                        <Skeleton className="h-6 sm:h-7 w-48 sm:w-56" />
                      ) : (
                        pipeline?.name || id?.substring(0, 8)
                      )
                    )}
                  </CardTitle>
                  <CardDescription className="mt-1 line-clamp-2 sm:line-clamp-none">
                    {isJobView ? (
                      isJobDetailsLoading ? (
                        <Skeleton className="h-4 w-full sm:w-96" />
                      ) : (
                        jobDetails?.Pipeline ? (
                          <EditableDescription
                            pipelineId={jobDetails.Pipeline.id}
                            description={jobDetails.Pipeline.description}
                          />
                        ) : "No description available"
                      )
                    ) : (
                      isPipelineLoading ? (
                        <Skeleton className="h-4 w-full sm:w-96" />
                      ) : (
                        pipeline ? (
                          <EditableDescription
                            pipelineId={pipeline.id || id || ""}
                            description={pipeline.description}
                          />
                        ) : "No description available"
                      )
                    )}
                  </CardDescription>
                </div>
                <div className="flex gap-2 self-end sm:self-start">
                  {!isJobView && (
                    <Button
                      size="sm"
                      onClick={() => {
                        if (id && pipeline?.name) {
                          executePipeline(id, pipeline.name);
                        } else if (id) {
                          executePipeline(id);
                        }
                      }}
                      disabled={isLoading || isExecuting}
                    >
                      <Play className="mr-1 sm:mr-2 h-3.5 sm:h-4 w-3.5 sm:w-4" />
                      <span className="text-xs sm:text-sm">Run</span>
                    </Button>
                  )}
                  {isJobView && jobDetails?.running && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => setShowCancelDialog(true)}
                      disabled={isCancelling}
                    >
                      <StopCircle className="mr-1 sm:mr-2 h-3.5 sm:h-4 w-3.5 sm:w-4" />
                      <span className="text-xs sm:text-sm">Cancelar Job</span>
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRefresh}
                    disabled={isLoading || isRefreshing}
                  >
                    <RefreshCw className={`mr-1 sm:mr-2 h-3.5 sm:h-4 w-3.5 sm:w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                    <span className="text-xs sm:text-sm">Refresh</span>
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pb-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Info del item (pipeline o job) */}
                <div className="space-y-2">
                  <div className="flex items-center">
                    <GitBranch className="h-4 w-4 text-slate-500 mr-2" />
                    <span className="text-sm text-slate-700 dark:text-slate-300">
                      ID: {isLoading ? <Skeleton className="h-4 w-32 inline-block" /> : id}
                    </span>
                  </div>
                  
                  {/* Link al agente (para pipeline) o al pipeline (para job) */}
                  {isJobView ? (
                    jobDetails?.Pipeline?.id && (
                      <div className="flex items-center">
                        <GitBranch className="h-4 w-4 text-slate-500 mr-2" />
                        <span className="text-sm text-slate-700 dark:text-slate-300">
                          Pipeline: {" "}
                          {isJobDetailsLoading ? (
                            <Skeleton className="h-4 w-32 inline-block" />
                          ) : (
                            <Link href={`/pipelines/${jobDetails.Pipeline.id}`} className="text-primary-600 dark:text-primary-400 hover:underline">
                                {jobDetails.Pipeline.name || jobDetails.Pipeline.id.substring(0, 8)}
                            </Link>
                          )}
                        </span>
                      </div>
                    )
                  ) : (
                    pipeline?.agent_passport_id && (
                      <div className="flex items-center">
                        <Bot className="h-4 w-4 text-slate-500 mr-2" />
                        <span className="text-sm text-slate-700 dark:text-slate-300">
                          Agent: {" "}
                          {isPipelineLoading ? (
                            <Skeleton className="h-4 w-32 inline-block" />
                          ) : (
                            <Link href={`/agents/${pipeline.agent_passport_id}`} className="text-primary-600 dark:text-primary-400 hover:underline">
                                {pipeline.agent_passport_id.substring(0, 8)}
                            </Link>
                          )}
                        </span>
                      </div>
                    )
                  )}
                  
                  {/* Agente que ejecutó el job (solo para job) */}
                  {isJobView && jobDetails?.started_by_agent && (
                    <div className="flex items-center">
                      <Bot className="h-4 w-4 text-slate-500 mr-2" />
                      <span className="text-sm text-slate-700 dark:text-slate-300">
                        Executed by: {isJobDetailsLoading ? (
                          <Skeleton className="h-4 w-32 inline-block" />
                        ) : (
                          <Link href={`/agents/${jobDetails.started_by_agent}`} className="text-primary-600 dark:text-primary-400 hover:underline">
                            {jobDetails.started_by_agent.substring(0, 8)}
                          </Link>
                        )}
                      </span>
                    </div>
                  )}
                  
                  {/* Fecha de creación */}
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 text-slate-500 mr-2" />
                    <span className="text-sm text-slate-700 dark:text-slate-300">
                      {isJobView 
                        ? (jobDetails?.running || jobDetails?.completed || jobDetails?.aborted 
                            ? "Executed" 
                            : "Queued")
                        : "Created"}: {isLoading ? (
                        <Skeleton className="h-4 w-32 inline-block" />
                      ) : (
                        formatRelativeTime(
                          isJobView ? 
                            jobDetails?.created_at || "" : 
                            pipeline?.created_at || ""
                        )
                      )}
                    </span>
                  </div>
                </div>
                
                {/* Stats */}
                <div className="flex flex-wrap gap-3">
                  {isLoading ? (
                    <>
                      <Skeleton className="h-8 w-24" />
                      <Skeleton className="h-8 w-24" />
                      <Skeleton className="h-8 w-24" />
                    </>
                  ) : (
                    <>
                      {/* Job status badges */}
                      {isJobView && (
                        <>
                          {jobDetails?.completed && (
                            <Badge variant="outline" className="bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 border-green-200 dark:border-green-800 flex items-center">
                              <CheckCircle className="h-3.5 w-3.5 mr-1" />
                              Completed
                            </Badge>
                          )}
                          
                          {jobDetails?.running && (() => {
                            const minutes = jobDetails?.created_at ? differenceInMinutes(new Date(), new Date(jobDetails.created_at)) : 0;
                            const elapsed = minutes < 1 ? "< 1 min" : minutes < 60 ? `${minutes} min` : `${Math.floor(minutes/60)}h ${minutes%60}m`;
                            const isWarning = minutes >= 15 && minutes < 60;
                            const isCritical = minutes >= 60;
                            return (
                              <Badge variant="outline" className={`flex items-center ${
                                isCritical ? "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 border-red-200 dark:border-red-800" :
                                isWarning ? "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 border-amber-200 dark:border-amber-800" :
                                "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 border-blue-200 dark:border-blue-800"
                              }`}>
                                <RefreshCw className="h-3.5 w-3.5 mr-1 animate-spin" />
                                Running ({elapsed})
                              </Badge>
                            );
                          })()}
                          
                          {jobDetails?.aborted && (
                            <Badge variant="outline" className="bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 border-red-200 dark:border-red-800 flex items-center">
                              <AlertCircle className="h-3.5 w-3.5 mr-1" />
                              Aborted
                            </Badge>
                          )}
                          
                          {!jobDetails?.running && !jobDetails?.completed && !jobDetails?.aborted && (
                            <Badge variant="outline" className="bg-slate-50 text-slate-700 dark:bg-slate-900/20 dark:text-slate-400 border-slate-200 dark:border-slate-800">
                              Pending
                            </Badge>
                          )}
                        </>
                      )}
                      
                      {/* Pipeline badges */}
                      {!isJobView && (
                        <>
                          {pipeline?.abort_on_error && (
                            <Badge variant="outline" className="bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 border-amber-200 dark:border-amber-800 flex items-center">
                              <AlertTriangle className="h-3.5 w-3.5 mr-1" />
                              Aborts on Error
                            </Badge>
                          )}
                          
                          {pipeline?.disposable && (
                            <Badge variant="outline" className="bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400 border-orange-200 dark:border-orange-800">
                              Disposable
                            </Badge>
                          )}
                          
                          {jobStats.total > 0 && (
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 border-blue-200 dark:border-blue-800 flex items-center">
                              <CheckCircle className="h-3.5 w-3.5 mr-1" />
                              Success Rate: {jobStats.total > 0 ? `${Math.round((jobStats.completed / jobStats.total) * 100)}%` : "N/A"}
                            </Badge>
                          )}
                          
                          {/* Schedule indicator */}
                          {isSchedulesLoading ? (
                            <Skeleton className="h-8 w-32" />
                          ) : pipelineSchedules && pipelineSchedules.length > 0 ? (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge 
                                    variant="outline" 
                                    className="bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400 border-purple-200 dark:border-purple-800 flex items-center cursor-pointer"
                                    onClick={() => setSchedulesDialogOpen(true)}
                                  >
                                    <Calendar className="h-3.5 w-3.5 mr-1" />
                                    {pipelineSchedules.length} {pipelineSchedules.length === 1 ? 'Schedule' : 'Schedules'}
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Click to view/manage schedules</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ) : (
                            <Badge 
                              variant="outline" 
                              className="bg-slate-50 text-slate-500 dark:bg-slate-900/20 dark:text-slate-400 border-slate-200 dark:border-slate-700 flex items-center cursor-pointer"
                              onClick={() => setSchedulesDialogOpen(true)}
                            >
                              <Calendar className="h-3.5 w-3.5 mr-1" />
                              No Schedules
                            </Badge>
                          )}
                        </>
                      )}
                    </>
                  )}
                </div>
              </div>
            </CardContent>
            {/* Footer con info adicional */}
            {isJobView ? (
              isJobDetailsLoading ? (
                <CardFooter className="pt-3 border-t border-slate-200 dark:border-slate-700">
                  <Skeleton className="h-5 w-full" />
                </CardFooter>
              ) : (
                <CardFooter className="pt-3 border-t border-slate-200 dark:border-slate-700 text-sm text-slate-500 dark:text-slate-400">
                  {jobDetails?.updated_at && 
                    `Last updated: ${formatRelativeTime(jobDetails.updated_at)}`}
                </CardFooter>
              )
            ) : (
              isPipelineLoading ? (
                <CardFooter className="pt-3 border-t border-slate-200 dark:border-slate-700">
                  <Skeleton className="h-5 w-full" />
                </CardFooter>
              ) : pipeline?.PipelineJobQueues && pipeline.PipelineJobQueues.length > 0 ? (
                <CardFooter className="pt-3 border-t border-slate-200 dark:border-slate-700 text-sm text-slate-500 dark:text-slate-400">
                  Last job execution: {formatRelativeTime(pipeline.PipelineJobQueues[0].created_at)}
                </CardFooter>
              ) : (
                <CardFooter className="pt-3 border-t border-slate-200 dark:border-slate-700 text-sm text-slate-500 dark:text-slate-400">
                  No job executions yet
                </CardFooter>
              )
            )}
          </Card>
          
          {/* Tabs - Pipeline View o Job View*/}
          {isJobView ? (
            // Tabs para Job View - Solo mostrar logs
            <Tabs defaultValue="logs" value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="w-full grid grid-cols-1 mb-2">
                <TabsTrigger value="logs" className="text-sm sm:text-base">Logs</TabsTrigger>
              </TabsList>
              
              {/* Logs Tab para Job */}
              <TabsContent value="logs" className="mt-6">
                {isJobLogsLoading ? (
                  <div className="space-y-4">
                    {Array.from({ length: 3 }).map((_, index) => (
                      <Skeleton key={index} className="h-[100px] w-full rounded-lg" />
                    ))}
                  </div>
                ) : !jobLogs || jobLogs.length === 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-10">
                      <p className="text-slate-500 dark:text-slate-400 mb-2">
                        No logs found for this job
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg">Job Logs</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 divide-y divide-slate-200 dark:divide-slate-700">
                      {jobLogs.map((log: PipelineLog) => (
                        <div key={log.id} className="px-4 py-2">
                          <LogEntry log={log} />
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          ) : (
            // Tabs para Pipeline View - Mostrar Flow, Jobs y Logs
            <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="w-full grid grid-cols-3 mb-2">
                <TabsTrigger value="overview" className="text-sm sm:text-base">Flow</TabsTrigger>
                <TabsTrigger value="jobs" className="text-sm sm:text-base">Jobs</TabsTrigger>
                <TabsTrigger value="logs" className="text-sm sm:text-base">Logs</TabsTrigger>
              </TabsList>
              
              {/* Overview Tab */}
              <TabsContent value="overview" className="mt-6">
                <PipelineVisualizerNew 
                  pipelineId={id} 
                  showSelector={false} 
                />
              </TabsContent>
              
              {/* Jobs Tab */}
              <TabsContent value="jobs" className="mt-6">
                {isJobsLoading ? (
                  <div className="space-y-4">
                    {Array.from({ length: 3 }).map((_, index) => (
                      <Skeleton key={index} className="h-[100px] w-full rounded-lg" />
                    ))}
                  </div>
                ) : !jobs || jobs.length === 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-10">
                      <Clock className="h-12 w-12 text-slate-300 dark:text-slate-600 mb-4" />
                      <p className="text-slate-500 dark:text-slate-400 mb-2 font-medium">
                        No job executions yet
                      </p>
                      <p className="text-sm text-slate-400 dark:text-slate-500">
                        Run this pipeline to see job history here
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {jobs.map(job => (
                      <JobItem key={job.id} job={job} compact={true} />
                    ))}
                    {jobs.length >= 10 && (
                      <div className="text-center">
                        <Link href={`/logs?pipelineId=${id}`}>
                          <Button variant="outline">
                            View All Jobs and Logs
                            <ExternalLink className="ml-2 h-4 w-4" />
                          </Button>
                        </Link>
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>
              
              {/* Logs Tab */}
              <TabsContent value="logs" className="mt-6">
                {isLogsLoading ? (
                  <div className="space-y-4">
                    {Array.from({ length: 3 }).map((_, index) => (
                      <Skeleton key={index} className="h-[100px] w-full rounded-lg" />
                    ))}
                  </div>
                ) : !logs || logs.length === 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-10">
                      <GitBranch className="h-12 w-12 text-slate-300 dark:text-slate-600 mb-4" />
                      <p className="text-slate-500 dark:text-slate-400 mb-2 font-medium">
                        No execution logs yet
                      </p>
                      <p className="text-sm text-slate-400 dark:text-slate-500">
                        Logs will appear here after running the pipeline
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg">Recent Logs</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 divide-y divide-slate-200 dark:divide-slate-700">
                      {logs.map((log) => (
                        <div key={log.id} className="px-4 py-2">
                          <LogEntry log={log} />
                        </div>
                      ))}
                    </CardContent>
                    <CardFooter className="flex justify-center p-4">
                      <Link href={`/logs?pipelineId=${id}`}>
                        <Button variant="outline">
                          View All Logs
                          <ExternalLink className="ml-2 h-4 w-4" />
                        </Button>
                      </Link>
                    </CardFooter>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          )}
        </>
      )}
      
      {/* Schedules Management Dialog */}
      <Dialog open={schedulesDialogOpen} onOpenChange={(open) => {
        setSchedulesDialogOpen(open);
        if (!open) setShowSchedulePicker(false);
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              {showSchedulePicker ? "Select a Schedule" : "Pipeline Schedules"}
            </DialogTitle>
            <DialogDescription>
              {showSchedulePicker 
                ? "Choose an existing schedule to add this pipeline to."
                : pipelineSchedules && pipelineSchedules.length > 0 
                  ? `This pipeline is included in ${pipelineSchedules.length} scheduled task(s).`
                  : "This pipeline is not included in any scheduled tasks."}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-3">
            {showSchedulePicker ? (
              <>
                {isAllSchedulesLoading ? (
                  <div className="text-center py-4">
                    <RefreshCw className="h-6 w-6 mx-auto animate-spin text-slate-400" />
                    <p className="text-sm text-slate-500 mt-2">Loading schedules...</p>
                  </div>
                ) : availableSchedules.length > 0 ? (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {availableSchedules.map((schedule) => (
                      <div 
                        key={schedule.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer transition-colors"
                        onClick={() => handleAddToSchedule(schedule.id)}
                      >
                        <div className="flex-1">
                          <p className="font-medium text-sm">{schedule.label}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {schedule.timeOfDay} ({schedule.timezone}) • {schedule.frequencyType}
                          </p>
                        </div>
                        {addingToSchedule === schedule.id ? (
                          <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />
                        ) : (
                          <Badge variant="outline" className="text-xs text-blue-600 border-blue-300">
                            + Add
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <Calendar className="h-12 w-12 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      This pipeline is already in all available schedules.
                    </p>
                  </div>
                )}
                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={() => setShowSchedulePicker(false)}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
              </>
            ) : (
              <>
                {pipelineSchedules && pipelineSchedules.length > 0 ? (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {pipelineSchedules.map((schedule) => (
                      <div 
                        key={schedule.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                        onClick={() => {
                          setSchedulesDialogOpen(false);
                          navigate(`/schedules?edit=${schedule.id}`);
                        }}
                      >
                        <div className="flex-1">
                          <p className="font-medium text-sm">{schedule.label}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {schedule.timeOfDay} ({schedule.timezone}) • {schedule.frequencyType}
                          </p>
                        </div>
                        <Badge variant={schedule.enabled ? "default" : "secondary"} className="text-xs">
                          {schedule.enabled ? "Active" : "Disabled"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <Calendar className="h-12 w-12 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      No schedules configured for this pipeline yet.
                    </p>
                  </div>
                )}
                
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="default"
                    className="flex-1"
                    onClick={() => setShowSchedulePicker(true)}
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    Add to Schedule
                  </Button>
                  {pipelineSchedules && pipelineSchedules.length > 0 && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSchedulesDialogOpen(false);
                        navigate(`/schedules`);
                      }}
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Cancelar este job?</AlertDialogTitle>
            <AlertDialogDescription>
              Vas a cancelar el job de <strong>"{jobDetails?.Pipeline?.name || 'pipeline'}"</strong>.
              {jobDetails?.created_at && (
                <span className="block mt-1">
                  Lleva ejecutándose {(() => {
                    const minutes = differenceInMinutes(new Date(), new Date(jobDetails.created_at));
                    if (minutes < 1) return "menos de 1 minuto";
                    if (minutes < 60) return `${minutes} minutos`;
                    const hours = Math.floor(minutes / 60);
                    return `${hours}h ${minutes % 60}m`;
                  })()}.
                </span>
              )}
              <span className="block mt-2 text-amber-600 dark:text-amber-400">
                El job se marcará como abortado.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCancelling}>No, mantener</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelJob}
              disabled={isCancelling}
              className="bg-red-600 hover:bg-red-700"
            >
              {isCancelling ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Cancelando...
                </>
              ) : (
                <>
                  <StopCircle className="h-4 w-4 mr-2" />
                  Sí, cancelar job
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
