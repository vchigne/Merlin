import { useState, useEffect } from "react";
import { useAgentStatus } from "@/hooks/use-agent-status";
import AgentCard from "@/components/agents/AgentCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { RefreshCw, Search, Filter, Bot } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export default function Agents() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { agents, healthySummary, isLoading, error, refetch } = useAgentStatus();

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  // Filter agents based on search and status filter
  const filteredAgents = agents.filter(agent => {
    // Name search
    const nameMatch = agent.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                      agent.id?.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Status filter
    const statusMatch = !statusFilter || agent.status === statusFilter;
    
    return nameMatch && statusMatch;
  });

  return (
    <div className="space-y-6">
      {/* Page title and stats */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
        <div>
          <h1 className="text-2xl font-bold dark:text-white">Agents</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Monitor and track all Merlin agents in the system
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge className="bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400">
            Healthy: {healthySummary.healthy}
          </Badge>
          <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
            Warning: {healthySummary.warning}
          </Badge>
          <Badge className="bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400">
            Error: {healthySummary.error}
          </Badge>
          <Badge className="bg-slate-100 text-slate-700 dark:bg-slate-900/20 dark:text-slate-400">
            Offline: {healthySummary.offline}
          </Badge>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            disabled={isLoading || isRefreshing}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>
      
      {/* Search and filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search by name or ID..."
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="healthy">Healthy</SelectItem>
            <SelectItem value="warning">Warning</SelectItem>
            <SelectItem value="error">Error</SelectItem>
            <SelectItem value="offline">Offline</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      {/* Agents grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, index) => (
            <Card key={index}>
              <CardHeader className="pb-2">
                <Skeleton className="h-6 w-3/4" />
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : error ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-10">
            <p className="text-red-500 mb-4">Error loading agent data: {error.message}</p>
            <Button onClick={handleRefresh}>Try Again</Button>
          </CardContent>
        </Card>
      ) : filteredAgents.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-10">
            <Bot className="h-16 w-16 text-slate-300 dark:text-slate-600 mb-4" />
            <p className="text-slate-500 dark:text-slate-400 mb-2">
              {searchTerm || statusFilter ? 'No agents match your filters' : 'No agents found'}
            </p>
            {(searchTerm || statusFilter) && (
              <Button variant="outline" onClick={() => {
                setSearchTerm("");
                setStatusFilter("");
              }}>
                Clear Filters
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAgents.map(agent => (
            <AgentCard key={agent.id} agent={agent} />
          ))}
        </div>
      )}
    </div>
  );
}
