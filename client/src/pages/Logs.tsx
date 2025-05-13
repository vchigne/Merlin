import { useState, useEffect } from "react";
import { useLogEntries } from "@/hooks/use-log-entries";
import { useLocation } from "wouter";
import LogEntry from "@/components/logs/LogEntry";
import LogFilter from "@/components/logs/LogFilter";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  RefreshCw,
  FileText,
  Download,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Pagination } from "@/components/ui/pagination";
import { formatDate } from "@/lib/utils";

export default function Logs() {
  const [location] = useLocation();
  const [filters, setFilters] = useState({
    search: "",
    level: "all", // Cambiamos de "" a "all" para evitar errores en los selectores
    pipelineId: "",
    agentId: "",
    jobId: "",
    dateFrom: undefined as Date | undefined,
    dateTo: undefined as Date | undefined,
  });
  const [page, setPage] = useState(1);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const limit = 15;
  const offset = (page - 1) * limit;
  
  // Extract query parameters if present
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const jobId = params.get("jobId");
    const pipelineId = params.get("pipelineId");
    const agentId = params.get("agentId");
    const level = params.get("level");
    
    if (jobId || pipelineId || agentId || level) {
      setFilters(prev => ({
        ...prev,
        jobId: jobId || "",
        pipelineId: pipelineId || "",
        agentId: agentId || "",
        level: level || ""
      }));
    }
  }, [location]);
  
  // Fetch logs
  const {
    data: logsData,
    isLoading,
    error,
    refetch
  } = useLogEntries({
    limit,
    offset,
    level: filters.level || undefined,
    search: filters.search || undefined,
    pipelineId: filters.pipelineId || undefined,
    agentId: filters.agentId || undefined,
    jobId: filters.jobId || undefined,
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo
  });
  
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setTimeout(() => setIsRefreshing(false), 500);
  };
  
  const handleFilterChange = (newFilters: any) => {
    setFilters(newFilters);
    setPage(1); // Reset to first page when filters change
  };
  
  const handleResetFilters = () => {
    setFilters({
      search: "",
      level: "",
      pipelineId: "",
      agentId: "",
      jobId: "",
      dateFrom: undefined,
      dateTo: undefined,
    });
    setPage(1);
  };
  
  // Export logs to CSV
  const exportLogs = () => {
    if (!logsData?.logs) return;
    
    const headers = ["ID", "Date", "Level", "Message", "Job ID", "Unit ID"];
    const csvContent = [
      headers.join(","),
      ...logsData.logs.map(log => {
        const date = formatDate(log.date || log.created_at);
        const level = log.level || "INFO";
        const message = (log.message || "").replace(/,/g, " ").replace(/\n/g, " ");
        const jobId = log.pipeline_job_id || "";
        const unitId = log.pipeline_unit_id || "";
        
        return [
          log.id,
          date,
          level,
          `"${message}"`,
          `"${jobId}"`,
          `"${unitId}"`
        ].join(",");
      })
    ].join("\n");
    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `merlin_logs_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  // Calculate pagination
  const totalPages = logsData?.totalCount
    ? Math.ceil(logsData.totalCount / limit)
    : 0;
  
  return (
    <div className="space-y-6">
      {/* Page title */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
        <div>
          <h1 className="text-2xl font-bold dark:text-white">Logs</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            View and search through system logs
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={exportLogs}
            disabled={isLoading || !logsData?.logs || logsData.logs.length === 0}
          >
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading || isRefreshing}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>
      
      {/* Filters */}
      <LogFilter
        onFilter={handleFilterChange}
        onReset={handleResetFilters}
        filters={filters}
        loading={isLoading}
      />
      
      {/* Logs list */}
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-[100px] w-full rounded-lg" />
          ))}
        </div>
      ) : error ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-10">
            <p className="text-red-500 mb-4">Error loading logs: {(error as Error).message}</p>
            <Button onClick={handleRefresh}>Try Again</Button>
          </CardContent>
        </Card>
      ) : !logsData?.logs || logsData.logs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-10">
            <FileText className="h-16 w-16 text-slate-300 dark:text-slate-600 mb-4" />
            <p className="text-slate-500 dark:text-slate-400 mb-2">
              {Object.values(filters).some(v => v !== "" && v !== undefined)
                ? "No logs match your filters"
                : "No logs found"}
            </p>
            {Object.values(filters).some(v => v !== "" && v !== undefined) && (
              <Button variant="outline" onClick={handleResetFilters}>
                Clear Filters
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Log Results</CardTitle>
            </CardHeader>
            <CardContent className="p-0 divide-y divide-slate-200 dark:divide-slate-700">
              {logsData.logs.map((log) => (
                <div key={log.id} className="px-4 py-2">
                  <LogEntry log={log} />
                </div>
              ))}
            </CardContent>
          </Card>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-slate-500 dark:text-slate-400">
                Showing {offset + 1}-{Math.min(offset + logsData.logs.length, logsData.totalCount)} of {logsData.totalCount} logs
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
                  disabled={page === totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
