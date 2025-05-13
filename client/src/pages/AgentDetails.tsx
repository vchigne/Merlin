import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { executeQuery } from "@/lib/hasura-client";
import { useAgentPing } from "@/hooks/use-agent-ping";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import AgentDetailsPanel from "@/components/agents/AgentDetailsPanel";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import JobItem from "@/components/jobs/JobItem";
import PipelineCard from "@/components/pipelines/PipelineCard";

export default function AgentDetails() {
  const { id } = useParams();
  const [_, navigate] = useLocation();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  
  // Fetch agent details
  const { 
    data: agent,
    isLoading: isAgentLoading,
    error: agentError,
    refetch: refetchAgent
  } = useQuery({
    queryKey: ['/api/agents', id],
    queryFn: async () => {
      console.log('Fetching agent details for ID:', id);
      const result = await executeQuery(`
        query GetAgent($id: uuid!) {
          merlin_agent_AgentPassport(where: {id: {_eq: $id}}) {
            id
            name
            description
            is_testing
            enabled
            fabric_x_data_note_id
            watch
            agent_version_id
            check_agent_update
            is_healthy
            auto_clean_update
            AgentPassportPings(limit: 1, order_by: {last_ping_at: desc}) {
              last_ping_at
              hostname
              ips
              os_version
              agent_version_from_source_code
            }
          }
        }
      `, { id });
      
      if (result.errors) {
        console.error('Error fetching agent details:', result.errors);
        throw new Error(result.errors[0].message);
      }
      
      const agentData = result.data.merlin_agent_AgentPassport[0];
      if (!agentData) {
        throw new Error('Agent not found');
      }
      
      return agentData;
    },
    enabled: !!id,
  });
  
  // Fetch agent pings
  const { 
    data: pings,
    isLoading: isPingsLoading,
    refetch: refetchPings
  } = useAgentPing({ agentId: id || "" });
  
  // Fetch agent logs
  const {
    data: logs,
    isLoading: isLogsLoading,
    refetch: refetchLogs
  } = useQuery({
    queryKey: ['/api/agents/logs', id],
    queryFn: async () => {
      const result = await executeQuery(`
        query GetAgentLogs($id: uuid!) {
          merlin_agent_AgentUpdateLog(
            where: {agent_passport_id: {_eq: $id}}
            order_by: {created_at: desc}
            limit: 20
          ) {
            id
            agent_passport_id
            logs
            warnings
            errors
            checked_by_notificator
            created_at
            updated_at
          }
        }
      `, { id });
      
      if (result.errors) {
        throw new Error(result.errors[0].message);
      }
      
      return result.data.merlin_agent_AgentUpdateLog;
    },
    enabled: !!id && activeTab === "overview",
  });
  
  // Fetch agent pipelines
  const {
    data: pipelines,
    isLoading: isPipelinesLoading,
    refetch: refetchPipelines
  } = useQuery({
    queryKey: ['/api/agents/pipelines', id],
    queryFn: async () => {
      const result = await executeQuery(`
        query GetAgentPipelines($id: uuid!) {
          merlin_agent_Pipeline(
            where: {agent_passport_id: {_eq: $id}}
            order_by: {created_at: desc}
            limit: 10
          ) {
            id
            name
            description
            abort_on_error
            agent_passport_id
            created_at
            updated_at
            disposable
            AgentPassport {
              name
            }
            PipelineJobQueues(limit: 1, order_by: {created_at: desc}) {
              id
              completed
              running
              aborted
              created_at
            }
          }
        }
      `, { id });
      
      if (result.errors) {
        throw new Error(result.errors[0].message);
      }
      
      return result.data.merlin_agent_Pipeline;
    },
    enabled: !!id && activeTab === "pipelines",
  });
  
  // Fetch agent jobs
  const {
    data: jobs,
    isLoading: isJobsLoading,
    refetch: refetchJobs
  } = useQuery({
    queryKey: ['/api/agents/jobs', id],
    queryFn: async () => {
      const result = await executeQuery(`
        query GetAgentJobs($id: uuid!) {
          merlin_agent_PipelineJobQueue(
            where: {started_by_agent: {_eq: $id}}
            order_by: {created_at: desc}
            limit: 10
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
      `, { id });
      
      if (result.errors) {
        throw new Error(result.errors[0].message);
      }
      
      return result.data.merlin_agent_PipelineJobQueue;
    },
    enabled: !!id && activeTab === "jobs",
  });
  
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refetchAgent();
      await refetchPings();
      
      if (activeTab === "overview") {
        await refetchLogs();
      } else if (activeTab === "pipelines") {
        await refetchPipelines();
      } else if (activeTab === "jobs") {
        await refetchJobs();
      }
    } catch (error) {
      console.error("Error refreshing data:", error);
    }
    setTimeout(() => setIsRefreshing(false), 500);
  };
  
  // Handle tab change
  useEffect(() => {
    if (activeTab === "pipelines" && !pipelines) {
      refetchPipelines();
    } else if (activeTab === "jobs" && !jobs) {
      refetchJobs();
    }
  }, [activeTab, pipelines, jobs, refetchPipelines, refetchJobs]);
  
  const isLoading = isAgentLoading || isPingsLoading || 
    (activeTab === "overview" && isLogsLoading) ||
    (activeTab === "pipelines" && isPipelinesLoading) ||
    (activeTab === "jobs" && isJobsLoading);
  
  return (
    <div className="space-y-6">
      {/* Page title and back button */}
      <div className="flex items-center">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/agents")}
          className="mr-2"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Agents
        </Button>
        <Separator orientation="vertical" className="h-6 mx-2" />
        <h1 className="text-2xl font-bold dark:text-white">
          Agent Details
        </h1>
      </div>
      
      {/* Agent not found error */}
      {!isAgentLoading && agentError && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-10">
            <AlertCircle className="h-16 w-16 text-red-500 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Agent Not Found</h2>
            <p className="text-slate-500 dark:text-slate-400 mb-4">
              The agent you're looking for doesn't exist or you don't have access to view it.
            </p>
            <Button onClick={() => navigate("/agents")}>
              Return to Agents
            </Button>
          </CardContent>
        </Card>
      )}
      
      {/* Agent details */}
      {!agentError && (
        <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="pipelines">Pipelines</TabsTrigger>
            <TabsTrigger value="jobs">Jobs</TabsTrigger>
          </TabsList>
          
          {/* Overview Tab */}
          <TabsContent value="overview" className="mt-6">
            <AgentDetailsPanel
              agent={agent}
              agentPings={pings}
              agentLogs={logs}
              isLoading={isAgentLoading || isPingsLoading || isLogsLoading}
              onRefresh={handleRefresh}
            />
          </TabsContent>
          
          {/* Pipelines Tab */}
          <TabsContent value="pipelines" className="mt-6">
            {isPipelinesLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="h-[200px] w-full rounded-lg" />
                ))}
              </div>
            ) : !pipelines || pipelines.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-10">
                  <p className="text-slate-500 dark:text-slate-400 mb-2">
                    No pipelines found for this agent
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {pipelines.map(pipeline => (
                  <PipelineCard key={pipeline.id} pipeline={pipeline} />
                ))}
              </div>
            )}
          </TabsContent>
          
          {/* Jobs Tab */}
          <TabsContent value="jobs" className="mt-6">
            {isJobsLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, index) => (
                  <Skeleton key={index} className="h-[100px] w-full rounded-lg" />
                ))}
              </div>
            ) : !jobs || jobs.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-10">
                  <p className="text-slate-500 dark:text-slate-400 mb-2">
                    No jobs found for this agent
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {jobs.map(job => (
                  <JobItem key={job.id} job={job} compact={true} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
