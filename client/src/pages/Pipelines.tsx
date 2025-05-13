import { useState } from "react";
import { usePipelines } from "@/hooks/use-pipeline";
import PipelineCard from "@/components/pipelines/PipelineCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { 
  RefreshCw, 
  Search, 
  Filter, 
  GitBranch,
  Bot,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useAgentStatus } from "@/hooks/use-agent-status";
import { Badge } from "@/components/ui/badge";

export default function Pipelines() {
  const [searchTerm, setSearchTerm] = useState("");
  const [agentFilter, setAgentFilter] = useState("");
  const [page, setPage] = useState(1);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const limit = 12;
  const offset = (page - 1) * limit;
  
  // Fetch pipelines
  const { 
    data: pipelinesData, 
    isLoading, 
    error, 
    refetch 
  } = usePipelines({
    limit,
    offset,
    agentId: agentFilter && agentFilter !== "all" ? agentFilter : undefined,
  });
  
  // Fetch agents for filtering
  const { agents } = useAgentStatus();
  
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setTimeout(() => setIsRefreshing(false), 500);
  };
  
  // Filter pipelines based on search
  const filteredPipelines = pipelinesData?.pipelines.filter(pipeline => 
    pipeline.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pipeline.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pipeline.id?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];
  
  // Calculate pagination
  const totalPages = pipelinesData ? Math.ceil(pipelinesData.totalCount / limit) : 0;
  
  return (
    <div className="space-y-6">
      {/* Page title */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
        <div>
          <h1 className="text-2xl font-bold dark:text-white">Pipelines</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            View and monitor all pipeline configurations and executions
          </p>
        </div>
        <div className="flex items-center space-x-2">
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
            placeholder="Search pipelines..."
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Select value={agentFilter} onValueChange={setAgentFilter}>
          <SelectTrigger className="w-[220px]">
            <Bot className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Filter by agent" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All agents</SelectItem>
            {agents.map(agent => (
              <SelectItem key={agent.id} value={agent.id}>
                {agent.name || agent.id.substring(0, 8)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      {/* Active filters */}
      {(searchTerm || agentFilter) && (
        <div className="flex flex-wrap gap-2">
          {searchTerm && (
            <Badge variant="outline" className="flex items-center space-x-1">
              Search: {searchTerm}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSearchTerm("")}
                className="h-4 w-4 ml-1 p-0"
              >
                <span className="sr-only">Remove filter</span>
                ×
              </Button>
            </Badge>
          )}
          
          {agentFilter && (
            <Badge variant="outline" className="flex items-center space-x-1">
              Agent: {agents.find(a => a.id === agentFilter)?.name || agentFilter.substring(0, 8)}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setAgentFilter("")}
                className="h-4 w-4 ml-1 p-0"
              >
                <span className="sr-only">Remove filter</span>
                ×
              </Button>
            </Badge>
          )}
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearchTerm("");
              setAgentFilter("");
            }}
            className="text-xs h-6"
          >
            Clear all filters
          </Button>
        </div>
      )}
      
      {/* Pipelines grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-[200px] w-full rounded-lg" />
          ))}
        </div>
      ) : error ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-10">
            <p className="text-red-500 mb-4">Error loading pipeline data</p>
            <Button onClick={handleRefresh}>Try Again</Button>
          </CardContent>
        </Card>
      ) : filteredPipelines.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-10">
            <GitBranch className="h-16 w-16 text-slate-300 dark:text-slate-600 mb-4" />
            <p className="text-slate-500 dark:text-slate-400 mb-2">
              {searchTerm || agentFilter ? 'No pipelines match your filters' : 'No pipelines found'}
            </p>
            {(searchTerm || agentFilter) && (
              <Button variant="outline" onClick={() => {
                setSearchTerm("");
                setAgentFilter("");
              }}>
                Clear Filters
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPipelines.map(pipeline => (
              <PipelineCard key={pipeline.id} pipeline={pipeline} />
            ))}
          </div>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-slate-500 dark:text-slate-400">
                Showing {offset + 1}-{Math.min(offset + filteredPipelines.length, pipelinesData?.totalCount || 0)} of {pipelinesData?.totalCount} pipelines
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(prev => Math.max(prev - 1, 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={page === totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
