import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Play, Clock, AlertCircle, CheckCircle2, X, RefreshCw, StopCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
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
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow, differenceInMinutes } from "date-fns";
import { es } from "date-fns/locale";
import { Link } from "wouter";
import { cn } from "@/lib/utils";
import { useNotifications } from "@/context/NotificationContext";
import { useEffect, useRef } from "react";
import { executeQuery } from "@/lib/hasura-client";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const RUNNING_JOBS_QUERY = `
  query GetRunningJobs {
    merlin_agent_PipelineJobQueue(
      where: { running: { _eq: true } }
      order_by: { created_at: desc }
      limit: 20
    ) {
      id
      pipeline_id
      running
      completed
      aborted
      created_at
      updated_at
      Pipeline {
        id
        name
      }
    }
  }
`;

const RECENT_JOBS_QUERY = `
  query GetRecentJobs {
    merlin_agent_PipelineJobQueue(
      order_by: { created_at: desc }
      limit: 15
    ) {
      id
      pipeline_id
      running
      completed
      aborted
      created_at
      updated_at
      Pipeline {
        id
        name
      }
    }
  }
`;

const CANCEL_JOB_MUTATION = `
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
`;

interface PipelineJob {
  id: string;
  pipeline_id: string;
  running: boolean;
  completed: boolean;
  aborted: boolean;
  created_at: string;
  updated_at: string;
  Pipeline?: {
    id: string;
    name: string;
  };
}

type TimeStatus = "normal" | "warning" | "critical";

function getTimeStatus(createdAt: string): TimeStatus {
  const minutes = differenceInMinutes(new Date(), new Date(createdAt));
  if (minutes >= 60) return "critical";
  if (minutes >= 15) return "warning";
  return "normal";
}

function getElapsedText(createdAt: string): string {
  const minutes = differenceInMinutes(new Date(), new Date(createdAt));
  if (minutes < 1) return "< 1 min";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainingMin = minutes % 60;
  if (hours < 24) return `${hours}h ${remainingMin}m`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
}

function getTimeStatusColor(status: TimeStatus) {
  switch (status) {
    case "critical": return "text-red-600 dark:text-red-400";
    case "warning": return "text-amber-600 dark:text-amber-400";
    default: return "text-blue-600 dark:text-blue-400";
  }
}

function getTimeStatusBg(status: TimeStatus) {
  switch (status) {
    case "critical": return "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800";
    case "warning": return "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800";
    default: return "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800";
  }
}

function getTimeStatusIcon(status: TimeStatus) {
  switch (status) {
    case "critical": return <AlertCircle className="h-3.5 w-3.5 text-red-500" />;
    case "warning": return <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />;
    default: return <Clock className="h-3.5 w-3.5 text-blue-500" />;
  }
}

function JobStatusBadge({ job }: { job: PipelineJob }) {
  if (job.running) {
    return (
      <Badge variant="default" className="bg-blue-500">
        <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
        Running
      </Badge>
    );
  }
  if (job.aborted) {
    return (
      <Badge variant="destructive">
        <AlertCircle className="h-3 w-3 mr-1" />
        Aborted
      </Badge>
    );
  }
  if (job.completed) {
    return (
      <Badge variant="default" className="bg-green-500">
        <CheckCircle2 className="h-3 w-3 mr-1" />
        Completed
      </Badge>
    );
  }
  return (
    <Badge variant="secondary">
      <Clock className="h-3 w-3 mr-1" />
      Queued
    </Badge>
  );
}

