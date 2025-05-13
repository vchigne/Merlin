import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { hasuraClient } from './hasura-client';

let io: Server;

// Maintain a cache of latest data to send to newly connected clients
const dataCache: Record<string, any> = {
  agentStatus: null,
  pipelineJobs: null,
  recentLogs: null,
};

// Setup Socket.IO server
export function setupSocketServer(httpServer: HttpServer): void {
  io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket: Socket) => {
    console.log('Client connected', socket.id);
    
    // Send cached data to newly connected client
    Object.entries(dataCache).forEach(([key, data]) => {
      if (data) {
        socket.emit(`update:${key}`, data);
      }
    });

    // Setup event handlers
    socket.on('subscribe', (channels: string[]) => {
      console.log(`Client ${socket.id} subscribed to:`, channels);
      channels.forEach(channel => socket.join(channel));
    });

    socket.on('unsubscribe', (channels: string[]) => {
      channels.forEach(channel => socket.leave(channel));
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected', socket.id);
    });
  });

  // Start polling for updates
  startPolling();
}

// Emit an event to all connected clients in a channel
export function emitToChannel(channel: string, event: string, data: any): void {
  if (io) {
    io.to(channel).emit(event, data);
    
    // Update cache
    if (event.startsWith('update:')) {
      const cacheKey = event.substring(7); // Remove 'update:' prefix
      dataCache[cacheKey] = data;
    }
  }
}

// Emit an event to all connected clients
export function emitToAll(event: string, data: any): void {
  if (io) {
    io.emit(event, data);
    
    // Update cache
    if (event.startsWith('update:')) {
      const cacheKey = event.substring(7); // Remove 'update:' prefix
      dataCache[cacheKey] = data;
    }
  }
}

// Start polling Hasura for updates
function startPolling(): void {
  // Poll agent status every 10 seconds
  setInterval(async () => {
    try {
      const agentStatus = await fetchAgentStatus();
      emitToAll('update:agentStatus', agentStatus);
    } catch (error) {
      console.error('Error polling agent status:', error);
    }
  }, 10000);

  // Poll pipeline jobs every 5 seconds
  setInterval(async () => {
    try {
      const pipelineJobs = await fetchPipelineJobs();
      emitToAll('update:pipelineJobs', pipelineJobs);
    } catch (error) {
      console.error('Error polling pipeline jobs:', error);
    }
  }, 5000);

  // Poll recent logs every 3 seconds
  setInterval(async () => {
    try {
      const recentLogs = await fetchRecentLogs();
      emitToAll('update:recentLogs', recentLogs);
    } catch (error) {
      console.error('Error polling recent logs:', error);
    }
  }, 3000);
}

// Fetch agent status from Hasura
async function fetchAgentStatus() {
  const query = `
    query GetAgentStatus {
      merlin_agent_AgentPassport {
        id
        name
        is_healthy
        AgentPassportPing {
          last_ping_at
          hostname
          ips
        }
      }
    }
  `;

  const result = await hasuraClient.query(query);
  return result.data?.merlin_agent_AgentPassport || [];
}

// Fetch pipeline jobs from Hasura
async function fetchPipelineJobs() {
  const query = `
    query GetRecentJobs {
      merlin_agent_PipelineJobQueue(limit: 10, order_by: {created_at: desc}) {
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
      }
    }
  `;

  const result = await hasuraClient.query(query);
  return result.data?.merlin_agent_PipelineJobQueue || [];
}

// Fetch recent logs from Hasura
async function fetchRecentLogs() {
  const query = `
    query GetRecentLogs {
      merlin_agent_PipelineJobLogV2Body(limit: 20, order_by: {created_at: desc}) {
        id
        pipeline_job_queue_id
        date
        level
        message
        created_at
      }
    }
  `;

  const result = await hasuraClient.query(query);
  return result.data?.merlin_agent_PipelineJobLogV2Body || [];
}
