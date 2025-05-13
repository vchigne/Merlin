import { useState, useEffect } from "react";
import { Bell, RefreshCw, Menu } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/ThemeProvider";
import { Badge } from "@/components/ui/badge";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useMerlinContext } from "@/context/MerlinContext";

interface HeaderProps {
  toggleSidebar: () => void;
}

export default function Header({ toggleSidebar }: HeaderProps) {
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { theme } = useTheme();
  const { refreshData, connectionStatus } = useMerlinContext();

  useEffect(() => {
    const timer = setInterval(() => {
      setLastUpdated((prev) => prev);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setLastUpdated(new Date());
    
    refreshData()
      .finally(() => {
        setTimeout(() => {
          setIsRefreshing(false);
        }, 500);
      });
  };

  const lastUpdatedText = formatDistanceToNow(lastUpdated, { addSuffix: true });

  return (
    <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-sm">
      <div className="flex items-center justify-between px-4 py-2 h-14">
        <div className="flex items-center">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={toggleSidebar}
            className="mr-2 md:hidden"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-semibold dark:text-white md:hidden">Merlin Observer</h1>
        </div>
        
        <div className="flex items-center space-x-1 md:space-x-2">
          {/* API connection status */}
          <TooltipProvider>
            <Tooltip delayDuration={300}>
              <TooltipTrigger asChild>
                <div className={`hidden md:flex items-center px-2 py-1 text-xs font-medium rounded-full 
                  ${connectionStatus === 'connected' 
                    ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400' 
                    : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'}`}
                >
                  <div className={`w-1.5 h-1.5 rounded-full mr-1.5 ${connectionStatus === 'connected' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                  {connectionStatus === 'connected' ? 'API Connected' : 'API Disconnected'}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Connection to Hasura GraphQL API</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          {/* Connection indicator for mobile */}
          <div className={`md:hidden flex h-2 w-2 rounded-full ${connectionStatus === 'connected' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
          
          {/* Last updated */}
          <div className="hidden md:flex items-center text-xs text-slate-500 dark:text-slate-400">
            <RefreshCw className="h-3 w-3 mr-1.5" />
            Updated: <span className="ml-1">{lastUpdatedText}</span>
          </div>
          
          {/* Manual refresh button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="text-slate-500 dark:text-slate-400 px-2"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="sr-only">Refresh data</span>
          </Button>
          
          {/* READ ONLY badge */}
          <Badge variant="secondary" className="bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-0 text-[10px] md:text-xs">
            READ ONLY
          </Badge>
          
          {/* Theme toggle */}
          <ThemeToggle />
          
          {/* Notifications */}
          <Button variant="ghost" size="sm" className="relative px-2">
            <Bell className="h-4 w-4" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-primary-500 rounded-full"></span>
            <span className="sr-only">Notifications</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