function RunningJobItem({ job, onCancel }: { job: PipelineJob; onCancel: (job: PipelineJob) => void }) {
  const timeStatus = getTimeStatus(job.created_at);
  const elapsed = getElapsedText(job.created_at);

  return (
    <div className={cn("p-3 border-b last:border-b-0 border", getTimeStatusBg(timeStatus))}>
      <div className="flex items-start justify-between gap-2">
        <Link href={`/jobs/${job.id}`}>
          <div className="flex-1 min-w-0 cursor-pointer hover:opacity-80">
            <p className="font-medium text-sm truncate">
              {job.Pipeline?.name || "Unknown Pipeline"}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <div className={cn("flex items-center gap-1 text-xs font-medium", getTimeStatusColor(timeStatus))}>
                {getTimeStatusIcon(timeStatus)}
                <span>{elapsed}</span>
              </div>
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(job.created_at), { addSuffix: true, locale: es })}
              </span>
            </div>
          </div>
        </Link>
        <div className="flex items-center gap-2 flex-shrink-0">
          <RefreshCw className="h-3.5 w-3.5 animate-spin text-blue-500" />
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onCancel(job);
            }}
            title="Cancelar job"
          >
            <StopCircle className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function RecentJobItem({ job }: { job: PipelineJob }) {
  return (
    <Link href={`/jobs/${job.id}`}>
      <div className="p-3 border-b last:border-b-0 hover:bg-muted/50 transition-colors cursor-pointer">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">
              {job.Pipeline?.name || "Unknown Pipeline"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {formatDistanceToNow(new Date(job.created_at), { addSuffix: true, locale: es })}
            </p>
          </div>
          <JobStatusBadge job={job} />
        </div>
      </div>
    </Link>
  );
}

async function fetchJobs(query: string): Promise<PipelineJob[]> {
  try {
    const response = await fetch('/api/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    });
    if (!response.ok) {
      console.error('Failed to fetch jobs:', response.statusText);
      return [];
    }
    const result = await response.json();
    if (result.errors) {
      console.error('GraphQL errors:', result.errors);
      return [];
    }
    return result.data?.merlin_agent_PipelineJobQueue || [];
  } catch (error) {
    console.error('Error fetching jobs:', error);
    return [];
  }
}

export function RunningPipelinesPanel() {
  const { addNotification } = useNotifications();
  const { toast } = useToast();
  const previousJobsRef = useRef<Map<string, PipelineJob>>(new Map());
  const [cancellingJob, setCancellingJob] = useState<PipelineJob | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  const { data: runningJobs = [], isLoading: runningLoading } = useQuery<PipelineJob[]>({
    queryKey: ['/api/graphql', 'running-jobs'],
    queryFn: () => fetchJobs(RUNNING_JOBS_QUERY),
    refetchInterval: 5000,
  });

  const { data: recentJobs = [], isLoading: recentLoading } = useQuery<PipelineJob[]>({
    queryKey: ['/api/graphql', 'recent-jobs'],
    queryFn: () => fetchJobs(RECENT_JOBS_QUERY),
    refetchInterval: 10000,
  });

  useEffect(() => {
    const currentJobs = new Map<string, PipelineJob>();
    recentJobs.forEach(job => {
      currentJobs.set(job.id, job);
    });

    currentJobs.forEach((currentJob, id) => {
      const prevJob = previousJobsRef.current.get(id);
      
      if (prevJob && prevJob.running && !currentJob.running) {
        const pipelineName = currentJob.Pipeline?.name || "Pipeline";
        
        if (currentJob.completed && !currentJob.aborted) {
          addNotification({
            type: "success",
            title: "Pipeline Completed",
            description: `"${pipelineName}" finished successfully`,
            entityType: "job",
            entityId: currentJob.id
          });
        } else if (currentJob.aborted) {
          addNotification({
            type: "error",
            title: "Pipeline Aborted",
            description: `"${pipelineName}" was aborted`,
            entityType: "job",
            entityId: currentJob.id
          });
        }
      }
    });

    previousJobsRef.current = currentJobs;
  }, [recentJobs, addNotification]);

  const handleCancelJob = async () => {
    if (!cancellingJob) return;
    
    setIsCancelling(true);
    try {
      const result = await executeQuery(CANCEL_JOB_MUTATION, { id: cancellingJob.id });
      
      if (result.errors) {
        throw new Error(result.errors[0].message);
      }

      toast({
        title: "Job cancelado",
        description: `El job de "${cancellingJob.Pipeline?.name || 'pipeline'}" fue cancelado correctamente.`,
      });

      queryClient.invalidateQueries({ queryKey: ['/api/graphql', 'running-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['/api/graphql', 'recent-jobs'] });
    } catch (error: any) {
      toast({
        title: "Error al cancelar",
        description: error.message || "No se pudo cancelar el job.",
        variant: "destructive",
      });
    } finally {
      setIsCancelling(false);
      setCancellingJob(null);
    }
  };

  const runningCount = runningJobs.length;
  const isLoading = runningLoading || recentLoading;

  const worstStatus: TimeStatus = runningJobs.reduce<TimeStatus>((worst, job) => {
    const status = getTimeStatus(job.created_at);
    if (status === "critical") return "critical";
    if (status === "warning" && worst !== "critical") return "warning";
    return worst;
  }, "normal");

  const getBadgeColor = () => {
    switch (worstStatus) {
      case "critical": return "bg-red-500";
      case "warning": return "bg-amber-500";
      default: return "bg-blue-500 animate-pulse";
    }
  };

  return (
    <>
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="relative">
            <Play className="h-5 w-5" />
            {runningCount > 0 && (
              <Badge 
                variant="default" 
                className={cn(
                  "absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs",
                  getBadgeColor()
                )}
              >
                {runningCount > 9 ? "9+" : runningCount}
              </Badge>
            )}
          </Button>
        </SheetTrigger>
        <SheetContent>
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Play className="h-5 w-5" />
              Pipeline Executions
            </SheetTitle>
          </SheetHeader>
          
          <div className="mt-4 space-y-4">
            {runningCount > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Running ({runningCount})
                </h4>
                <div className="rounded-lg overflow-hidden space-y-1">
                  {runningJobs.map(job => (
                    <RunningJobItem 
                      key={job.id} 
                      job={job} 
                      onCancel={(j) => setCancellingJob(j)}
                    />
                  ))}
                </div>
              </div>
            )}
            
            <div>
              <h4 className="text-sm font-medium mb-2">Recent Jobs</h4>
              <ScrollArea className="h-[400px]">
                {isLoading ? (
                  <div className="p-4 text-center text-muted-foreground text-sm">
                    Loading...
                  </div>
                ) : recentJobs.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground text-sm">
                    No recent jobs
                  </div>
                ) : (
                  <div className="border rounded-lg">
                    {recentJobs.map(job => (
                      <RecentJobItem key={job.id} job={job} />
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!cancellingJob} onOpenChange={(open) => !open && setCancellingJob(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Cancelar este job?</AlertDialogTitle>
            <AlertDialogDescription>
              Vas a cancelar el job de <strong>"{cancellingJob?.Pipeline?.name || 'pipeline'}"</strong>.
              {cancellingJob && (
                <span className="block mt-1">
                  Lleva ejecutándose {getElapsedText(cancellingJob.created_at)}.
                </span>
              )}
              <span className="block mt-2 text-amber-600 dark:text-amber-400">
                El job se marcará como abortado (completed: true, running: false, aborted: true).
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
    </>
  );
}
