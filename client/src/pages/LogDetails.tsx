import { useRoute, Link } from "wouter";
import { useLogEntry } from "@/hooks/use-log-entries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { 
  ArrowLeft, AlertCircle, AlertTriangle, Info, Bug, FileText, 
  Clock, Workflow, Server, Copy, Check, Bot, Play, CheckCircle, 
  XCircle, Loader2, Settings
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import { useState } from "react";

function getLevelConfig(level: string) {
  const normalizedLevel = (level || "INFO").toUpperCase();
  switch (normalizedLevel) {
    case "ERROR":
    case "FATAL":
      return { 
        color: "bg-red-500/10 text-red-500 border-red-500/20", 
        icon: AlertCircle,
        label: normalizedLevel
      };
    case "WARN":
    case "WARNING":
      return { 
        color: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20", 
        icon: AlertTriangle,
        label: "WARNING"
      };
    case "DEBUG":
      return { 
        color: "bg-purple-500/10 text-purple-500 border-purple-500/20", 
        icon: Bug,
        label: "DEBUG"
      };
    case "TRACE":
      return { 
        color: "bg-gray-500/10 text-gray-500 border-gray-500/20", 
        icon: FileText,
        label: "TRACE"
      };
    default:
      return { 
        color: "bg-blue-500/10 text-blue-500 border-blue-500/20", 
        icon: Info,
        label: "INFO"
      };
  }
}

function getJobStatus(job: any) {
  if (!job) return { label: "Unknown", color: "bg-gray-500/10 text-gray-500", icon: Info };
  if (job.aborted) return { label: "Aborted", color: "bg-red-500/10 text-red-500", icon: XCircle };
  if (job.completed) return { label: "Completed", color: "bg-green-500/10 text-green-500", icon: CheckCircle };
  if (job.running) return { label: "Running", color: "bg-blue-500/10 text-blue-500", icon: Loader2 };
  return { label: "Pending", color: "bg-yellow-500/10 text-yellow-500", icon: Clock };
}

