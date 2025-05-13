import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import Header from "./Header";
import Sidebar from "./Sidebar";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useMobile } from "@/hooks/use-mobile";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [location] = useLocation();
  const { toast } = useToast();
  const isMobile = useMobile();

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  // Check if mobile on first render and collapse sidebar
  useEffect(() => {
    if (isMobile) {
      setSidebarCollapsed(true);
    }
  }, [isMobile]);

  // Update page title based on route
  useEffect(() => {
    let title = "Merlin Observer";
    if (location === "/") {
      title += " - Dashboard";
    } else {
      // Convert path to title case
      const page = location.split("/")[1];
      if (page) {
        const pageTitle = page.charAt(0).toUpperCase() + page.slice(1);
        title += ` - ${pageTitle}`;
      }
    }
    document.title = title;
  }, [location]);

  // Show welcome toast on first render
  useEffect(() => {
    toast({
      title: "Welcome to Merlin Observer",
      description: "Monitoring system connected and ready",
      duration: 5000,
    });
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar collapsed={sidebarCollapsed} toggleSidebar={toggleSidebar} />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header toggleSidebar={toggleSidebar} />
        <main className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-900">
          <div className="p-4 md:p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
