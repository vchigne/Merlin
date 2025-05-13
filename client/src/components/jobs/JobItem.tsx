import { Link } from "wouter";
import { formatDate, formatRelativeTime } from "@/lib/utils";
import {
  GitBranch,
  Bot,
  Clock,
  CalendarClock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  PlayCircle,
  Ban
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface JobItemProps {
  job: {
    id: string;
    pipeline_id: string;
    started_by_agent?: string;
    completed: boolean;
    running: boolean;
    aborted: boolean;
    created_at: string;
    updated_at: string;
    Pipeline?: {
      name: string;
    };
    AgentPassport?: {
      name: string;
    };
    PipelineJobLogs?: {
      id: string;
      logs: string;
      warnings?: string;
      errors?: string;
    }[];
  };
  compact?: boolean;
}

export default function JobItem({ job, compact = false }: JobItemProps) {
  // Determine job status
  const getJobStatus = () => {
    if (job.aborted) return "error";
    if (job.completed) return "completed";
    if (job.running) return "running";
    return "pending";
  };

  const status = getJobStatus();

  // Get status badge and icon
  const getStatusBadge = () => {
    switch (status) {
      case "completed":
        return {
          label: "Completed",
          icon: <CheckCircle className="h-4 w-4 mr-1" />,
          class: "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 border-green-200 dark:border-green-800"
        };
      case "running":
        return {
          label: "Running",
          icon: <PlayCircle className="h-4 w-4 mr-1 animate-pulse" />,
          class: "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 border-blue-200 dark:border-blue-800"
        };
      case "error":
        return {
          label: "Failed",
          icon: <XCircle className="h-4 w-4 mr-1" />,
          class: "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 border-red-200 dark:border-red-800"
        };
      default:
        return {
          label: "Pending",
          icon: <Clock className="h-4 w-4 mr-1" />,
          class: "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 border-amber-200 dark:border-amber-800"
        };
    }
  };

  const statusBadge = getStatusBadge();

  // Determine if there are warnings or errors
  const hasWarnings = job.PipelineJobLogs?.some(log => log.warnings);
  const hasErrors = job.PipelineJobLogs?.some(log => log.errors);

  if (compact) {
    return (
      <div className="flex items-center justify-between p-3 border border-slate-200 dark:border-slate-700 rounded-md mb-2 hover:bg-slate-50 dark:hover:bg-slate-800/50">
        <div className="flex items-center">
          <Badge variant="outline" className={`mr-3 flex items-center ${statusBadge.class}`}>
            {statusBadge.icon}
            <span>{statusBadge.label}</span>
          </Badge>
          <div>
            <h3 className="text-sm font-medium">
              <Link href={`/jobs/${job.id}`} className="hover:text-primary-600 dark:hover:text-primary-400">
                  Job #{job.id.substring(0, 8)}
              </Link>
            </h3>
            <div className="flex items-center text-xs text-slate-500 dark:text-slate-400 mt-1">
              <GitBranch className="h-3 w-3 mr-1" />
              <Link href={`/pipelines/${job.pipeline_id}`} className="hover:underline text-primary-600 dark:text-primary-400 mr-3">
                  {job.Pipeline?.name || job.pipeline_id.substring(0, 8)}
              </Link>
              {job.started_by_agent && (
                <>
                  <Bot className="h-3 w-3 mr-1" />
                  <Link href={`/agents/${job.started_by_agent}`} className="hover:underline text-primary-600 dark:text-primary-400">
                      {job.AgentPassport?.name || job.started_by_agent.substring(0, 8)}
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center text-xs text-slate-500 dark:text-slate-400">
          <Clock className="h-3 w-3 mr-1" />
          {formatRelativeTime(job.created_at)}
          
          {(hasWarnings || hasErrors) && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="ml-3">
                  {hasErrors ? (
                    <XCircle className="h-4 w-4 text-red-500" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>{hasErrors ? 'Contains errors' : 'Contains warnings'}</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg">
            <Link href={`/jobs/${job.id}`}>
              <a className="hover:text-primary-600 dark:hover:text-primary-400">
                Job #{job.id.substring(0, 8)}
              </a>
            </Link>
          </CardTitle>
          <Badge variant="outline" className={`flex items-center ${statusBadge.class}`}>
            {statusBadge.icon}
            <span>{statusBadge.label}</span>
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center">
            <GitBranch className="h-4 w-4 text-slate-500 dark:text-slate-400 mr-2" />
            <span className="text-sm text-slate-700 dark:text-slate-300 mr-1">Pipeline:</span>
            <Link href={`/pipelines/${job.pipeline_id}`}>
              <a className="text-sm text-primary-600 dark:text-primary-400 hover:underline">
                {job.Pipeline?.name || job.pipeline_id.substring(0, 8)}
              </a>
            </Link>
          </div>
          
          {job.started_by_agent && (
            <div className="flex items-center">
              <Bot className="h-4 w-4 text-slate-500 dark:text-slate-400 mr-2" />
              <span className="text-sm text-slate-700 dark:text-slate-300 mr-1">Agent:</span>
              <Link href={`/agents/${job.started_by_agent}`}>
                <a className="text-sm text-primary-600 dark:text-primary-400 hover:underline">
                  {job.AgentPassport?.name || job.started_by_agent.substring(0, 8)}
                </a>
              </Link>
            </div>
          )}
          
          <div className="flex items-center">
            <CalendarClock className="h-4 w-4 text-slate-500 dark:text-slate-400 mr-2" />
            <span className="text-sm text-slate-700 dark:text-slate-300 mr-1">Created:</span>
            <span className="text-sm">{formatDate(job.created_at)}</span>
            <span className="text-xs text-slate-500 dark:text-slate-400 ml-2">
              ({formatRelativeTime(job.created_at)})
            </span>
          </div>
          
          {job.completed || job.aborted ? (
            <div className="flex items-center">
              <Clock className="h-4 w-4 text-slate-500 dark:text-slate-400 mr-2" />
              <span className="text-sm text-slate-700 dark:text-slate-300 mr-1">Finished:</span>
              <span className="text-sm">{formatDate(job.updated_at)}</span>
              <span className="text-xs text-slate-500 dark:text-slate-400 ml-2">
                ({formatRelativeTime(job.updated_at)})
              </span>
            </div>
          ) : null}
          
          {hasErrors && (
            <div className="flex items-start mt-2">
              <XCircle className="h-4 w-4 text-red-500 mt-0.5 mr-2" />
              <div className="text-sm text-red-600 dark:text-red-400">
                This job encountered errors during execution.
              </div>
            </div>
          )}
          
          {!hasErrors && hasWarnings && (
            <div className="flex items-start mt-2">
              <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 mr-2" />
              <div className="text-sm text-amber-600 dark:text-amber-400">
                This job encountered warnings during execution.
              </div>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex justify-between pt-2">
        <div className="text-xs text-slate-500 dark:text-slate-400">
          ID: {job.id}
        </div>
        <Link href={`/logs?jobId=${job.id}`}>
          <a>
            <Button variant="outline" size="sm">
              View Logs
            </Button>
          </a>
        </Link>
      </CardFooter>
    </Card>
  );
}
