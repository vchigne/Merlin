import { useQuery } from "@tanstack/react-query";
import { Play, Clock, AlertCircle, CheckCircle2, X, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";
import { Link } from "wouter";
import { cn } from "@/lib/utils";
import { useNotifications } from "@/context/NotificationContext";
import { useEffect, useRef } from "react";

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

function JobItem({ job }: { job: PipelineJob }) {
  return (
    <Link href={`/jobs/${job.id}`}>
      <div className="p-3 border-b last:border-b-0 hover:bg-muted/50 transition-colors cursor-pointer">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">
              {job.Pipeline?.name || "Unknown Pipeline"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}
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
  const previousJobsRef = useRef<Map<string, PipelineJob>>(new Map());

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

  const runningCount = runningJobs.length;
  const isLoading = runningLoading || recentLoading;

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Play className="h-5 w-5" />
          {runningCount > 0 && (
            <Badge 
              variant="default" 
              className={cn(
                "absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs",
                "bg-blue-500 animate-pulse"
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
              <div className="border rounded-lg">
                {runningJobs.map(job => (
                  <JobItem key={job.id} job={job} />
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
                    <JobItem key={job.id} job={job} />
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
