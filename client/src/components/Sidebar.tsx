import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { 
  LayoutDashboard, 
  Bot, 
  GitBranch, 
  ListChecks, 
  FileText, 
  Search,
  ChevronRight,
  ChevronLeft,
  Settings,
  Bell,
  Database,
  Network,
  ServerCog,
  Plus
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useQuery } from "@tanstack/react-query";
import { executeQuery } from "@/lib/hasura-client";
import { AGENT_PASSPORT_QUERY, PIPELINE_QUERY } from "@shared/queries";
import { determineAgentStatus } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ThemeToggle } from "@/components/ui/theme-toggle";

interface SidebarProps {
  collapsed: boolean;
  toggleSidebar: () => void;
}

export default function Sidebar({ collapsed, toggleSidebar }: SidebarProps) {
  const [location] = useLocation();
  
  // Fetch recent agents
  const { data: agentData } = useQuery({
    queryKey: ['/api/agents/recent'],
    queryFn: async () => {
      const result = await executeQuery(AGENT_PASSPORT_QUERY);
      if (result.errors) {
        throw new Error(result.errors[0].message);
      }
      return result.data.merlin_agent_AgentPassport;
    },
    staleTime: 30000,
  });

  // Fetch recent pipelines
  const { data: pipelineData } = useQuery({
    queryKey: ['/api/pipelines/recent'],
    queryFn: async () => {
      const result = await executeQuery(PIPELINE_QUERY);
      if (result.errors) {
        throw new Error(result.errors[0].message);
      }
      return result.data.merlin_agent_Pipeline;
    },
    staleTime: 30000,
  });

  // Get recent agents with status
  const recentAgents = agentData 
    ? agentData.slice(0, 5).map((agent: any) => ({
        id: agent.id,
        name: agent.name,
        status: determineAgentStatus(agent.is_healthy)
      }))
    : [];

  // Get recent pipelines
  const recentPipelines = pipelineData
    ? pipelineData.slice(0, 5).map((pipeline: any) => ({
        id: pipeline.id,
        name: pipeline.name
      }))
    : [];

  return (
    <aside 
      className={cn(
        "border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex-shrink-0 h-full transition-all duration-300",
        collapsed ? "w-[4.5rem]" : "w-64"
      )}
    >
      <div className="flex flex-col h-full">
        {/* Logo and collapse button */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary-600 rounded-md flex items-center justify-center text-white font-semibold">
              M
            </div>
            {!collapsed && <h1 className="text-lg font-semibold dark:text-white">Merlin Observer</h1>}
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={toggleSidebar}
            className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white p-0 h-8 w-8"
          >
            {collapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
          </Button>
        </div>
        
        {/* Navigation links */}
        <ScrollArea className="flex-1 py-4 px-3">
          <nav className="space-y-1">
            <Link href="/" className={cn("sidebar-item", location === "/" && "active")}>
                <LayoutDashboard className="w-5 h-5 mr-3" />
                {!collapsed && <span>Dashboard</span>}
            </Link>
            <Link href="/agents" className={cn("sidebar-item", location.startsWith("/agents") && location !== "/agents/create" && "active")}>
                <Bot className="w-5 h-5 mr-3" />
                {!collapsed && <span>Agents</span>}
            </Link>
            <Link href="/agents/create" className={cn("sidebar-item", 
              location === "/agents/create" && "active",
              "text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 hover:bg-primary-50 dark:hover:bg-primary-900/20")}>
                <div className="flex items-center">
                  <ServerCog className="w-5 h-5" />
                  <Plus className="w-3 h-3 -ml-1 -mt-3" />
                </div>
                {!collapsed && <span className="ml-2">New Agent</span>}
            </Link>
            <Link href="/pipelines" className={cn("sidebar-item", location.startsWith("/pipelines") && "active")}>
                <GitBranch className="w-5 h-5 mr-3" />
                {!collapsed && <span>Pipelines</span>}
            </Link>
            <Link href="/jobs" className={cn("sidebar-item", location.startsWith("/jobs") && "active")}>
                <ListChecks className="w-5 h-5 mr-3" />
                {!collapsed && <span>Jobs Queue</span>}
            </Link>
            <Link href="/logs" className={cn("sidebar-item", location.startsWith("/logs") && "active")}>
                <FileText className="w-5 h-5 mr-3" />
                {!collapsed && <span>Logs</span>}
            </Link>
            <Link href="/explorer" className={cn("sidebar-item", location.startsWith("/explorer") && "active")}>
                <Search className="w-5 h-5 mr-3" />
                {!collapsed && <span>GraphQL Explorer</span>}
            </Link>
            <Link href="/connections" className={cn("sidebar-item", location.startsWith("/connections") && "active")}>
                <Network className="w-5 h-5 mr-3" />
                {!collapsed && <span>Connections</span>}
            </Link>
          </nav>
          
          {!collapsed && (
            <>
              <div className="mt-8">
                <h3 className="px-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Recent Agents
                </h3>
                <div className="mt-1 space-y-1">
                  {recentAgents.map((agent: any) => (
                    <Link key={agent.id} href={`/agents/${agent.id}`} className="flex items-center px-3 py-2 text-sm font-medium rounded-md text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 group">
                        <div className={cn(
                          "w-2 h-2 rounded-full mr-3",
                          agent.status === "healthy" && "bg-green-500",
                          agent.status === "warning" && "bg-amber-500",
                          agent.status === "error" && "bg-red-500",
                          agent.status === "offline" && "bg-slate-400"
                        )}></div>
                        <span className="truncate">{agent.name}</span>
                    </Link>
                  ))}
                </div>
              </div>
              
              <div className="mt-8">
                <h3 className="px-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Recent Pipelines
                </h3>
                <div className="mt-1 space-y-1">
                  {recentPipelines.map((pipeline: any) => (
                    <Link key={pipeline.id} href={`/pipelines/${pipeline.id}`} className="flex items-center px-3 py-2 text-sm font-medium rounded-md text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 group">
                      <span className="truncate">{pipeline.name}</span>
                    </Link>
                  ))}
                </div>
              </div>
            </>
          )}
        </ScrollArea>
        
        {/* Footer with settings */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <ThemeToggle />
            <Button
              variant="ghost"
              size="icon"
              className="p-2 rounded-md text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white"
            >
              <Settings className="h-5 w-5" />
              <span className="sr-only">Settings</span>
            </Button>
            <div className="relative">
              <Button
                variant="ghost"
                size="icon"
                className="p-2 rounded-md text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <Bell className="h-5 w-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-primary-500 rounded-full"></span>
                <span className="sr-only">Notifications</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
