import { useEffect } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { NotificationProvider } from "@/context/NotificationContext";
import { MerlinProvider } from "@/context/MerlinContext";
import Layout from "@/components/Layout";
import Dashboard from "@/pages/Dashboard";
import Agents from "@/pages/Agents";
import Pipelines from "@/pages/Pipelines";
import Jobs from "@/pages/Jobs";
import Logs from "@/pages/Logs";
import Explorer from "@/pages/Explorer";
import AgentDetails from "@/pages/AgentDetails";
import PipelineDetails from "@/pages/PipelineDetails";
import Connections from "@/pages/Connections";
import SFTPLinkDetail from "@/pages/SFTPLinkDetail";
import SQLConnectionDetail from "@/pages/SQLConnectionDetail";
import CommandDetail from "@/pages/CommandDetail";
import NotFound from "@/pages/not-found";
import { initializeSocket } from "./lib/socket";

// Initialize websocket connection
initializeSocket();

function Router() {
  useEffect(() => {
    // Set page title
    document.title = "Merlin Observer - Dashboard";
    
    // Clean up socket connection on unmount
    return () => {
      // Socket cleanup handled by the socket module
    };
  }, []);

  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/agents" component={Agents} />
        <Route path="/agents/:id" component={AgentDetails} />
        <Route path="/pipelines" component={Pipelines} />
        <Route path="/pipelines/:id" component={PipelineDetails} />
        <Route path="/jobs" component={Jobs} />
        <Route path="/jobs/:id" component={PipelineDetails} />
        <Route path="/logs" component={Logs} />
        <Route path="/explorer" component={Explorer} />
        <Route path="/connections" component={Connections} />
        <Route path="/connections/sftp/:id" component={SFTPLinkDetail} />
        <Route path="/connections/sql/:id" component={SQLConnectionDetail} />
        <Route path="/connections/command/:id" component={CommandDetail} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="system" storageKey="merlin-theme">
        <NotificationProvider>
          <MerlinProvider>
            <TooltipProvider>
              <Toaster />
              <Router />
            </TooltipProvider>
          </MerlinProvider>
        </NotificationProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
