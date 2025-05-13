import { useState } from "react";
import { useJobs } from "@/hooks/use-jobs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  RefreshCw,
  Search,
  Filter,
  ListChecks,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import JobItem from "@/components/jobs/JobItem";
import JobQueue from "@/components/jobs/JobQueue";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";

export default function Jobs() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  
  const limit = 10;
  const offset = (page - 1) * limit;
  
  // Build filters for the API
  const apiFilters = {
    status: statusFilter as 'completed' | 'running' | 'error' | 'all' | undefined
  };
  
  // Fetch jobs
  const {
    data: jobsData,
    isLoading,
    error,
    refetch
  } = useJobs({
    limit,
    offset,
    filters: apiFilters
  });
  
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setTimeout(() => setIsRefreshing(false), 500);
  };
  
  // Filter jobs based on search and date range
  const filteredJobs = jobsData?.jobs.filter(job => {
    // Search filter
    const nameMatch = 
      (job.Pipeline?.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (job.AgentPassport?.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.id.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Date range filter
    const jobDate = new Date(job.created_at);
    const dateFromMatch = !dateFrom || jobDate >= dateFrom;
    const dateToMatch = !dateTo || jobDate <= dateTo;
    
    return nameMatch && dateFromMatch && dateToMatch;
  }) || [];
  
  // Calculate pagination
  const totalPages = jobsData && filteredJobs.length > 0
    ? Math.ceil(jobsData.totalCount / limit)
    : 0;
  
  return (
    <div className="space-y-6">
      {/* Page title */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
        <div>
          <h1 className="text-2xl font-bold dark:text-white">Jobs Queue</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Monitor and track pipeline job executions
          </p>
        </div>
        <div className="flex items-center space-x-2">
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
      
      {/* Tabs */}
      <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="active">Active Jobs</TabsTrigger>
          <TabsTrigger value="all">All Jobs</TabsTrigger>
        </TabsList>
        
        {/* Active Jobs Tab */}
        <TabsContent value="active" className="mt-6">
          <JobQueue />
        </TabsContent>
        
        {/* All Jobs Tab */}
        <TabsContent value="all" className="mt-6 space-y-6">
          {/* Search and filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search jobs..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="flex flex-wrap gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Status</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="running">Running</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                </SelectContent>
              </Select>
              
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-[150px] pl-3 text-left font-normal">
                    {dateFrom ? (
                      format(dateFrom, "PPP")
                    ) : (
                      <span>From Date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateFrom}
                    onSelect={setDateFrom}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-[150px] pl-3 text-left font-normal">
                    {dateTo ? (
                      format(dateTo, "PPP")
                    ) : (
                      <span>To Date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateTo}
                    onSelect={setDateTo}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          
          {/* Active filters */}
          {(searchTerm || statusFilter || dateFrom || dateTo) && (
            <div className="flex flex-wrap gap-2">
              {searchTerm && (
                <Badge variant="outline" className="flex items-center space-x-1">
                  Search: {searchTerm}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSearchTerm("")}
                    className="h-4 w-4 ml-1 p-0"
                  >
                    <span className="sr-only">Remove filter</span>
                    ×
                  </Button>
                </Badge>
              )}
              
              {statusFilter && (
                <Badge variant="outline" className="flex items-center space-x-1">
                  Status: {statusFilter}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setStatusFilter("")}
                    className="h-4 w-4 ml-1 p-0"
                  >
                    <span className="sr-only">Remove filter</span>
                    ×
                  </Button>
                </Badge>
              )}
              
              {dateFrom && (
                <Badge variant="outline" className="flex items-center space-x-1">
                  From: {format(dateFrom, "MMM d, yyyy")}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDateFrom(undefined)}
                    className="h-4 w-4 ml-1 p-0"
                  >
                    <span className="sr-only">Remove filter</span>
                    ×
                  </Button>
                </Badge>
              )}
              
              {dateTo && (
                <Badge variant="outline" className="flex items-center space-x-1">
                  To: {format(dateTo, "MMM d, yyyy")}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDateTo(undefined)}
                    className="h-4 w-4 ml-1 p-0"
                  >
                    <span className="sr-only">Remove filter</span>
                    ×
                  </Button>
                </Badge>
              )}
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchTerm("");
                  setStatusFilter("");
                  setDateFrom(undefined);
                  setDateTo(undefined);
                }}
                className="text-xs h-6"
              >
                Clear all filters
              </Button>
            </div>
          )}
          
          {/* Jobs list */}
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton key={index} className="h-[100px] w-full rounded-lg" />
              ))}
            </div>
          ) : error ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-10">
                <p className="text-red-500 mb-4">Error loading job data</p>
                <Button onClick={handleRefresh}>Try Again</Button>
              </CardContent>
            </Card>
          ) : filteredJobs.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-10">
                <ListChecks className="h-16 w-16 text-slate-300 dark:text-slate-600 mb-4" />
                <p className="text-slate-500 dark:text-slate-400 mb-2">
                  {searchTerm || statusFilter || dateFrom || dateTo
                    ? "No jobs match your filters"
                    : "No jobs found"}
                </p>
                {(searchTerm || statusFilter || dateFrom || dateTo) && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearchTerm("");
                      setStatusFilter("");
                      setDateFrom(undefined);
                      setDateTo(undefined);
                    }}
                  >
                    Clear Filters
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="space-y-4">
                {filteredJobs.map((job) => (
                  <JobItem key={job.id} job={job} compact={true} />
                ))}
              </div>
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6">
                  <div className="text-sm text-slate-500 dark:text-slate-400">
                    Showing {offset + 1}-{Math.min(offset + filteredJobs.length, jobsData?.totalCount || 0)} of {jobsData?.totalCount} jobs
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
