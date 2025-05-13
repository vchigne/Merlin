import { useState } from "react";
import { formatDate, formatRelativeTime, determineAgentStatus } from "@/lib/utils";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription,
  CardFooter
} from "@/components/ui/card";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  RefreshCw,
  Server,
  Cpu,
  HardDrive,
  Globe,
  Calendar,
  Tag,
  Clock,
  CircleAlert,
  AlertCircle
} from "lucide-react";

interface AgentDetailsPanelProps {
  agent: any;
  agentPings?: any[];
  agentLogs?: any[];
  isLoading: boolean;
  onRefresh: () => void;
}

export default function AgentDetailsPanel({
  agent,
  agentPings,
  agentLogs,
  isLoading,
  onRefresh
}: AgentDetailsPanelProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    onRefresh();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const lastPing = agentPings?.[0];
  const status = determineAgentStatus(
    agent?.is_healthy || false, 
    lastPing?.last_ping_at
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-green-500';
      case 'warning': return 'bg-amber-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-slate-400';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle><Skeleton className="h-8 w-64" /></CardTitle>
          <CardDescription><Skeleton className="h-4 w-full" /></CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!agent) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Agent Not Found</CardTitle>
          <CardDescription>The requested agent doesn't exist or you don't have access to view it.</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center items-center p-10">
          <AlertCircle className="h-16 w-16 text-slate-300 dark:text-slate-600" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="border-b border-slate-200 dark:border-slate-700">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="flex items-center space-x-3">
              <div className={`w-3 h-3 rounded-full ${getStatusColor(status)}`}></div>
              <span>{agent.name || `Agent ${agent.id.substring(0, 8)}`}</span>
            </CardTitle>
            <CardDescription className="mt-1.5">
              {agent.description || 'No description available'}
            </CardDescription>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Agent Information */}
          <div className="space-y-3">
            <h3 className="text-lg font-medium">Agent Info</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-slate-500 dark:text-slate-400 flex items-center">
                  <Tag className="mr-2 h-4 w-4" /> ID
                </span>
                <span className="text-sm font-mono">{agent.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-500 dark:text-slate-400 flex items-center">
                  <Tag className="mr-2 h-4 w-4" /> Version
                </span>
                <span className="text-sm">{agent.agent_version_id || 'Unknown'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-500 dark:text-slate-400 flex items-center">
                  <Calendar className="mr-2 h-4 w-4" /> Last Ping
                </span>
                <span className="text-sm">
                  {lastPing?.last_ping_at ? formatRelativeTime(lastPing.last_ping_at) : 'Never'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-500 dark:text-slate-400 flex items-center">
                  <Clock className="mr-2 h-4 w-4" /> Local Time
                </span>
                <span className="text-sm">
                  {lastPing?.agent_local_time ? formatDate(lastPing.agent_local_time) : 'Unknown'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-500 dark:text-slate-400">Status</span>
                <Badge variant="outline" className={`
                  ${status === 'healthy' ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 border-green-200 dark:border-green-800' : 
                    status === 'warning' ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 border-amber-200 dark:border-amber-800' : 
                    'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 border-red-200 dark:border-red-800'}`
                }>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </Badge>
              </div>
            </div>
          </div>

          {/* System Information */}
          <div className="space-y-3">
            <h3 className="text-lg font-medium">System Info</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-slate-500 dark:text-slate-400 flex items-center">
                  <Server className="mr-2 h-4 w-4" /> Hostname
                </span>
                <span className="text-sm">{lastPing?.hostname || 'Unknown'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-500 dark:text-slate-400 flex items-center">
                  <Globe className="mr-2 h-4 w-4" /> IP Addresses
                </span>
                <span className="text-sm font-mono truncate max-w-[240px]" title={lastPing?.ips || 'Unknown'}>
                  {lastPing?.ips || 'Unknown'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-500 dark:text-slate-400 flex items-center">
                  <Cpu className="mr-2 h-4 w-4" /> OS Version
                </span>
                <span className="text-sm">{lastPing?.os_version || 'Unknown'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-500 dark:text-slate-400 flex items-center">
                  <HardDrive className="mr-2 h-4 w-4" /> Directory
                </span>
                <span className="text-sm font-mono truncate max-w-[240px]" title={lastPing?.current_directory || 'Unknown'}>
                  {lastPing?.current_directory || 'Unknown'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-500 dark:text-slate-400 flex items-center">
                  <Tag className="mr-2 h-4 w-4" /> Agent Version
                </span>
                <span className="text-sm">{lastPing?.agent_version_from_source_code || 'Unknown'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Agent Logs and Activity */}
        <div className="mt-8">
          <Tabs defaultValue="logs">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="logs">Recent Logs</TabsTrigger>
              <TabsTrigger value="pings">Ping History</TabsTrigger>
            </TabsList>
            <TabsContent value="logs" className="mt-4">
              {agentLogs && agentLogs.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Message</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {agentLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="whitespace-nowrap">{formatDate(log.created_at)}</TableCell>
                        <TableCell>
                          {log.errors ? (
                            <Badge variant="destructive">Error</Badge>
                          ) : log.warnings ? (
                            <Badge variant="outline" className="bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 border-amber-200 dark:border-amber-800">
                              Warning
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 border-green-200 dark:border-green-800">
                              Success
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {log.errors || log.warnings || log.logs || 'No message'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-slate-500 dark:text-slate-400">
                  <CircleAlert className="h-12 w-12 mb-3 text-slate-300 dark:text-slate-600" />
                  <p>No logs available for this agent</p>
                </div>
              )}
            </TabsContent>
            <TabsContent value="pings" className="mt-4">
              {agentPings && agentPings.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Local Time</TableHead>
                      <TableHead>IPs</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {agentPings.map((ping, index) => (
                      <TableRow key={index}>
                        <TableCell className="whitespace-nowrap">{formatDate(ping.last_ping_at)}</TableCell>
                        <TableCell className="whitespace-nowrap">{formatDate(ping.agent_local_time)}</TableCell>
                        <TableCell className="font-mono text-xs">{ping.ips}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-slate-500 dark:text-slate-400">
                  <CircleAlert className="h-12 w-12 mb-3 text-slate-300 dark:text-slate-600" />
                  <p>No ping history available for this agent</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </CardContent>
      <CardFooter className="border-t border-slate-200 dark:border-slate-700 py-3 px-6">
        <div className="flex flex-wrap gap-2">
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
          {agent.check_agent_update && (
            <Badge variant="outline" className="bg-violet-50 text-violet-700 dark:bg-violet-900/20 dark:text-violet-400 border-violet-200 dark:border-violet-800">
              Check Updates
            </Badge>
          )}
          {agent.auto_clean_update && (
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800">
              Auto Clean
            </Badge>
          )}
          {agent.watch && (
            <Badge variant="outline" className="bg-pink-50 text-pink-700 dark:bg-pink-900/20 dark:text-pink-400 border-pink-200 dark:border-pink-800">
              Monitoring
            </Badge>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}