export default function LogDetails() {
  const [, params] = useRoute("/logs/:id");
  const logId = params?.id;
  const [copiedMessage, setCopiedMessage] = useState(false);
  const [copiedException, setCopiedException] = useState(false);
  
  const { data: log, isLoading, error } = useLogEntry(logId || "");
  
  const copyMessageToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMessage(true);
    setTimeout(() => setCopiedMessage(false), 2000);
  };
  
  const copyExceptionToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedException(true);
    setTimeout(() => setCopiedException(false), 2000);
  };
  
  if (isLoading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-8 w-64" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Card>
          <CardContent className="p-6 space-y-4">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }
  
  if (error || !log) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/logs">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Log Not Found</h1>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 text-muted-foreground">
              <AlertCircle className="h-5 w-5" />
              <p>The requested log entry could not be found or an error occurred.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  const levelConfig = getLevelConfig(log.level);
  const LevelIcon = levelConfig.icon;
  
  const job = log.PipelineJobQueue;
  const pipeline = job?.Pipeline;
  const agent = log.agent;
  const jobStatus = getJobStatus(job);
  const JobStatusIcon = jobStatus.icon;
  
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/logs">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-bold">Log Entry #{log.id}</h1>
          <Badge className={levelConfig.color}>
            <LevelIcon className="h-3 w-3 mr-1" />
            {levelConfig.label}
          </Badge>
        </div>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Date & Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">
              {formatDate(log.date || log.created_at)}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Workflow className="h-4 w-4" />
              Pipeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pipeline?.id ? (
              <Link href={`/pipelines/${pipeline.id}`}>
                <span className="text-lg font-semibold text-primary hover:underline cursor-pointer block truncate">
                  {pipeline.name || "Unnamed Pipeline"}
                </span>
              </Link>
            ) : (
              <p className="text-lg font-semibold text-muted-foreground">N/A</p>
            )}
            {pipeline?.id && (
              <p className="text-xs text-muted-foreground mt-1 font-mono">
                ID: {pipeline.id}
              </p>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Bot className="h-4 w-4" />
              Agent
            </CardTitle>
          </CardHeader>
          <CardContent>
            {agent?.id ? (
              <Link href={`/agents/${agent.id}`}>
                <span className="text-lg font-semibold text-primary hover:underline cursor-pointer block truncate">
                  {agent.name || "Unnamed Agent"}
                </span>
              </Link>
            ) : job?.started_by_agent ? (
              <Link href={`/agents/${job.started_by_agent}`}>
                <span className="text-sm font-mono text-primary hover:underline cursor-pointer block truncate">
                  {job.started_by_agent}
                </span>
              </Link>
            ) : (
              <p className="text-lg font-semibold text-muted-foreground">N/A</p>
            )}
            {agent?.id && (
              <p className="text-xs text-muted-foreground mt-1 font-mono">
                ID: {agent.id}
              </p>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Play className="h-4 w-4" />
              Job Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Badge className={jobStatus.color}>
                <JobStatusIcon className="h-3 w-3 mr-1" />
                {jobStatus.label}
              </Badge>
            </div>
            {log.pipeline_job_id && (
              <Link href={`/jobs/${log.pipeline_job_id}`}>
                <p className="text-xs text-primary hover:underline mt-2 font-mono cursor-pointer truncate">
                  {log.pipeline_job_id}
                </p>
              </Link>
            )}
          </CardContent>
        </Card>
      </div>
      
      {log.pipeline_unit_id && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Pipeline Unit
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground font-mono">
              ID: {log.pipeline_unit_id}
            </p>
          </CardContent>
        </Card>
      )}
      
      {pipeline?.description && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pipeline Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{pipeline.description}</p>
          </CardContent>
        </Card>
      )}
      
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Message
            </CardTitle>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => copyMessageToClipboard(log.message || "")}
            >
              {copiedMessage ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
              {copiedMessage ? "Copied!" : "Copy"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <pre className="whitespace-pre-wrap font-mono text-sm bg-muted p-4 rounded-lg overflow-x-auto">
            {log.message || "No message content"}
          </pre>
        </CardContent>
      </Card>
      
      {log.callsite && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bug className="h-5 w-5" />
              Callsite
            </CardTitle>
          </CardHeader>
          <CardContent>
            <code className="text-sm bg-muted px-3 py-2 rounded block overflow-x-auto">
              {log.callsite}
            </code>
          </CardContent>
        </Card>
      )}
      
      {(log.exception || log.exception_message || log.exception_stack_trace) && (
        <Card className="border-red-500/30">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-red-500">
                <AlertCircle className="h-5 w-5" />
                Exception Details
              </CardTitle>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => copyExceptionToClipboard(
                  `${log.exception || ""}\n${log.exception_message || ""}\n\n${log.exception_stack_trace || ""}`
                )}
              >
                {copiedException ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
                {copiedException ? "Copied!" : "Copy All"}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {log.exception && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Exception Type</p>
                <code className="text-sm bg-red-500/10 text-red-500 px-3 py-2 rounded block">
                  {log.exception}
                </code>
              </div>
            )}
            
            {log.exception_message && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Exception Message</p>
                <pre className="whitespace-pre-wrap font-mono text-sm bg-red-500/10 text-red-400 p-3 rounded-lg">
                  {log.exception_message}
                </pre>
              </div>
            )}
            
            {log.exception_stack_trace && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Stack Trace</p>
                <pre className="whitespace-pre-wrap font-mono text-xs bg-muted p-4 rounded-lg overflow-x-auto max-h-96 overflow-y-auto">
                  {log.exception_stack_trace}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>
      )}
      
      {job && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Additional Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 text-sm">
              {job?.created_at && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Job Created:</span>
                  <span>{formatDate(job.created_at)}</span>
                </div>
              )}
              {job?.updated_at && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Job Updated:</span>
                  <span>{formatDate(job.updated_at)}</span>
                </div>
              )}
              {job?.started_by_agent && !agent && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Started By Agent ID:</span>
                  <Link href={`/agents/${job.started_by_agent}`}>
                    <span className="font-mono text-xs text-primary hover:underline cursor-pointer">
                      {job.started_by_agent}
                    </span>
                  </Link>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
