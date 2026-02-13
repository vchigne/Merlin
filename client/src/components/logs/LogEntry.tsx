import { useState } from "react";
import { formatDate, formatFriendlyDate } from "@/lib/utils";
import { 
  ChevronDown, 
  ChevronRight, 
  AlertTriangle, 
  CheckCircle, 
  Info, 
  XCircle,
  Terminal, 
  Clock, 
  Server,
  User,
  FileText,
  ExternalLink
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Link } from "wouter";

interface LogEntryProps {
  log: {
    id: number | string;
    pipeline_job_id?: string;
    pipeline_unit_id?: string;
    date?: string;
    created_at: string;
    level?: string;
    message?: string;
    callsite?: string;
    exception?: string;
    exception_message?: string;
    exception_stack_trace?: string;
    logs?: string;
    warnings?: string;
    errors?: string;
    milliseconds?: number;
    PipelineJobQueue?: {
      id?: string;
      Pipeline?: {
        id: string;
        name: string;
      };
      started_by_agent?: string;
    };
    PipelineUnit?: {
      id: string;
      comment?: string;
    };
  };
  expanded?: boolean;
}

export default function LogEntry({ log, expanded = false }: LogEntryProps) {
  const [isOpen, setIsOpen] = useState(expanded);

  // Determine the log level
  const getLogLevel = () => {
    if (log.level) return log.level;
    if (log.errors) return "ERROR";
    if (log.warnings) return "WARN";
    return "INFO";
  };

  const level = getLogLevel();

  // Get level badge
  const getLevelBadge = () => {
    switch (level) {
      case "ERROR":
      case "FATAL":
        return (
          <Badge variant="destructive" className="flex items-center space-x-1">
            <XCircle className="h-3 w-3 mr-1" />
            <span>{level}</span>
          </Badge>
        );
      case "WARN":
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 border-amber-200 dark:border-amber-800 flex items-center space-x-1">
            <AlertTriangle className="h-3 w-3 mr-1" />
            <span>{level}</span>
          </Badge>
        );
      case "INFO":
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 border-blue-200 dark:border-blue-800 flex items-center space-x-1">
            <Info className="h-3 w-3 mr-1" />
            <span>{level}</span>
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 border-green-200 dark:border-green-800 flex items-center space-x-1">
            <CheckCircle className="h-3 w-3 mr-1" />
            <span>SUCCESS</span>
          </Badge>
        );
    }
  };

  // Get log message
  const getMessage = () => {
    if (log.message) return log.message;
    if (log.errors) return log.errors;
    if (log.warnings) return log.warnings;
    if (log.logs) return log.logs;
    return "No message";
  };

  // Format execution time
  const formatExecutionTime = (milliseconds?: number) => {
    if (!milliseconds) return null;
    if (milliseconds < 1000) return `${milliseconds}ms`;
    return `${(milliseconds / 1000).toFixed(2)}s`;
  };

  const executionTime = formatExecutionTime(log.milliseconds);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="border border-slate-200 dark:border-slate-700 rounded-md mb-3">
      <div className="p-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50" onClick={() => setIsOpen(!isOpen)}>
        <div className="flex">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="p-0 h-6 w-6 mt-1 flex-shrink-0">
              {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
          
          <div className="flex-1 ml-2">
            <div className="flex flex-wrap gap-2 items-start">
              <div className="flex-shrink-0 mt-1">{getLevelBadge()}</div>
              <div className="flex-1 text-sm font-medium text-slate-900 dark:text-slate-100 break-words max-w-full whitespace-pre-wrap">
                {getMessage()}
              </div>
            </div>
            
            <div className="flex flex-wrap gap-3 text-xs text-slate-500 dark:text-slate-400 mt-2 group">
              <span className="flex items-center">
                <Clock className="h-3 w-3 mr-1" />
                {formatFriendlyDate(log.date || log.created_at)}
                <span className="tooltip-date hidden group-hover:inline ml-1 text-xs text-slate-400">
                  {formatDate(log.date || log.created_at, "yyyy-MM-dd HH:mm:ss")}
                </span>
              </span>
              
              {executionTime && (
                <span className="flex items-center">
                  <Terminal className="h-3 w-3 mr-1" />
                  {executionTime}
                </span>
              )}
              
              {/* No podemos acceder a PipelineJobQueue directamente */}
              {log.pipeline_job_id && (
                <span className="flex items-center">
                  <Server className="h-3 w-3 mr-1" />
                  <span className="text-slate-500">{log.pipeline_job_id.substring(0, 8)}</span>
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
      
      <CollapsibleContent>
        <div className="p-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
          <div className="space-y-3">
            {/* Información del Job y Pipeline */}
            {(log.PipelineJobQueue?.Pipeline || log.pipeline_job_id) && (
              <div>
                <h4 className="text-xs font-medium text-slate-500 dark:text-slate-400">Pipeline / Job</h4>
                <div className="flex items-center gap-2 mt-1">
                  <FileText className="h-4 w-4 text-blue-500" />
                  {log.PipelineJobQueue?.Pipeline && (
                    <p className="text-sm text-slate-700 dark:text-slate-300">
                      {log.PipelineJobQueue.Pipeline.name}
                      {' - '}
                      <Link to={`/jobs/${log.pipeline_job_id}`} className="text-blue-500 hover:underline inline-flex items-center">
                        Ver Job <ExternalLink className="h-3 w-3 ml-1" />
                      </Link>
                    </p>
                  )}
                  {!log.PipelineJobQueue?.Pipeline && log.pipeline_job_id && (
                    <p className="text-sm text-slate-700 dark:text-slate-300">
                      <Link to={`/jobs/${log.pipeline_job_id}`} className="text-blue-500 hover:underline inline-flex items-center">
                        Job {log.pipeline_job_id.substring(0, 8)} <ExternalLink className="h-3 w-3 ml-1" />
                      </Link>
                    </p>
                  )}
                </div>
              </div>
            )}
            
            {/* Información del Agente */}
            {log.PipelineJobQueue?.started_by_agent && (
              <div>
                <h4 className="text-xs font-medium text-slate-500 dark:text-slate-400">Agente</h4>
                <div className="flex items-center gap-2 mt-1">
                  <User className="h-4 w-4 text-green-500" />
                  <p className="text-sm text-slate-700 dark:text-slate-300">
                    ID del Agente: {log.PipelineJobQueue.started_by_agent.substring(0, 8)}
                  </p>
                </div>
              </div>
            )}
            
            {/* Unit ID */}
            {log.pipeline_unit_id && (
              <div>
                <h4 className="text-xs font-medium text-slate-500 dark:text-slate-400">Pipeline Unit ID</h4>
                <p className="text-sm text-slate-700 dark:text-slate-300">
                  {log.pipeline_unit_id}
                </p>
              </div>
            )}
            
            {log.callsite && (
              <div>
                <h4 className="text-xs font-medium text-slate-500 dark:text-slate-400">Callsite</h4>
                <p className="text-sm font-mono text-slate-700 dark:text-slate-300">
                  {log.callsite}
                </p>
              </div>
            )}
            
            {log.exception && (
              <div>
                <h4 className="text-xs font-medium text-slate-500 dark:text-slate-400">Exception</h4>
                <p className="text-sm text-red-600 dark:text-red-400">
                  {log.exception}: {log.exception_message}
                </p>
              </div>
            )}
            
            {log.exception_stack_trace && (
              <div>
                <h4 className="text-xs font-medium text-slate-500 dark:text-slate-400">Stack Trace</h4>
                <pre className="text-xs font-mono bg-slate-100 dark:bg-slate-900 p-2 rounded-md overflow-x-auto text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                  {log.exception_stack_trace}
                </pre>
              </div>
            )}
            
            {log.logs && !log.message && (
              <div>
                <h4 className="text-xs font-medium text-slate-500 dark:text-slate-400">Logs</h4>
                <pre className="text-xs font-mono bg-slate-100 dark:bg-slate-900 p-2 rounded-md overflow-x-auto text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                  {log.logs}
                </pre>
              </div>
            )}
            
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Log ID: {log.id} {log.pipeline_job_id && `• Job ID: ${log.pipeline_job_id}`}
            </div>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
