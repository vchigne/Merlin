import { Link } from "wouter";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { GitBranch, Calendar, Link2, Bot, AlertTriangle, Play } from "lucide-react";
import { useExecutePipeline } from "@/hooks/use-execute-pipeline";

interface PipelineCardProps {
  pipeline: {
    id: string;
    name: string;
    description?: string;
    abort_on_error?: boolean;
    agent_passport_id?: string;
    created_at: string;
    updated_at: string;
    disposable?: boolean;
    AgentPassport?: {
      name: string;
    };
    PipelineJobQueues?: {
      id: string;
      completed: boolean;
      running: boolean;
      aborted: boolean;
      created_at: string;
    }[];
  };
}

export default function PipelineCard({ pipeline }: PipelineCardProps) {
  const { executePipeline, isExecuting } = useExecutePipeline();
  
  // Compute last execution status
  const lastJob = pipeline.PipelineJobQueues?.[0];
  let status = "none";
  let statusLabel = "Never Run";
  
  if (lastJob) {
    if (lastJob.aborted) {
      status = "error";
      statusLabel = "Failed";
    } else if (lastJob.completed) {
      status = "success";
      statusLabel = "Completed";
    } else if (lastJob.running) {
      status = "running";
      statusLabel = "Running";
    } else {
      status = "pending";
      statusLabel = "Pending";
    }
  }

  // Get status badge style
  const getStatusClass = () => {
    switch (status) {
      case "success":
        return "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400";
      case "running":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400";
      case "error":
        return "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400";
      case "pending":
        return "bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400";
      default:
        return "bg-slate-100 text-slate-700 dark:bg-slate-900/20 dark:text-slate-400";
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow duration-200">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <Link href={`/pipelines/${pipeline.id}`} className="text-lg font-medium hover:text-primary-600 transition-colors">
              {pipeline.name || `Pipeline-${pipeline.id.substring(0, 8)}`}
          </Link>
          {pipeline.disposable && (
            <Badge variant="outline" className="bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400 border-orange-200 dark:border-orange-800">
              Disposable
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {pipeline.description && (
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-3 line-clamp-2">
            {pipeline.description}
          </p>
        )}
        
        <div className="space-y-2">
          {pipeline.agent_passport_id && (
            <div className="flex items-center text-xs">
              <Bot className="h-3.5 w-3.5 mr-1.5 text-slate-500 dark:text-slate-400" />
              <Link href={`/agents/${pipeline.agent_passport_id}`} className="text-primary-600 dark:text-primary-400 hover:underline">
                  {pipeline.AgentPassport?.name || `Agent-${pipeline.agent_passport_id.substring(0, 8)}`}
              </Link>
            </div>
          )}
          
          <div className="flex items-center text-xs">
            <Calendar className="h-3.5 w-3.5 mr-1.5 text-slate-500 dark:text-slate-400" />
            <span className="text-slate-700 dark:text-slate-300">
              Created: {formatDate(pipeline.created_at)}
            </span>
          </div>
          
          {pipeline.abort_on_error && (
            <div className="flex items-center text-xs">
              <AlertTriangle className="h-3.5 w-3.5 mr-1.5 text-amber-500" />
              <span className="text-slate-700 dark:text-slate-300">
                Aborts on error
              </span>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="pt-0 flex justify-between items-center">
        <Badge className={`flex items-center space-x-1 ${getStatusClass()}`}>
          <GitBranch className="h-3 w-3 mr-1" />
          <span>{statusLabel}</span>
        </Badge>
        
        <div className="flex items-center gap-2">
          {lastJob && (
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Last run: {formatDate(lastJob.created_at)}
            </span>
          )}
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2"
            disabled={isExecuting || status === "running"}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              executePipeline(pipeline.id, pipeline.name);
            }}
          >
            <Play className="h-3 w-3 mr-1" />
            Run
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
