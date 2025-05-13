import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectGroup, 
  SelectItem, 
  SelectLabel, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { 
  Filter, 
  X, 
  Search,
  ChevronsUpDown,
  Calendar,
  RotateCcw
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";

interface LogFilterProps {
  onFilter: (filters: any) => void;
  onReset: () => void;
  filters: any;
  loading?: boolean;
}

export default function LogFilter({ onFilter, onReset, filters, loading = false }: LogFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [localFilters, setLocalFilters] = useState({
    level: filters.level || "",
    search: filters.search || "",
    dateFrom: filters.dateFrom ? new Date(filters.dateFrom) : undefined,
    dateTo: filters.dateTo ? new Date(filters.dateTo) : undefined,
    pipelineId: filters.pipelineId || "",
    agentId: filters.agentId || "",
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalFilters({
      ...localFilters,
      [e.target.name]: e.target.value
    });
  };

  const handleSelectChange = (name: string, value: string) => {
    setLocalFilters({
      ...localFilters,
      [name]: value
    });
  };

  const handleDateChange = (name: string, date: Date | undefined) => {
    setLocalFilters({
      ...localFilters,
      [name]: date
    });
  };

  const handleApplyFilters = () => {
    onFilter(localFilters);
    setIsOpen(false);
  };

  const handleResetFilters = () => {
    setLocalFilters({
      level: "",
      search: "",
      dateFrom: undefined,
      dateTo: undefined,
      pipelineId: "",
      agentId: "",
    });
    onReset();
  };

  // Count active filters
  const activeFilterCount = Object.values(filters).filter(
    (value) => value !== "" && value !== undefined
  ).length;

  return (
    <div className="mb-4">
      <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
        <div className="relative flex-1">
          <Input
            placeholder="Search logs..."
            value={filters.search || ""}
            onChange={(e) => onFilter({ ...filters, search: e.target.value })}
            className="pr-10"
          />
          <Search className="absolute right-3 top-2.5 h-4 w-4 text-slate-400" />
        </div>
        
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="relative">
              <Filter className="h-4 w-4 mr-2" />
              Filters
              {activeFilterCount > 0 && (
                <span className="ml-1 rounded-full bg-primary-500 px-1.5 py-0.5 text-xs text-white">
                  {activeFilterCount}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 sm:w-96">
            <div className="space-y-4">
              <h3 className="font-medium text-slate-900 dark:text-white flex items-center justify-between">
                Filter Logs
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleResetFilters}
                  disabled={loading}
                  className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white h-7 px-2"
                >
                  <RotateCcw className="h-3.5 w-3.5 mr-1" />
                  Reset
                </Button>
              </h3>
              
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="log-level">Log Level</Label>
                  <Select
                    value={localFilters.level}
                    onValueChange={(value) => handleSelectChange("level", value)}
                  >
                    <SelectTrigger id="log-level">
                      <SelectValue placeholder="All levels" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All levels</SelectItem>
                      <SelectItem value="INFO">Info</SelectItem>
                      <SelectItem value="WARN">Warning</SelectItem>
                      <SelectItem value="ERROR">Error</SelectItem>
                      <SelectItem value="FATAL">Fatal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label>From Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                        >
                          <Calendar className="h-4 w-4 mr-2" />
                          {localFilters.dateFrom ? (
                            format(localFilters.dateFrom, "PPP")
                          ) : (
                            <span className="text-slate-500 dark:text-slate-400">Pick a date</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <CalendarComponent
                          mode="single"
                          selected={localFilters.dateFrom}
                          onSelect={(date) => handleDateChange("dateFrom", date)}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  
                  <div className="space-y-1">
                    <Label>To Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                        >
                          <Calendar className="h-4 w-4 mr-2" />
                          {localFilters.dateTo ? (
                            format(localFilters.dateTo, "PPP")
                          ) : (
                            <span className="text-slate-500 dark:text-slate-400">Pick a date</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <CalendarComponent
                          mode="single"
                          selected={localFilters.dateTo}
                          onSelect={(date) => handleDateChange("dateTo", date)}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                
                <Accordion type="single" collapsible>
                  <AccordionItem value="advanced">
                    <AccordionTrigger className="py-2">Advanced Filters</AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3 pt-2">
                        <div className="space-y-1">
                          <Label htmlFor="pipeline-id">Pipeline ID</Label>
                          <Input
                            id="pipeline-id"
                            name="pipelineId"
                            placeholder="Filter by pipeline ID"
                            value={localFilters.pipelineId}
                            onChange={handleInputChange}
                          />
                        </div>
                        
                        <div className="space-y-1">
                          <Label htmlFor="agent-id">Agent ID</Label>
                          <Input
                            id="agent-id"
                            name="agentId"
                            placeholder="Filter by agent ID"
                            value={localFilters.agentId}
                            onChange={handleInputChange}
                          />
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
                
                <div className="flex justify-end space-x-2 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => setIsOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleApplyFilters}
                    disabled={loading}
                  >
                    Apply Filters
                  </Button>
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>
        
        {activeFilterCount > 0 && (
          <Button 
            variant="ghost" 
            size="icon"
            onClick={handleResetFilters}
            disabled={loading}
            className="flex-shrink-0"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Clear filters</span>
          </Button>
        )}
      </div>
      
      {/* Active filter badges */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {filters.level && (
            <Badge variant="outline" className="flex items-center space-x-1">
              Level: {filters.level}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onFilter({ ...filters, level: "" })}
                className="h-4 w-4 ml-1 p-0"
              >
                <X className="h-3 w-3" />
                <span className="sr-only">Remove filter</span>
              </Button>
            </Badge>
          )}
          
          {filters.dateFrom && (
            <Badge variant="outline" className="flex items-center space-x-1">
              From: {format(new Date(filters.dateFrom), "MM/dd/yyyy")}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onFilter({ ...filters, dateFrom: undefined })}
                className="h-4 w-4 ml-1 p-0"
              >
                <X className="h-3 w-3" />
                <span className="sr-only">Remove filter</span>
              </Button>
            </Badge>
          )}
          
          {filters.dateTo && (
            <Badge variant="outline" className="flex items-center space-x-1">
              To: {format(new Date(filters.dateTo), "MM/dd/yyyy")}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onFilter({ ...filters, dateTo: undefined })}
                className="h-4 w-4 ml-1 p-0"
              >
                <X className="h-3 w-3" />
                <span className="sr-only">Remove filter</span>
              </Button>
            </Badge>
          )}
          
          {filters.pipelineId && (
            <Badge variant="outline" className="flex items-center space-x-1">
              Pipeline: {filters.pipelineId.substring(0, 8)}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onFilter({ ...filters, pipelineId: "" })}
                className="h-4 w-4 ml-1 p-0"
              >
                <X className="h-3 w-3" />
                <span className="sr-only">Remove filter</span>
              </Button>
            </Badge>
          )}
          
          {filters.agentId && (
            <Badge variant="outline" className="flex items-center space-x-1">
              Agent: {filters.agentId.substring(0, 8)}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onFilter({ ...filters, agentId: "" })}
                className="h-4 w-4 ml-1 p-0"
              >
                <X className="h-3 w-3" />
                <span className="sr-only">Remove filter</span>
              </Button>
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
