import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { executeQuery } from "@/lib/hasura-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RefreshCw, XCircle, AlertTriangle, Info } from "lucide-react";
import JobItem from "@/components/jobs/JobItem";

export default function JobQueue() {
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch recent jobs
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['/api/jobs/active'],
    queryFn: async () => {
      const result = await executeQuery(`
        query GetActiveJobs {
          merlin_agent_PipelineJobQueue(
            where: {
              _or: [
                {running: {_eq: true}}, 
                {completed: {_eq: false}, aborted: {_eq: false}}
              ]
            },
            order_by: {created_at: desc}
          ) {
            id
            pipeline_id
            completed
            running
            aborted
            created_at
            updated_at
            started_by_agent
            Pipeline {
              name
            }
            AgentPassport {
              name
            }
            PipelineJobLogs(limit: 1) {
              id
              logs
              warnings
              errors
            }
          }
        }
      `);
      
      if (result.errors) {
        throw new Error(result.errors[0].message);
      }
      
      return result.data.merlin_agent_PipelineJobQueue;
    },
    refetchInterval: 10000, // Refetch every 10 seconds
  });

  const handleRefresh = () => {
    setIsRefreshing(true);
    refetch().finally(() => {
      setTimeout(() => setIsRefreshing(false), 500);
    });
  };

  // Stats
  const runningCount = data?.filter((job: any) => job.running).length || 0;
  const pendingCount = data?.filter((job: any) => !job.running && !job.completed && !job.aborted).length || 0;

  return (
    <Card>
      <CardHeader className="border-b border-slate-200 dark:border-slate-700">
        <div className="flex justify-between items-center">
          <CardTitle>Active Job Queue</CardTitle>
          <div className="flex items-center space-x-2">
            <div className="flex space-x-2">
              <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 border-blue-200 dark:border-blue-800">
                Running: {isLoading ? "..." : runningCount}
              </Badge>
              <Badge variant="outline" className="bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 border-amber-200 dark:border-amber-800">
                Pending: {isLoading ? "..." : pendingCount}
              </Badge>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRefresh}
              disabled={isLoading || isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-16 w-full rounded-md" />
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <XCircle className="h-10 w-10 text-red-500 mb-2" />
            <p className="text-red-500">Error loading job queue</p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRefresh} 
              className="mt-2"
            >
              Try Again
            </Button>
          </div>
        ) : !data || data.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center text-slate-500 dark:text-slate-400">
            <Info className="h-10 w-10 mb-2 text-slate-300 dark:text-slate-600" />
            <p>No active jobs in the queue</p>
          </div>
        ) : (
          <ScrollArea className="h-[500px]">
            <div className="space-y-2">
              {data.map((job: any) => (
                <JobItem key={job.id} job={job} compact />
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
