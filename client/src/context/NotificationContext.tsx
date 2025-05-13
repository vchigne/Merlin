import { 
  createContext, 
  useContext, 
  useState, 
  useEffect, 
  ReactNode 
} from 'react';
import { useToast } from '@/hooks/use-toast';
import NotificationToast from '@/components/NotificationToast';
import { getSocket } from '@/lib/socket';

interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  description?: string;
  read: boolean;
  timestamp: Date;
  entityType?: string;
  entityId?: string;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Omit<Notification, 'id' | 'read' | 'timestamp'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [currentToast, setCurrentToast] = useState<Notification | null>(null);
  const { toast } = useToast();
  const socket = getSocket();

  // Calculate unread count
  const unreadCount = notifications.filter(n => !n.read).length;

  // Add a new notification
  const addNotification = (notification: Omit<Notification, 'id' | 'read' | 'timestamp'>) => {
    const newNotification = {
      ...notification,
      id: `notification-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      read: false,
      timestamp: new Date()
    };
    
    setNotifications(prev => [newNotification, ...prev]);
    
    // Show toast for new notification
    setCurrentToast(newNotification);
  };

  // Mark a notification as read
  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  };

  // Mark all notifications as read
  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(n => ({ ...n, read: true }))
    );
  };

  // Clear all notifications
  const clearNotifications = () => {
    setNotifications([]);
  };

  // Listen for socket notifications
  useEffect(() => {
    if (!socket) return;

    const handleAgentStatusChange = (data: any) => {
      if (data.status === 'error' || data.status === 'offline') {
        addNotification({
          type: 'error',
          title: `Agent ${data.name || data.id} is ${data.status}`,
          description: 'An agent has gone offline or entered error state',
          entityType: 'agent',
          entityId: data.id
        });
      }
    };

    const handleJobStatusChange = (data: any) => {
      const statusType = data.status === 'completed' ? 'success' : 
                           data.status === 'error' ? 'error' : 'info';
      
      addNotification({
        type: statusType,
        title: `Job ${data.status}`,
        description: `Pipeline "${data.pipelineName}" ${data.status}`,
        entityType: 'job',
        entityId: data.id
      });
    };

    socket.on('agent:status', handleAgentStatusChange);
    socket.on('job:status', handleJobStatusChange);

    return () => {
      socket.off('agent:status', handleAgentStatusChange);
      socket.off('job:status', handleJobStatusChange);
    };
  }, [socket]);

  // Handle toast display for the current notification
  useEffect(() => {
    if (currentToast) {
      toast({
        title: currentToast.title,
        description: currentToast.description,
        variant: currentToast.type === 'error' ? 'destructive' : 'default',
      });
      
      // Clear current toast after display
      const timer = setTimeout(() => {
        setCurrentToast(null);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [currentToast, toast]);

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      addNotification,
      markAsRead,
      markAllAsRead,
      clearNotifications
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
