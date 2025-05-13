import { io, Socket } from 'socket.io-client';
import { queryClient } from './queryClient';

// Define socket instance
let socketInstance: Socket | null = null;

// Initialize socket connection
export function initializeSocket(): Socket {
  if (socketInstance) return socketInstance;

  socketInstance = io(window.location.origin, {
    path: '/socket.io',
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    transports: ['websocket', 'polling'],
  });

  // Set up event listeners
  socketInstance.on('connect', () => {
    console.log('Socket connected:', socketInstance?.id);
  });

  socketInstance.on('disconnect', (reason) => {
    console.log('Socket disconnected:', reason);
  });

  socketInstance.on('error', (error) => {
    console.error('Socket error:', error);
  });

  // Listen for data updates and invalidate query cache
  socketInstance.on('update:agentStatus', () => {
    queryClient.invalidateQueries({ queryKey: ['/api/agents/status'] });
  });

  socketInstance.on('update:pipelineJobs', () => {
    queryClient.invalidateQueries({ queryKey: ['/api/jobs'] });
  });

  socketInstance.on('update:recentLogs', () => {
    queryClient.invalidateQueries({ queryKey: ['/api/logs/recent'] });
  });

  return socketInstance;
}

// Get socket instance
export function getSocket(): Socket | null {
  return socketInstance;
}

// Initialize socket and re-export for components to use
initializeSocket();
export { socketInstance as socket };

// Subscribe to specific channels
export function subscribeToChannels(channels: string[]): void {
  if (socketInstance && socketInstance.connected) {
    socketInstance.emit('subscribe', channels);
  }
}

// Unsubscribe from specific channels
export function unsubscribeFromChannels(channels: string[]): void {
  if (socketInstance && socketInstance.connected) {
    socketInstance.emit('unsubscribe', channels);
  }
}

// Close socket connection
export function closeSocket(): void {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
}
