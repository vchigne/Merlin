import { Link } from "wouter";
import { formatRelativeTime, determineAgentStatus } from "@/lib/utils";
import { 
  Check, 
  AlertTriangle, 
  XCircle, 
  Clock,
  Server,
  Wifi,
  BarChart2,
  Activity,
  Signal
} from "lucide-react";
import { 
  Card, 
  CardContent, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";

interface AgentCardProps {
  agent: {
    id: string;
    name: string;
    description?: string;
    is_testing?: boolean;
    enabled?: boolean;
    is_healthy?: boolean;
    AgentPassportPing?: {
      last_ping_at: string;
      hostname?: string;
      ips?: string;
    }[];
    PipelineJobQueues?: {
      id: string;
      completed: boolean;
      running: boolean;
      aborted: boolean;
      created_at: string;
    }[];
  };
}

export default function AgentCard({ agent }: AgentCardProps) {
  const lastPing = agent.AgentPassportPing?.[0]?.last_ping_at;
  const hostname = agent.AgentPassportPing?.[0]?.hostname;
  const ips = agent.AgentPassportPing?.[0]?.ips;
  
  // Debug: Ver los datos del agente en la consola
  console.log('AgentCard - agent data:', {
    id: agent.id,
    name: agent.name,
    is_healthy: agent.is_healthy,
    AgentPassportPing: agent.AgentPassportPing,
    PipelineJobQueues: agent.PipelineJobQueues
  });
  
  // Utilizamos el nuevo algoritmo avanzado para determinar el estado
  const agentHealthInfo = determineAgentStatus(agent);
  console.log('AgentCard - health info:', agentHealthInfo);
  const status = agentHealthInfo.status;
  
  const getStatusIcon = () => {
    switch (status) {
      case 'healthy':
        return <Check className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-slate-400" />;
    }
  };
  
  const getStatusClass = () => {
    switch (status) {
      case 'healthy':
        return 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400';
      case 'warning':
        return 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400';
      case 'error':
        return 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400';
      default:
        return 'bg-slate-100 text-slate-700 dark:bg-slate-900/20 dark:text-slate-400';
    }
  };
  
  const getMetricColor = (value: number) => {
    if (value >= 80) return "text-green-600 dark:text-green-400";
    if (value >= 50) return "text-amber-600 dark:text-amber-400";
    return "text-red-600 dark:text-red-400";
  };
  
  const getProgressColor = (value: number) => {
    if (value >= 80) return "bg-green-500";
    if (value >= 50) return "bg-amber-500";
    return "bg-red-500";
  };
  
  const getPingTimingText = (minutes: number) => {
    if (minutes < 0) return "No data";
    
    if (minutes < 5) {
      return "< 5 min"; // Tiempo excelente
    } else if (minutes < 60) {
      return `${Math.round(minutes)} min`; // En minutos
    } else {
      const hours = minutes / 60;
      if (hours < 24) {
        return `${Math.round(hours * 10) / 10} h`; // En horas, con un decimal
      } else {
        const days = hours / 24;
        return `${Math.round(days * 10) / 10} d`; // En días, con un decimal
      }
    }
  };
  
  return (
    <Card className="hover:shadow-md transition-shadow duration-200">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <Link href={`/agents/${agent.id}`} className="text-lg font-medium hover:text-primary-600 transition-colors">
            {agent.name || `Agent-${agent.id.substring(0, 8)}`}
          </Link>
          <div className="flex space-x-2">
            {agent.is_testing && (
              <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 border-blue-200 dark:border-blue-800">
                Testing
              </Badge>
            )}
            {!agent.enabled && (
              <Badge variant="outline" className="bg-slate-50 text-slate-700 dark:bg-slate-900/20 dark:text-slate-400 border-slate-200 dark:border-slate-800">
                Disabled
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {agent.description && (
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-3 line-clamp-2">
            {agent.description}
          </p>
        )}
        
        {/* Información del sistema */}
        <div className="space-y-2 mb-3">
          {hostname && (
            <div className="flex items-center text-xs">
              <Server className="h-3.5 w-3.5 mr-1.5 text-slate-500 dark:text-slate-400" />
              <span className="text-slate-700 dark:text-slate-300">{hostname}</span>
            </div>
          )}
          
          {ips && (
            <div className="flex items-center text-xs">
              <Wifi className="h-3.5 w-3.5 mr-1.5 text-slate-500 dark:text-slate-400" />
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-slate-700 dark:text-slate-300 truncate max-w-[180px]">
                    {ips}
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{ips}</p>
                </TooltipContent>
              </Tooltip>
            </div>
          )}
        </div>
        
        {/* Separador */}
        <Separator className="my-2" />
        
        {/* KPIs */}
        <div className="grid grid-cols-2 gap-2 mt-3">
          {/* Último Ping */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center">
                <Signal className="h-3.5 w-3.5 mr-1 text-slate-600 dark:text-slate-400" />
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Último ping</span>
              </div>
            </div>
            <div className="text-center">
              <span className={`text-lg font-bold ${agentHealthInfo.pingRatePercent > 0 ? getMetricColor(agentHealthInfo.pingRatePercent) : "text-slate-500"}`}>
                {getPingTimingText(agentHealthInfo.lastPingMinutes)}
              </span>
            </div>
          </div>
          
          {/* Job Success */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center">
                <Activity className="h-3.5 w-3.5 mr-1 text-slate-600 dark:text-slate-400" />
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Job Success</span>
              </div>
            </div>
            <div className="text-center">
              <span className={`text-lg font-bold ${agentHealthInfo.jobSuccessRatePercent > 0 ? getMetricColor(agentHealthInfo.jobSuccessRatePercent) : "text-slate-500"}`}>
                {agentHealthInfo.jobSuccessRatePercent > 0 ? `${agentHealthInfo.jobSuccessRatePercent}%` : "No data"}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="pt-0 flex justify-between">
        <Badge className={`flex items-center space-x-1 ${getStatusClass()}`}>
          {getStatusIcon()}
          <span>
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </span>
        </Badge>
        
        {lastPing && (
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Last ping: {formatRelativeTime(lastPing)}
          </span>
        )}
      </CardFooter>
    </Card>
  );
}
