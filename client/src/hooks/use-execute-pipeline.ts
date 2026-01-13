import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

const EXECUTE_PIPELINE_MUTATION = `
  mutation ExecutePipeline($pipelineId: uuid!) {
    insert_merlin_agent_PipelineJobQueue(objects: [{pipeline_id: $pipelineId}]) {
      affected_rows
      returning {
        id
        pipeline_id
        created_at
      }
    }
  }
`;

interface ExecutePipelineResult {
  jobId: string;
  pipelineId: string;
  createdAt: string;
}

async function executePipelineRequest(pipelineId: string): Promise<ExecutePipelineResult> {
  const response = await fetch('/api/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: EXECUTE_PIPELINE_MUTATION,
      variables: { pipelineId }
    })
  });

  if (!response.ok) {
    throw new Error(`Failed to execute pipeline: ${response.statusText}`);
  }

  const result = await response.json();

  if (result.errors) {
    throw new Error(result.errors[0]?.message || 'Failed to execute pipeline');
  }

  const returning = result.data?.insert_merlin_agent_PipelineJobQueue?.returning?.[0];
  if (!returning) {
    throw new Error('No job created');
  }

  return {
    jobId: returning.id,
    pipelineId: returning.pipeline_id,
    createdAt: returning.created_at
  };
}

interface UseExecutePipelineOptions {
  onSuccess?: (result: ExecutePipelineResult, pipelineName?: string) => void;
  onError?: (error: Error) => void;
}

export function useExecutePipeline(options?: UseExecutePipelineOptions) {
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: ({ pipelineId }: { pipelineId: string; pipelineName?: string }) => 
      executePipelineRequest(pipelineId),
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/graphql', 'jobs'] });
      queryClient.invalidateQueries({ queryKey: ['/api/graphql', 'running-jobs'] });
      
      toast({
        title: "Pipeline Enqueued",
        description: variables.pipelineName 
          ? `"${variables.pipelineName}" has been queued for execution`
          : "Pipeline has been queued for execution",
      });

      options?.onSuccess?.(result, variables.pipelineName);
    },
    onError: (error: Error) => {
      toast({
        title: "Execution Failed",
        description: error.message,
        variant: "destructive",
      });

      options?.onError?.(error);
    }
  });

  return {
    executePipeline: (pipelineId: string, pipelineName?: string) => 
      mutation.mutate({ pipelineId, pipelineName }),
    isExecuting: mutation.isPending,
    error: mutation.error,
    lastResult: mutation.data
  };
}
