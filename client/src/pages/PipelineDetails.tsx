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
import JobItem from "@/components/jobs/JobItem";
import LogEntry from "@/components/logs/LogEntry";
import { Link } from "wouter";
import { formatDate, formatRelativeTime } from "@/lib/utils";

export default function PipelineDetails() {
  const { id } = useParams();
  const [_, navigate] = useLocation();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  
  // Fetch pipeline details
  const {
    data: pipeline,
    isLoading: isPipelineLoading,
    error: pipelineError,
    refetch: refetchPipeline
  } = usePipeline(id || "");
  
  // Fetch pipeline units
  const {
    data: pipelineUnits,
    isLoading: isUnitsLoading,
    refetch: refetchUnits
  } = usePipelineUnits(id || "");
  
  // Fetch pipeline jobs
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
            AgentPassport {
              name
            }
            PipelineJobLogs(limit: 1) {
              id
              logs
              warnings
              errors
            }
          }
        }
      `, { id });
      
      if (result.errors) {
        throw new Error(result.errors[0].message);
      }
      
      return result.data.merlin_agent_PipelineJobQueue;
    },
    enabled: !!id && activeTab === "jobs",
  });
  
  // Fetch pipeline logs
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
            order_by: {created_at: desc}
            limit: 20
          ) {
            id
            pipeline_job_queue_id
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
    enabled: !!id && activeTab === "logs",
  });
  
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refetchPipeline();
      await refetchUnits();
      
      if (activeTab === "jobs") {
        await refetchJobs();
      } else if (activeTab === "logs") {
        await refetchLogs();
      }
    } catch (error) {
      console.error("Error refreshing data:", error);
    }
    setTimeout(() => setIsRefreshing(false), 500);
  };
  
  // Handle tab change
  useEffect(() => {
    if (activeTab === "jobs" && !jobs) {
      refetchJobs();
    } else if (activeTab === "logs" && !logs) {
      refetchLogs();
    }
  }, [activeTab, jobs, logs, refetchJobs, refetchLogs]);
  
  const isLoading = isPipelineLoading || isUnitsLoading || 
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
          onClick={() => navigate("/pipelines")}
          className="px-2 mr-auto sm:mr-2"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          <span className="text-sm">Back</span>
        </Button>
        <Separator orientation="vertical" className="h-6 mx-2 hidden sm:block" />
        <h1 className="text-xl sm:text-2xl font-bold dark:text-white w-full sm:w-auto order-first sm:order-none mb-2 sm:mb-0">
          Pipeline Details
        </h1>
      </div>
      
      {/* Pipeline not found error */}
      {!isPipelineLoading && pipelineError && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-10">
            <AlertCircle className="h-16 w-16 text-red-500 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Pipeline Not Found</h2>
            <p className="text-slate-500 dark:text-slate-400 mb-4">
              The pipeline you're looking for doesn't exist or you don't have access to view it.
            </p>
            <Button onClick={() => navigate("/pipelines")}>
              Return to Pipelines
            </Button>
          </CardContent>
        </Card>
      )}
      
      {/* Pipeline details */}
      {!pipelineError && (
        <>
          {/* Overview Card */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 sm:gap-0">
                <div>
                  <CardTitle className="text-lg sm:text-xl">
                    {isPipelineLoading ? (
                      <Skeleton className="h-6 sm:h-7 w-48 sm:w-56" />
                    ) : (
                      pipeline?.name || id?.substring(0, 8)
                    )}
                  </CardTitle>
                  <CardDescription className="mt-1 line-clamp-2 sm:line-clamp-none">
                    {isPipelineLoading ? (
                      <Skeleton className="h-4 w-full sm:w-96" />
                    ) : (
                      pipeline?.description || "No description available"
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
                {/* Pipeline info */}
                <div className="space-y-2">
                  <div className="flex items-center">
                    <GitBranch className="h-4 w-4 text-slate-500 mr-2" />
                    <span className="text-sm text-slate-700 dark:text-slate-300">
                      ID: {isPipelineLoading ? <Skeleton className="h-4 w-32 inline-block" /> : id}
                    </span>
                  </div>
                  
                  {pipeline?.agent_passport_id && (
                    <div className="flex items-center">
                      <Bot className="h-4 w-4 text-slate-500 mr-2" />
                      <span className="text-sm text-slate-700 dark:text-slate-300">
                        Agent: {" "}
                        {isPipelineLoading ? (
                          <Skeleton className="h-4 w-32 inline-block" />
                        ) : (
                          <Link href={`/agents/${pipeline.agent_passport_id}`} className="text-primary-600 dark:text-primary-400 hover:underline">
                              {pipeline.AgentPassport?.name || pipeline.agent_passport_id.substring(0, 8)}
                          </Link>
                        )}
                      </span>
                    </div>
                  )}
                  
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 text-slate-500 mr-2" />
                    <span className="text-sm text-slate-700 dark:text-slate-300">
                      Created: {isPipelineLoading ? (
                        <Skeleton className="h-4 w-32 inline-block" />
                      ) : (
                        formatDate(pipeline?.created_at || "")
                      )}
                    </span>
                  </div>
                </div>
                
                {/* Pipeline stats */}
                <div className="flex flex-wrap gap-3">
                  {isPipelineLoading ? (
                    <>
                      <Skeleton className="h-8 w-24" />
                      <Skeleton className="h-8 w-24" />
                      <Skeleton className="h-8 w-24" />
                    </>
                  ) : (
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
                </div>
              </div>
            </CardContent>
            {isPipelineLoading ? (
              <CardFooter className="pt-3 border-t border-slate-200 dark:border-slate-700">
                <Skeleton className="h-5 w-full" />
              </CardFooter>
            ) : pipeline?.PipelineJobQueues && pipeline.PipelineJobQueues.length > 0 ? (
              <CardFooter className="pt-3 border-t border-slate-200 dark:border-slate-700 text-sm text-slate-500 dark:text-slate-400">
                Last job execution: {formatDate(pipeline.PipelineJobQueues[0].created_at)}
              </CardFooter>
            ) : (
              <CardFooter className="pt-3 border-t border-slate-200 dark:border-slate-700 text-sm text-slate-500 dark:text-slate-400">
                No job executions yet
              </CardFooter>
            )}
          </Card>
          
          {/* Tabs */}
          <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full grid grid-cols-3 mb-2">
              <TabsTrigger value="overview" className="text-sm sm:text-base">Flow</TabsTrigger>
              <TabsTrigger value="jobs" className="text-sm sm:text-base">Jobs</TabsTrigger>
              <TabsTrigger value="logs" className="text-sm sm:text-base">Logs</TabsTrigger>
            </TabsList>
            
            {/* Overview Tab */}
            <TabsContent value="overview" className="mt-6">
              <PipelineFlow
                pipelineUnits={pipelineUnits || []}
                pipelineJobs={jobs || []}
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
        </>
      )}
    </div>
  );
}
