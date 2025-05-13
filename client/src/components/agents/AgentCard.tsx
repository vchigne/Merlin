import { Link } from "wouter";
import { formatRelativeTime, determineAgentStatus } from "@/lib/utils";
import { 
  Check, 
  AlertTriangle, 
  XCircle, 
  Clock,
  Server,
  Wifi
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
  };
}

export default function AgentCard({ agent }: AgentCardProps) {
  const lastPing = agent.AgentPassportPing?.[0]?.last_ping_at;
  const hostname = agent.AgentPassportPing?.[0]?.hostname;
  const ips = agent.AgentPassportPing?.[0]?.ips;
  
  const status = determineAgentStatus(!!agent.is_healthy, lastPing);
  
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
  
  return (
    <Card className="hover:shadow-md transition-shadow duration-200">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <Link href={`/agents/${agent.id}`}>
            <a className="text-lg font-medium hover:text-primary-600 transition-colors">
              {agent.name || `Agent-${agent.id.substring(0, 8)}`}
            </a>
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
        
        <div className="space-y-2">
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
