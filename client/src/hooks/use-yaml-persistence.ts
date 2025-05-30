import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface PipelinePosition {
  id: string;
  x: number;
  y: number;
}

interface PipelinePositions {
  [unitId: string]: PipelinePosition;
}

interface PipelineYAML {
  id: string;
  name: string;
  description?: string;
  units: Array<{
    id: string;
    type: string;
    name: string;
    config: any;
    index?: number;
  }>;
  created_at?: string;
  updated_at?: string;
}

export function usePipelinePositions(pipelineId: string | null) {
  return useQuery({
    queryKey: ['pipeline-positions', pipelineId],
    queryFn: async () => {
      if (!pipelineId) return null;
      const response = await fetch(`/api/pipeline/${pipelineId}/positions`);
      const data = await response.json();
      return data.positions as PipelinePositions | null;
    },
    enabled: !!pipelineId,
  });
}

export function useSavePipelinePositions() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ pipelineId, positions }: { 
      pipelineId: string; 
      positions: PipelinePositions;
    }) => {
      const response = await fetch(`/api/pipeline/${pipelineId}/positions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ positions })
      });
      return response.json();
    },
    onSuccess: (_, { pipelineId }) => {
      queryClient.invalidateQueries({ queryKey: ['pipeline-positions', pipelineId] });
    }
  });
}

export function usePipelineYAML(pipelineId: string | null) {
  return useQuery({
    queryKey: ['pipeline-yaml', pipelineId],
    queryFn: async () => {
      if (!pipelineId) return null;
      const response = await fetch(`/api/pipeline/${pipelineId}/yaml`);
      const data = await response.json();
      return data.yaml as PipelineYAML | null;
    },
    enabled: !!pipelineId,
  });
}

export function useSyncPipelineYAML() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (pipelineId: string) => {
      const response = await fetch(`/api/pipeline/${pipelineId}/sync-yaml`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      return response.json();
    },
    onSuccess: (_, pipelineId) => {
      queryClient.invalidateQueries({ queryKey: ['pipeline-yaml', pipelineId] });
    }
  });
}

// Función helper para convertir nodos del visualizador a formato de posiciones
export function convertNodesToPositions(nodes: Array<{ id: string; pos: string }>): PipelinePositions {
  const positions: PipelinePositions = {};
  
  nodes.forEach(node => {
    const [x, y] = node.pos.split(',').map(Number);
    positions[node.id] = {
      id: node.id,
      x,
      y
    };
  });
  
  return positions;
}

// Función helper para convertir posiciones guardadas a formato de nodos
export function convertPositionsToNodes(positions: PipelinePositions | null): { [key: string]: string } | null {
  if (!positions) return null;
  
  const nodePositions: { [key: string]: string } = {};
  
  Object.values(positions).forEach(pos => {
    nodePositions[pos.id] = `${pos.x},${pos.y}`;
  });
  
  return nodePositions;
}