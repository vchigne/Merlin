import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { executeQuery } from "@/lib/hasura-client";
import { STATS_OVERVIEW_QUERY } from "@shared/queries";
import StatCard from "@/components/dashboard/StatCard";
import AgentStatusCards from "@/components/dashboard/AgentStatusCards";
import RecentErrorsPanel from "@/components/dashboard/RecentErrorsPanel";
import PipelineVisualizerNew from "@/components/dashboard/PipelineVisualizerNew";
import ActivityFeed from "@/components/dashboard/ActivityFeed";
import JobsTable from "@/components/dashboard/JobsTable";
import { 
  GitBranch, 
  Bot, 
  CheckCircle, 
  AlertTriangle 
} from "lucide-react";
import { formatDate } from "@/lib/utils";

export default function Dashboard() {
  const [timeFrame, setTimeFrame] = useState("24h");
  
  // Fetch dashboard stats
  const { data, isLoading, error } = useQuery({
    queryKey: ['/api/dashboard/stats', timeFrame],
    queryFn: async () => {
      const result = await executeQuery(STATS_OVERVIEW_QUERY);
      if (result.errors) {
        throw new Error(result.errors[0].message);
      }
      
      const data = result.data;
      return {
        activeAgents: data.activeAgents.aggregate.count,
        totalAgents: data.totalAgents.aggregate.count,
        pipelineJobs: data.pipelineJobs.aggregate.count,
        completedJobs: data.completedJobs.aggregate.count,
        abortedJobs: data.abortedJobs.aggregate.count,
        errorLogs: data.errorLogs.aggregate.count,
      };
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Calculate derived stats
  const successRate = data?.completedJobs && (data.pipelineJobs - data.abortedJobs) > 0
    ? ((data.completedJobs / (data.pipelineJobs - data.abortedJobs)) * 100).toFixed(1)
    : "N/A";

  // Fake trend data (would be calculated from historical data in a real app)
  // In a real app, we would fetch historical data for comparison
  const getTrend = (current: number, previous: number) => {
    if (previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  };

  // Mock previous values (in a real app, this would come from historical data)
  const mockPreviousValues = {
    activeAgents: data?.activeAgents ? Math.max(Math.floor(data.activeAgents * 0.98), 0) : 0,
    pipelineJobs: data?.pipelineJobs ? Math.max(Math.floor(data.pipelineJobs * 0.89), 0) : 0,
    successRate: data?.completedJobs ? Math.max(parseFloat(successRate.toString()) - 1.5, 0) : 0,
    errorLogs: data?.errorLogs ? Math.max(Math.floor(data.errorLogs * 1.05), 0) : 0,
  };

  return (
    <div className="space-y-6">
      {/* Dashboard title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-0">
        <h1 className="text-2xl font-bold dark:text-white">Dashboard</h1>
        <div className="flex space-x-2">
          <select 
            className="block pl-3 pr-10 py-1.5 sm:py-2 text-sm sm:text-base border-slate-300 dark:border-slate-600 focus:outline-none focus:ring-primary-500 focus:border-primary-500 rounded-md bg-white dark:bg-slate-800 dark:text-white"
            value={timeFrame}
            onChange={(e) => setTimeFrame(e.target.value)}
          >
            <option value="24h">Last 24 hours</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
          </select>
        </div>
      </div>
      
      {/* Stats overview */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Active Agents"
          value={isLoading ? "..." : data?.activeAgents.toString() || "0"}
          icon={<Bot className="text-primary-600 dark:text-primary-400 h-5 w-5" />}
          trend={data ? getTrend(data.activeAgents, mockPreviousValues.activeAgents) : 0}
          loading={isLoading}
        />
        
        <StatCard
          title="Pipeline Executions"
          value={isLoading ? "..." : data?.pipelineJobs.toString() || "0"}
          icon={<GitBranch className="text-primary-600 dark:text-primary-400 h-5 w-5" />}
          trend={data ? getTrend(data.pipelineJobs, mockPreviousValues.pipelineJobs) : 0}
          loading={isLoading}
        />
        
        <StatCard
          title="Success Rate"
          value={isLoading ? "..." : `${successRate}%`}
          icon={<CheckCircle className="text-primary-600 dark:text-primary-400 h-5 w-5" />}
          trend={data && successRate !== "N/A" ? getTrend(parseFloat(successRate.toString()), mockPreviousValues.successRate) : 0}
          loading={isLoading}
        />
        
        <StatCard
          title="Error Count"
          value={isLoading ? "..." : data?.errorLogs.toString() || "0"}
          icon={<AlertTriangle className="text-warning-600 dark:text-warning-400 h-5 w-5" />}
          trend={data ? getTrend(data.errorLogs, mockPreviousValues.errorLogs) * -1 : 0}
          loading={isLoading}
        />
      </div>
      
      {/* Agent Status Cards */}
      <div className="mb-6">
        <h2 className="text-xl font-bold mb-4 dark:text-white">Estado de Agentes</h2>
        <AgentStatusCards />
      </div>
      
      {/* Errors Panel */}
      <div className="mb-6">
        <h2 className="text-xl font-bold mb-4 dark:text-white">Errores Recientes</h2>
        <RecentErrorsPanel />
      </div>
      
      {/* Pipeline Visualization and Activity Feed */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
        <div className="md:col-span-2">
          <h2 className="text-xl font-bold mb-4 dark:text-white">Visualización de Pipeline</h2>
          <PipelineVisualizerNew />
        </div>
        <div>
          <h2 className="text-xl font-bold mb-4 dark:text-white">Actividad Reciente</h2>
          <ActivityFeed />
        </div>
      </div>
      
      {/* Recent Jobs */}
      <div>
        <h2 className="text-xl font-bold mb-4 dark:text-white">Trabajos Recientes</h2>
        <JobsTable />
      </div>
    </div>
  );
}
