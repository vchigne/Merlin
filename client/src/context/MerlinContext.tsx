import { 
  createContext, 
  useContext, 
  useState, 
  useEffect, 
  ReactNode 
} from 'react';
import { useAgentStatus } from '@/hooks/use-agent-status';
import { executeQuery } from '@/lib/hasura-client';
import { STATS_OVERVIEW_QUERY } from '@shared/queries';
import { StatsOverview } from '@shared/types';
import { initializeSocket, getSocket } from '@/lib/socket';
import { useNotifications } from './NotificationContext';

interface MerlinContextType {
  connectionStatus: 'connected' | 'connecting' | 'disconnected';
  agentStatistics: {
    total: number;
    healthy: number;
    warning: number;
    error: number;
    offline: number;
  };
  jobStatistics: {
    total: number;
    completed: number;
    running: number;
    errors: number;
  };
  refreshData: () => Promise<void>;
  lastUpdated: Date;
}

export const MerlinContext = createContext<MerlinContextType | undefined>(undefined);

export function MerlinProvider({ children }: { children: ReactNode }) {
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected'>('connecting');
  const [statsOverview, setStatsOverview] = useState<StatsOverview | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const { agents, healthySummary } = useAgentStatus();
  const { addNotification } = useNotifications();
  
  // Initialize the socket connection
  useEffect(() => {
    const socket = initializeSocket();
    
    socket.on('connect', () => {
      setConnectionStatus('connected');
      addNotification({
        type: 'success',
        title: 'Connected to Server',
        description: 'Real-time monitoring is now active'
      });
    });
    
    socket.on('disconnect', () => {
      setConnectionStatus('disconnected');
      addNotification({
        type: 'error',
        title: 'Server Connection Lost',
        description: 'Attempting to reconnect...'
      });
    });
    
    socket.on('connect_error', () => {
      setConnectionStatus('disconnected');
    });

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [addNotification]);

  // Fetch stats overview periodically
  useEffect(() => {
    const fetchStatsOverview = async () => {
      try {
        const result = await executeQuery(STATS_OVERVIEW_QUERY);
        if (result.errors) {
          throw new Error(result.errors[0].message);
        }
        
        const data = result.data;
        setStatsOverview({
          activeAgents: data.activeAgents.aggregate.count,
          pipelineExecutions: data.pipelineJobs.aggregate.count,
          successRate: data.completedJobs.aggregate.count > 0 
            ? (data.completedJobs.aggregate.count / (data.completedJobs.aggregate.count + data.abortedJobs.aggregate.count)) * 100 
            : 0,
          errorCount: data.errorLogs.aggregate.count
        });
        setLastUpdated(new Date());
      } catch (error) {
        console.error('Error fetching stats overview:', error);
      }
    };

    // Initial fetch
    fetchStatsOverview();
    
    // Set up interval for periodic fetching
    const interval = setInterval(fetchStatsOverview, 60000); // Every minute
    
    return () => clearInterval(interval);
  }, []);

  // Refresh all data
  const refreshData = async () => {
    try {
      const result = await executeQuery(STATS_OVERVIEW_QUERY);
      if (result.errors) {
        throw new Error(result.errors[0].message);
      }
      
      const data = result.data;
      setStatsOverview({
        activeAgents: data.activeAgents.aggregate.count,
        pipelineExecutions: data.pipelineJobs.aggregate.count,
        successRate: data.completedJobs.aggregate.count > 0 
          ? (data.completedJobs.aggregate.count / (data.completedJobs.aggregate.count + data.abortedJobs.aggregate.count)) * 100 
          : 0,
        errorCount: data.errorLogs.aggregate.count
      });
      setLastUpdated(new Date());
      
      // Trigger a refresh for all cached data
      const socket = getSocket();
      if (socket) {
        socket.emit('refresh:all');
      }
    } catch (error) {
      console.error('Error refreshing data:', error);
      throw error;
    }
  };

  // Prepare agent statistics
  const agentStatistics = {
    total: healthySummary.total,
    healthy: healthySummary.healthy,
    warning: healthySummary.warning,
    error: healthySummary.error,
    offline: healthySummary.offline
  };

  // Prepare job statistics
  const jobStatistics = {
    total: statsOverview?.pipelineExecutions || 0,
    completed: 0, // These will be updated from the specific stats when available
    running: 0,
    errors: statsOverview?.errorCount || 0
  };

  return (
    <MerlinContext.Provider value={{
      connectionStatus,
      agentStatistics,
      jobStatistics,
      refreshData,
      lastUpdated
    }}>
      {children}
    </MerlinContext.Provider>
  );
}

export function useMerlinContext() {
  const context = useContext(MerlinContext);
  if (context === undefined) {
    throw new Error('useMerlinContext must be used within a MerlinProvider');
  }
  return context;
}
