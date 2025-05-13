import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { executeQuery } from "@/lib/hasura-client";
import { formatDate, formatRelativeTime, getStatusStyle } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

export default function JobsTable() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['/api/jobs/recent'],
    queryFn: async () => {
      const result = await executeQuery(`
        query GetRecentJobs {
          merlin_agent_PipelineJobQueue(limit: 5, order_by: {created_at: desc}) {
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

  // Determine job status
  const getJobStatus = (job: any) => {
    if (job.aborted) return 'Error';
    if (job.completed) return 'Completed';
    if (job.running) return 'Running';
    return 'Pending';
  };

  // Loading skeleton
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="border-b border-slate-200 dark:border-slate-700">
          <div className="flex justify-between items-center">
            <CardTitle>Recent Jobs</CardTitle>
            <Link href="/jobs" className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300">
                View all jobs
            </Link>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Job ID</TableHead>
                  <TableHead>Pipeline</TableHead>
                  <TableHead>Agent</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 5 }).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card>
        <CardHeader className="border-b border-slate-200 dark:border-slate-700">
          <CardTitle>Recent Jobs</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="text-center text-red-500 py-4">
            Error loading job data
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="border-b border-slate-200 dark:border-slate-700">
        <div className="flex justify-between items-center">
          <CardTitle>Recent Jobs</CardTitle>
          <Link href="/jobs" className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300">
              View all jobs
          </Link>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px] md:w-auto">Job ID</TableHead>
                <TableHead className="hidden sm:table-cell">Pipeline</TableHead>
                <TableHead className="hidden md:table-cell">Agent</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden sm:table-cell">Created</TableHead>
                <TableHead className="hidden md:table-cell">Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!data || data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-slate-500 dark:text-slate-400 h-24">
                    No jobs found
                  </TableCell>
                </TableRow>
              ) : (
                data.map((job: any) => {
                  const status = getJobStatus(job);
                  const statusStyle = getStatusStyle(status);
                  
                  return (
                    <TableRow key={job.id}>
                      <TableCell className="font-medium text-sm md:text-base">
                        <Link href={`/jobs/${job.id}`} className="text-primary-600 dark:text-primary-400 hover:underline">
                          {job.id.substring(0, 7)}
                        </Link>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Link href={`/pipelines/${job.pipeline_id}`} className="text-primary-600 dark:text-primary-400 hover:underline text-xs md:text-sm">
                          {job.Pipeline?.name || job.pipeline_id.substring(0, 8)}
                        </Link>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {job.started_by_agent && (
                          <Link href={`/agents/${job.started_by_agent}`} className="text-primary-600 dark:text-primary-400 hover:underline text-xs md:text-sm">
                            {job.AgentPassport?.name || job.started_by_agent.substring(0, 8)}
                          </Link>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusStyle.badgeClass}`}>
                          {statusStyle.label}
                        </span>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-xs md:text-sm text-slate-500 dark:text-slate-400">
                        {formatRelativeTime(job.created_at)}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-xs md:text-sm text-slate-500 dark:text-slate-400">
                        {formatRelativeTime(job.updated_at)}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
