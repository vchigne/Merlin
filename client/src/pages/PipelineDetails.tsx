import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { usePipeline, usePipelineUnits } from "@/hooks/use-pipeline";
import { useQuery } from "@tanstack/react-query";
import { executeQuery } from "@/lib/hasura-client";
import { Button } from "@/components/ui/button";
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
  RefreshCw
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PipelineFlow from "@/components/pipelines/PipelineFlow";
import PipelineFlowEnhanced from "@/components/pipelines/PipelineFlowEnhanced";
import "@/styles/pipeline-flow-enhanced.css";
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
  return useQuery({
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
    queryKey: ['/api/job-logs', id],
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
        throw new Error(result.errors[0].message);
      }
      
      return result.data.merlin_agent_PipelineJobLogV2Body;
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
  } = useQuery({
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
  } = useQuery({
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
                        jobDetails?.Pipeline?.description || "No description available"
                      )
                    ) : (
                      isPipelineLoading ? (
                        <Skeleton className="h-4 w-full sm:w-96" />
                      ) : (
                        pipeline?.description || "No description available"
                      )
                    )}
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={isLoading || isRefreshing}
                  className="self-end sm:self-start"
                >
                  <RefreshCw className={`mr-1 sm:mr-2 h-3.5 sm:h-4 w-3.5 sm:w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                  <span className="text-xs sm:text-sm">Refresh</span>
                </Button>
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
                      {isJobView ? "Executed" : "Created"}: {isLoading ? (
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
                          
                          {jobDetails?.running && (
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 border-blue-200 dark:border-blue-800 flex items-center">
                              <RefreshCw className="h-3.5 w-3.5 mr-1 animate-spin" />
                              Running
                            </Badge>
                          )}
                          
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
                      {jobLogs.map((log) => (
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
                <PipelineFlowEnhanced
                  pipelineUnits={pipelineUnits || []}
                  isLoading={isPipelineLoading || isUnitsLoading}
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
                      <p className="text-slate-500 dark:text-slate-400 mb-2">
                        No jobs found for this pipeline
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
                      <p className="text-slate-500 dark:text-slate-400 mb-2">
                        No logs found for this pipeline
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
    </div>
  );
}
