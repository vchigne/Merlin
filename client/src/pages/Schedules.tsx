import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { executeQuery } from "@/lib/hasura-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter,
  DialogTrigger
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { 
  Clock, 
  Calendar, 
  CalendarDays, 
  Plus, 
  Trash2, 
  Play,
  Pause,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Settings2,
  Upload,
  FileCode,
  Pencil,
  X,
  Search,
  Filter,
  Check,
  ChevronsUpDown
} from "lucide-react";
import type { ScheduleConfig, ScheduleTarget } from "@shared/schema";

interface ScheduleWithTargets extends ScheduleConfig {
  targets: ScheduleTarget[];
}

interface Pipeline {
  id: string;
  name: string;
  agent_passport_id?: string;
  AgentPassport?: { name: string };
}

const DAYS_OF_WEEK = [
  { value: 0, label: "Lun" },
  { value: 1, label: "Mar" },
  { value: 2, label: "Mié" },
  { value: 3, label: "Jue" },
  { value: 4, label: "Vie" },
  { value: 5, label: "Sáb" },
  { value: 6, label: "Dom" },
];

function getFrequencyLabel(schedule: ScheduleConfig): string {
  switch (schedule.frequencyType) {
    case "daily":
      return "Diario";
    case "weekly":
      if (schedule.daysOfWeek) {
        const days = schedule.daysOfWeek.split(",").map(Number);
        const dayLabels = days.map(d => DAYS_OF_WEEK.find(dw => dw.value === d)?.label || d);
        return `Semanal (${dayLabels.join(", ")})`;
      }
      return "Semanal";
    case "monthly":
      if (schedule.daysOfMonth) {
        return `Mensual (días ${schedule.daysOfMonth})`;
      }
      return "Mensual";
    default:
      return schedule.frequencyType || "Desconocido";
  }
}

function getNextExecution(schedule: ScheduleConfig): Date | null {
  if (!schedule.enabled) return null;
  
  const now = new Date();
  const [hours, minutes] = schedule.timeOfDay.split(":").map(Number);
  
  const next = new Date();
  next.setHours(hours, minutes, 0, 0);
  
  if (next <= now) {
    next.setDate(next.getDate() + 1);
  }
  
  if (schedule.frequencyType === "weekly" && schedule.daysOfWeek) {
    const allowedDays = schedule.daysOfWeek.split(",").map(Number);
    while (!allowedDays.includes(next.getDay() === 0 ? 6 : next.getDay() - 1)) {
      next.setDate(next.getDate() + 1);
    }
  }
  
  if (schedule.frequencyType === "monthly" && schedule.daysOfMonth) {
    const allowedDays = schedule.daysOfMonth.split(",").map(Number);
    while (!allowedDays.includes(next.getDate())) {
      next.setDate(next.getDate() + 1);
    }
  }
  
  return next;
}

function formatTimeUntil(date: Date): string {
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `en ${days}d ${hours % 24}h`;
  }
  if (hours > 0) {
    return `en ${hours}h ${minutes}m`;
  }
  return `en ${minutes}m`;
}

function getSchedulesForDay(schedules: ScheduleWithTargets[], date: Date): ScheduleWithTargets[] {
  const jsDayOfWeek = date.getDay();
  const mondayBasedDay = jsDayOfWeek === 0 ? 6 : jsDayOfWeek - 1;
  const dayOfMonth = date.getDate();

  return schedules.filter(schedule => {
    if (!schedule.enabled) return false;
    
    switch (schedule.frequencyType) {
      case "daily":
        return true;
      case "weekly":
        if (schedule.daysOfWeek) {
          const allowedDays = schedule.daysOfWeek.split(",").map(Number);
          return allowedDays.includes(mondayBasedDay);
        }
        return false;
      case "monthly":
        if (schedule.daysOfMonth) {
          const allowedDays = schedule.daysOfMonth.split(",").map(Number);
          return allowedDays.includes(dayOfMonth);
        }
        return false;
      default:
        return false;
    }
  });
}

function getCalendarDays(month: Date): (Date | null)[] {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const firstDay = new Date(year, monthIndex, 1);
  const lastDay = new Date(year, monthIndex + 1, 0);
  
  const startOffset = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
  const days: (Date | null)[] = [];
  
  for (let i = 0; i < startOffset; i++) {
    days.push(null);
  }
  
  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push(new Date(year, monthIndex, d));
  }
  
  return days;
}

const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

export default function Schedules() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("schedules");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ScheduleWithTargets | null>(null);
  const [importContent, setImportContent] = useState("");
  const [newSchedule, setNewSchedule] = useState({
    label: "",
    timeOfDay: "00:00",
    frequencyType: "daily" as "daily" | "weekly" | "monthly",
    daysOfWeek: "",
    daysOfMonth: "",
    enabled: true,
  });
  const [editForm, setEditForm] = useState({
    label: "",
    timeOfDay: "00:00",
    frequencyType: "daily" as "daily" | "weekly" | "monthly",
    daysOfWeek: "",
    daysOfMonth: "",
    enabled: true,
  });

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [frequencyFilter, setFrequencyFilter] = useState<"all" | "daily" | "weekly" | "monthly">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "enabled" | "disabled">("all");

  // Confirmation dialogs
  const [deleteScheduleConfirm, setDeleteScheduleConfirm] = useState<number | null>(null);
  const [deleteTargetConfirm, setDeleteTargetConfirm] = useState<{ scheduleId: number; targetId: number; targetName: string } | null>(null);

  // Pipeline selector popover
  const [pipelinePopoverOpen, setPipelinePopoverOpen] = useState(false);
  const [pipelineSearch, setPipelineSearch] = useState("");

  // Calendar state
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [calendarTab, setCalendarTab] = useState<"scheduled" | "history">("scheduled");

  // Fetch schedules
  const { data: schedules, isLoading: isLoadingSchedules, refetch: refetchSchedules } = useQuery<ScheduleWithTargets[]>({
    queryKey: ['/api/schedules'],
  });

  // Fetch pipelines from Hasura for pipeline selector
  const { data: pipelines } = useQuery<Pipeline[]>({
    queryKey: ['/api/pipelines/all'],
    queryFn: async () => {
      const result = await executeQuery(`
        query GetAllPipelines {
          merlin_agent_Pipeline(order_by: {name: asc}) {
            id
            name
            agent_passport_id
            AgentPassport {
              name
            }
          }
        }
      `);
      return result.data?.merlin_agent_Pipeline || [];
    },
  });

  // Fetch running jobs from Hasura
  const { data: runningJobs, isLoading: isLoadingJobs, refetch: refetchJobs } = useQuery({
    queryKey: ['/api/jobs/queue'],
    queryFn: async () => {
      const result = await executeQuery(`
        query GetJobQueue {
          pending: merlin_agent_PipelineJobQueue(
            where: {running: {_eq: false}, completed: {_eq: false}, aborted: {_eq: false}}
            order_by: {created_at: asc}
            limit: 50
          ) {
            id
            pipeline_id
            created_at
            Pipeline { name }
          }
          running: merlin_agent_PipelineJobQueue(
            where: {running: {_eq: true}, completed: {_eq: false}, aborted: {_eq: false}}
            order_by: {created_at: asc}
            limit: 50
          ) {
            id
            pipeline_id
            created_at
            updated_at
            Pipeline { name }
          }
        }
      `);
      return {
        pending: result.data?.pending || [],
        running: result.data?.running || [],
      };
    },
    refetchInterval: 5000,
  });

  // Fetch job history for selected day (use UTC boundaries to match server timestamps)
  const selectedDayStart = selectedDay 
    ? new Date(Date.UTC(selectedDay.getFullYear(), selectedDay.getMonth(), selectedDay.getDate(), 0, 0, 0)).toISOString() 
    : null;
  const selectedDayEnd = selectedDay 
    ? new Date(Date.UTC(selectedDay.getFullYear(), selectedDay.getMonth(), selectedDay.getDate(), 23, 59, 59, 999)).toISOString() 
    : null;
  
  const { data: dayJobHistory, isLoading: isLoadingDayHistory } = useQuery({
    queryKey: ['/api/jobs/history', selectedDayStart],
    queryFn: async () => {
      if (!selectedDayStart || !selectedDayEnd) return { jobs: [] };
      
      console.log('Fetching job history for:', { startDate: selectedDayStart, endDate: selectedDayEnd });
      
      const result = await executeQuery(`
        query GetDayJobHistory($startDate: timestamptz!, $endDate: timestamptz!) {
          jobs: merlin_agent_PipelineJobQueue(
            where: {
              created_at: {_gte: $startDate, _lte: $endDate}
            }
            order_by: {created_at: desc}
            limit: 100
          ) {
            id
            pipeline_id
            created_at
            updated_at
            running
            completed
            aborted
            Pipeline { 
              name 
              AgentPassport { name }
            }
          }
        }
      `, { startDate: selectedDayStart, endDate: selectedDayEnd });
      
      console.log('Job history result:', result.data?.jobs?.length || 0, 'jobs found');
      
      return {
        jobs: result.data?.jobs || [],
      };
    },
    enabled: !!selectedDay && calendarTab === "history",
  });

  // Create schedule mutation
  const createScheduleMutation = useMutation({
    mutationFn: async (data: typeof newSchedule) => {
      return apiRequest('POST', '/api/schedules', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/schedules'] });
      setIsCreateDialogOpen(false);
      setNewSchedule({
        label: "",
        timeOfDay: "00:00",
        frequencyType: "daily",
        daysOfWeek: "",
        daysOfMonth: "",
        enabled: true,
      });
      toast({ title: "Schedule creado", description: "El schedule se ha creado correctamente" });
    },
    onError: () => {
      toast({ title: "Error", description: "No se pudo crear el schedule", variant: "destructive" });
    },
  });

  // Toggle schedule enabled mutation
  const toggleScheduleMutation = useMutation({
    mutationFn: async ({ id, enabled }: { id: number; enabled: boolean }) => {
      return apiRequest('PATCH', `/api/schedules/${id}`, { enabled });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/schedules'] });
    },
  });

  // Delete schedule mutation
  const deleteScheduleMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest('DELETE', `/api/schedules/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/schedules'] });
      setDeleteScheduleConfirm(null);
      toast({ title: "Schedule eliminado" });
    },
  });

  // Import schedules from scheduler.py mutation
  const importSchedulesMutation = useMutation({
    mutationFn: async (content: string) => {
      const response = await apiRequest('POST', '/api/schedules/parse-and-import', { content });
      return response.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/schedules'] });
      setIsImportDialogOpen(false);
      setImportContent("");
      toast({ 
        title: "Importación exitosa", 
        description: `Se importaron ${data.imported} schedules con ${data.totalPipelines} pipelines` 
      });
    },
    onError: () => {
      toast({ title: "Error", description: "No se pudo importar el archivo", variant: "destructive" });
    },
  });

  // Update schedule mutation
  const updateScheduleMutation = useMutation({
    mutationFn: async (data: { id: number } & Partial<typeof editForm>) => {
      const { id, ...updates } = data;
      return apiRequest('PATCH', `/api/schedules/${id}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/schedules'] });
      setIsEditDialogOpen(false);
      setEditingSchedule(null);
      toast({ title: "Schedule actualizado", description: "Los cambios se han guardado correctamente" });
    },
    onError: () => {
      toast({ title: "Error", description: "No se pudo actualizar el schedule", variant: "destructive" });
    },
  });

  // Delete target mutation
  const deleteTargetMutation = useMutation({
    mutationFn: async ({ scheduleId, targetId }: { scheduleId: number; targetId: number }) => {
      return apiRequest('DELETE', `/api/schedules/${scheduleId}/targets/${targetId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/schedules'] });
      setDeleteTargetConfirm(null);
      toast({ title: "Pipeline eliminado del schedule" });
    },
    onError: () => {
      toast({ title: "Error", description: "No se pudo eliminar el pipeline", variant: "destructive" });
    },
  });

  // Add target mutation
  const addTargetMutation = useMutation({
    mutationFn: async ({ scheduleId, pipelineId, pipelineName, clientName }: { scheduleId: number; pipelineId: string; pipelineName?: string; clientName?: string }) => {
      return apiRequest('POST', `/api/schedules/${scheduleId}/targets`, { pipelineId, pipelineName, clientName });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/schedules'] });
      toast({ title: "Pipeline agregado al schedule" });
    },
    onError: () => {
      toast({ title: "Error", description: "No se pudo agregar el pipeline", variant: "destructive" });
    },
  });

  // Open edit dialog
  const openEditDialog = (schedule: ScheduleWithTargets) => {
    setEditingSchedule(schedule);
    setEditForm({
      label: schedule.label,
      timeOfDay: schedule.timeOfDay,
      frequencyType: schedule.frequencyType as "daily" | "weekly" | "monthly",
      daysOfWeek: schedule.daysOfWeek || "",
      daysOfMonth: schedule.daysOfMonth || "",
      enabled: schedule.enabled ?? true,
    });
    setIsEditDialogOpen(true);
  };

  // Sync editingSchedule with updated data after mutations
  useEffect(() => {
    if (editingSchedule && schedules) {
      const updated = schedules.find(s => s.id === editingSchedule.id);
      if (updated) {
        setEditingSchedule(updated);
      }
    }
  }, [schedules]);

  // Filter schedules
  const filteredSchedules = useMemo(() => {
    if (!schedules) return [];
    return schedules.filter(s => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesLabel = s.label.toLowerCase().includes(query);
        const matchesTime = s.timeOfDay.includes(query);
        const matchesPipeline = s.targets.some(t => 
          t.pipelineName?.toLowerCase().includes(query) || 
          t.pipelineId.toLowerCase().includes(query)
        );
        if (!matchesLabel && !matchesTime && !matchesPipeline) return false;
      }
      // Frequency filter
      if (frequencyFilter !== "all" && s.frequencyType !== frequencyFilter) return false;
      // Status filter
      if (statusFilter === "enabled" && !s.enabled) return false;
      if (statusFilter === "disabled" && s.enabled) return false;
      return true;
    });
  }, [schedules, searchQuery, frequencyFilter, statusFilter]);

  // Group schedules by time
  const schedulesByTime = useMemo(() => {
    const grouped: Record<string, ScheduleWithTargets[]> = {};
    filteredSchedules.forEach(s => {
      if (!grouped[s.timeOfDay]) {
        grouped[s.timeOfDay] = [];
      }
      grouped[s.timeOfDay].push(s);
    });
    return grouped;
  }, [filteredSchedules]);

  // Calculate upcoming executions
  const upcomingExecutions = useMemo(() => {
    if (!schedules) return [];
    
    const executions: { schedule: ScheduleWithTargets; nextRun: Date }[] = [];
    
    schedules.forEach(schedule => {
      if (!schedule.enabled) return;
      const nextRun = getNextExecution(schedule);
      if (nextRun) {
        executions.push({ schedule, nextRun });
      }
    });
    
    return executions.sort((a, b) => a.nextRun.getTime() - b.nextRun.getTime()).slice(0, 20);
  }, [schedules]);

  const sortedTimes = Object.keys(schedulesByTime).sort();

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Programación de Tareas</h1>
          <p className="text-muted-foreground">Gestiona la programación automática de pipelines</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => { refetchSchedules(); refetchJobs(); }}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualizar
          </Button>
          <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Upload className="h-4 w-4 mr-2" />
                Importar
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <FileCode className="h-5 w-5" />
                  Importar desde scheduler.py
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Pega el contenido del archivo scheduler.py</Label>
                  <Textarea 
                    value={importContent}
                    onChange={(e) => setImportContent(e.target.value)}
                    placeholder="def cron_00_00_am_PE():..."
                    className="h-64 font-mono text-sm"
                  />
                </div>
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                  <p className="text-sm text-amber-600 dark:text-amber-400">
                    La importación reemplazará todos los schedules existentes. Asegúrate de tener una copia de respaldo si es necesario.
                  </p>
                </div>
                <p className="text-sm text-muted-foreground">
                  El parser extraerá automáticamente los schedules, horarios y pipelines del archivo Python.
                </p>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsImportDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button 
                  onClick={() => importSchedulesMutation.mutate(importContent)}
                  disabled={!importContent || importSchedulesMutation.isPending}
                >
                  {importSchedulesMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Importar Schedules
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Schedule
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Crear nuevo Schedule</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Nombre</Label>
                  <Input 
                    value={newSchedule.label}
                    onChange={(e) => setNewSchedule(s => ({ ...s, label: e.target.value }))}
                    placeholder="Ej: Cron 12:00 AM Peru"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Hora de ejecución</Label>
                  <Input 
                    type="time"
                    value={newSchedule.timeOfDay}
                    onChange={(e) => setNewSchedule(s => ({ ...s, timeOfDay: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Frecuencia</Label>
                  <Select 
                    value={newSchedule.frequencyType}
                    onValueChange={(v) => setNewSchedule(s => ({ ...s, frequencyType: v as any }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Diario</SelectItem>
                      <SelectItem value="weekly">Semanal</SelectItem>
                      <SelectItem value="monthly">Mensual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {newSchedule.frequencyType === "weekly" && (
                  <div className="space-y-2">
                    <Label>Días de la semana (0=Lun, 6=Dom, separados por coma)</Label>
                    <Input 
                      value={newSchedule.daysOfWeek}
                      onChange={(e) => setNewSchedule(s => ({ ...s, daysOfWeek: e.target.value }))}
                      placeholder="0,1,2,3,4"
                    />
                  </div>
                )}
                {newSchedule.frequencyType === "monthly" && (
                  <div className="space-y-2">
                    <Label>Días del mes (separados por coma)</Label>
                    <Input 
                      value={newSchedule.daysOfMonth}
                      onChange={(e) => setNewSchedule(s => ({ ...s, daysOfMonth: e.target.value }))}
                      placeholder="1,15,30"
                    />
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button 
                  onClick={() => createScheduleMutation.mutate(newSchedule)}
                  disabled={!newSchedule.label || createScheduleMutation.isPending}
                >
                  {createScheduleMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Crear
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="schedules" className="gap-2">
            <Settings2 className="h-4 w-4" />
            Schedules
          </TabsTrigger>
          <TabsTrigger value="calendar" className="gap-2">
            <CalendarDays className="h-4 w-4" />
            Calendario
          </TabsTrigger>
          <TabsTrigger value="queue" className="gap-2">
            <Clock className="h-4 w-4" />
            Cola
            {runningJobs && (runningJobs.pending.length + runningJobs.running.length) > 0 && (
              <Badge variant="secondary" className="ml-1">
                {runningJobs.pending.length + runningJobs.running.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="upcoming" className="gap-2">
            <Calendar className="h-4 w-4" />
            Próximas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="schedules" className="mt-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-3 mb-4">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, hora o pipeline..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={frequencyFilter} onValueChange={(v) => setFrequencyFilter(v as any)}>
              <SelectTrigger className="w-[140px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Frecuencia" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="daily">Diario</SelectItem>
                <SelectItem value="weekly">Semanal</SelectItem>
                <SelectItem value="monthly">Mensual</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="enabled">Habilitados</SelectItem>
                <SelectItem value="disabled">Deshabilitados</SelectItem>
              </SelectContent>
            </Select>
            {(searchQuery || frequencyFilter !== "all" || statusFilter !== "all") && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => { setSearchQuery(""); setFrequencyFilter("all"); setStatusFilter("all"); }}
              >
                <X className="h-4 w-4 mr-1" />
                Limpiar filtros
              </Button>
            )}
          </div>
          
          {isLoadingSchedules ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : sortedTimes.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <CalendarDays className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No hay schedules configurados</h3>
                <p className="text-muted-foreground mb-4">Crea un schedule para programar la ejecución automática de pipelines</p>
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Crear primer schedule
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {sortedTimes.map(time => (
                <Card key={time}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                      <Clock className="h-5 w-5 text-primary" />
                      <CardTitle className="text-lg">{time}</CardTitle>
                      <Badge variant="outline">{schedulesByTime[time].length} schedules</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {schedulesByTime[time].map(schedule => (
                        <div 
                          key={schedule.id} 
                          className={`flex items-center justify-between p-3 rounded-lg border ${
                            schedule.enabled ? 'bg-card' : 'bg-muted/50 opacity-60'
                          }`}
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{schedule.label}</span>
                              <Badge variant={schedule.frequencyType === "daily" ? "default" : "secondary"}>
                                {getFrequencyLabel(schedule)}
                              </Badge>
                            </div>
                            <div className="text-sm text-muted-foreground mt-1">
                              {schedule.targets.length} pipelines
                              {schedule.targets.length > 0 && (
                                <span className="ml-2">
                                  ({schedule.targets.slice(0, 3).map(t => t.pipelineName || t.pipelineId.slice(0, 8)).join(", ")}
                                  {schedule.targets.length > 3 && ` +${schedule.targets.length - 3} más`})
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={schedule.enabled ?? true}
                              onCheckedChange={(enabled) => toggleScheduleMutation.mutate({ id: schedule.id, enabled })}
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditDialog(schedule)}
                              title="Editar schedule"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleteScheduleConfirm(schedule.id)}
                              title="Eliminar schedule"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="calendar" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1))}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <CardTitle className="text-lg">
                    {MONTH_NAMES[calendarMonth.getMonth()]} {calendarMonth.getFullYear()}
                  </CardTitle>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1))}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setCalendarMonth(new Date());
                    setSelectedDay(null);
                  }}
                >
                  Hoy
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-1 mb-2">
                {DAYS_OF_WEEK.map(day => (
                  <div key={day.value} className="text-center text-sm font-medium text-muted-foreground py-2">
                    {day.label}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {getCalendarDays(calendarMonth).map((day, idx) => {
                  if (!day) {
                    return <div key={`empty-${idx}`} className="aspect-square" />;
                  }
                  
                  const daySchedules = schedules ? getSchedulesForDay(schedules, day) : [];
                  const totalPipelines = daySchedules.reduce((sum, s) => sum + s.targets.length, 0);
                  const isToday = day.toDateString() === new Date().toDateString();
                  const isSelected = selectedDay?.toDateString() === day.toDateString();
                  
                  return (
                    <button
                      key={day.toISOString()}
                      onClick={() => setSelectedDay(isSelected ? null : day)}
                      className={`
                        aspect-square p-1 rounded-lg border transition-colors relative
                        ${isToday ? 'border-primary bg-primary/5' : 'border-transparent hover:border-muted-foreground/30'}
                        ${isSelected ? 'ring-2 ring-primary bg-primary/10' : ''}
                        ${totalPipelines > 0 ? 'bg-muted/50' : ''}
                      `}
                    >
                      <div className={`text-sm font-medium ${isToday ? 'text-primary' : ''}`}>
                        {day.getDate()}
                      </div>
                      {totalPipelines > 0 && (
                        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                          {daySchedules.length <= 3 ? (
                            daySchedules.map((_, i) => (
                              <div key={i} className="w-1.5 h-1.5 rounded-full bg-primary" />
                            ))
                          ) : (
                            <Badge variant="secondary" className="text-[10px] px-1 py-0">
                              {daySchedules.length}
                            </Badge>
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {selectedDay && (
            <Card className="mt-4">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {selectedDay.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </CardTitle>
                  <div className="flex gap-1">
                    <Button
                      variant={calendarTab === "scheduled" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCalendarTab("scheduled")}
                    >
                      <Clock className="h-3 w-3 mr-1" />
                      Programado
                    </Button>
                    <Button
                      variant={calendarTab === "history" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCalendarTab("history")}
                    >
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Historial
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {calendarTab === "scheduled" ? (
                  schedules && getSchedulesForDay(schedules, selectedDay).length > 0 ? (
                    <div className="space-y-3">
                      {getSchedulesForDay(schedules, selectedDay)
                        .sort((a, b) => a.timeOfDay.localeCompare(b.timeOfDay))
                        .map(schedule => (
                          <div key={schedule.id} className="border rounded-lg p-3">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="font-mono">
                                  {schedule.timeOfDay}
                                </Badge>
                                <span className="font-medium">{schedule.label}</span>
                              </div>
                              <Badge variant="secondary">
                                {schedule.targets.length} pipeline{schedule.targets.length !== 1 ? 's' : ''}
                              </Badge>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {schedule.targets.slice(0, 5).map(target => (
                                <Badge key={target.id} variant="outline" className="text-xs">
                                  {target.pipelineName || target.pipelineId.substring(0, 8)}
                                </Badge>
                              ))}
                              {schedule.targets.length > 5 && (
                                <Badge variant="outline" className="text-xs">
                                  +{schedule.targets.length - 5} más
                                </Badge>
                              )}
                            </div>
                          </div>
                        ))
                      }
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-4">
                      No hay ejecuciones programadas para este día
                    </p>
                  )
                ) : (
                  isLoadingDayHistory ? (
                    <div className="space-y-2">
                      <Skeleton className="h-12 w-full" />
                      <Skeleton className="h-12 w-full" />
                      <Skeleton className="h-12 w-full" />
                    </div>
                  ) : dayJobHistory && dayJobHistory.jobs.length > 0 ? (
                    <div className="space-y-3">
                      <div className="flex gap-4 text-sm mb-3">
                        <div className="flex items-center gap-1">
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                          <span>{dayJobHistory.jobs.filter((j: any) => j.completed && !j.aborted).length} exitosos</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <AlertCircle className="h-4 w-4 text-red-500" />
                          <span>{dayJobHistory.jobs.filter((j: any) => j.aborted).length} abortados</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Loader2 className="h-4 w-4 text-blue-500" />
                          <span>{dayJobHistory.jobs.filter((j: any) => j.running).length} en ejecución</span>
                        </div>
                      </div>
                      <ScrollArea className="h-[300px]">
                        <div className="space-y-2">
                          {dayJobHistory.jobs.map((job: any) => (
                            <div 
                              key={job.id} 
                              className={`border rounded-lg p-3 ${
                                job.aborted 
                                  ? 'bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800' 
                                  : job.completed 
                                    ? 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800'
                                    : job.running
                                      ? 'bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800'
                                      : ''
                              }`}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2">
                                  {job.aborted ? (
                                    <AlertCircle className="h-4 w-4 text-red-500" />
                                  ) : job.completed ? (
                                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                                  ) : job.running ? (
                                    <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
                                  ) : (
                                    <Clock className="h-4 w-4 text-muted-foreground" />
                                  )}
                                  <span className="font-medium">{job.Pipeline?.name || job.pipeline_id.substring(0, 8)}</span>
                                </div>
                                <span className="text-xs text-muted-foreground">
                                  {new Date(job.created_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              {job.Pipeline?.AgentPassport?.name && (
                                <p className="text-xs text-muted-foreground">{job.Pipeline.AgentPassport.name}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-4">
                      No hay ejecuciones registradas para este día
                    </p>
                  )
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="queue" className="mt-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                  En ejecución
                  {(runningJobs?.running?.length ?? 0) > 0 && (
                    <Badge>{runningJobs?.running?.length}</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingJobs ? (
                  <Skeleton className="h-20 w-full" />
                ) : runningJobs?.running.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No hay jobs en ejecución</p>
                ) : (
                  <ScrollArea className="h-[300px]">
                    <div className="space-y-2">
                      {runningJobs?.running.map((job: any) => (
                        <div key={job.id} className="flex items-center gap-2 p-2 rounded border bg-blue-50 dark:bg-blue-950">
                          <Play className="h-4 w-4 text-blue-500" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{job.Pipeline?.name || job.pipeline_id}</p>
                            <p className="text-xs text-muted-foreground">
                              Iniciado: {new Date(job.created_at).toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Clock className="h-5 w-5 text-orange-500" />
                  En cola
                  {(runningJobs?.pending?.length ?? 0) > 0 && (
                    <Badge variant="secondary">{runningJobs?.pending?.length}</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingJobs ? (
                  <Skeleton className="h-20 w-full" />
                ) : runningJobs?.pending.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No hay jobs pendientes</p>
                ) : (
                  <ScrollArea className="h-[300px]">
                    <div className="space-y-2">
                      {runningJobs?.pending.map((job: any, index: number) => (
                        <div key={job.id} className="flex items-center gap-2 p-2 rounded border">
                          <span className="text-xs text-muted-foreground w-6">#{index + 1}</span>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{job.Pipeline?.name || job.pipeline_id}</p>
                            <p className="text-xs text-muted-foreground">
                              Encolado: {new Date(job.created_at).toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="upcoming" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Próximas ejecuciones
              </CardTitle>
            </CardHeader>
            <CardContent>
              {upcomingExecutions.length === 0 ? (
                <p className="text-muted-foreground">No hay ejecuciones programadas</p>
              ) : (
                <div className="space-y-2">
                  {upcomingExecutions.map(({ schedule, nextRun }, index) => (
                    <div key={`${schedule.id}-${index}`} className="flex items-center gap-3 p-3 rounded border">
                      <div className="flex flex-col items-center justify-center w-16 text-center">
                        <span className="text-lg font-bold">{schedule.timeOfDay}</span>
                        <span className="text-xs text-muted-foreground">
                          {formatTimeUntil(nextRun)}
                        </span>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      <div className="flex-1">
                        <p className="font-medium">{schedule.label}</p>
                        <p className="text-sm text-muted-foreground">
                          {schedule.targets.length} pipelines - {getFrequencyLabel(schedule)}
                        </p>
                      </div>
                      <Badge variant="outline">
                        {nextRun.toLocaleDateString('es-PE', { weekday: 'short', day: 'numeric', month: 'short' })}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Schedule Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={(open) => { setIsEditDialogOpen(open); if (!open) setEditingSchedule(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Schedule</DialogTitle>
          </DialogHeader>
          {editingSchedule && (
            <div className="space-y-6 py-4">
              {/* Basic Settings */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Nombre</Label>
                  <Input 
                    value={editForm.label}
                    onChange={(e) => setEditForm(f => ({ ...f, label: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Hora de ejecución</Label>
                  <Input 
                    type="time"
                    value={editForm.timeOfDay}
                    onChange={(e) => setEditForm(f => ({ ...f, timeOfDay: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Frecuencia</Label>
                  <Select 
                    value={editForm.frequencyType}
                    onValueChange={(v) => setEditForm(f => ({ ...f, frequencyType: v as any }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Diario</SelectItem>
                      <SelectItem value="weekly">Semanal</SelectItem>
                      <SelectItem value="monthly">Mensual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {editForm.frequencyType === "weekly" && (
                  <div className="space-y-2">
                    <Label>Días de la semana</Label>
                    <Input 
                      value={editForm.daysOfWeek}
                      onChange={(e) => setEditForm(f => ({ ...f, daysOfWeek: e.target.value }))}
                      placeholder="0,1,2,3,4 (0=Lun, 6=Dom)"
                    />
                  </div>
                )}
                {editForm.frequencyType === "monthly" && (
                  <div className="space-y-2">
                    <Label>Días del mes</Label>
                    <Input 
                      value={editForm.daysOfMonth}
                      onChange={(e) => setEditForm(f => ({ ...f, daysOfMonth: e.target.value }))}
                      placeholder="1,15,30"
                    />
                  </div>
                )}
              </div>

              {/* Targets / Pipelines */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-base">Pipelines ({editingSchedule.targets.length})</Label>
                </div>
                <ScrollArea className="h-[200px] border rounded-lg p-2">
                  {editingSchedule.targets.length === 0 ? (
                    <p className="text-sm text-muted-foreground p-2">No hay pipelines asignados</p>
                  ) : (
                    <div className="space-y-2">
                      {editingSchedule.targets.map(target => (
                        <div key={target.id} className="flex items-center justify-between p-2 rounded border bg-muted/30">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{target.pipelineName || target.pipelineId}</p>
                            {target.clientName && (
                              <p className="text-xs text-muted-foreground">{target.clientName}</p>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="shrink-0"
                            onClick={() => setDeleteTargetConfirm({ 
                              scheduleId: editingSchedule.id, 
                              targetId: target.id, 
                              targetName: target.pipelineName || target.pipelineId 
                            })}
                            title="Eliminar pipeline del schedule"
                          >
                            <X className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>

                {/* Add Pipeline with Search */}
                <Popover open={pipelinePopoverOpen} onOpenChange={setPipelinePopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={pipelinePopoverOpen}
                      className="w-full justify-between"
                    >
                      <span className="text-muted-foreground">Agregar pipeline...</span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[400px] p-0" align="start">
                    <Command shouldFilter={false}>
                      <CommandInput 
                        placeholder="Buscar pipeline..." 
                        value={pipelineSearch}
                        onValueChange={setPipelineSearch}
                      />
                      <CommandList>
                        <CommandEmpty>No se encontraron pipelines</CommandEmpty>
                        <CommandGroup>
                          {pipelines
                            ?.filter(p => !editingSchedule.targets.some(t => t.pipelineId === p.id))
                            .filter(p => {
                              if (!pipelineSearch) return true;
                              const search = pipelineSearch.toLowerCase();
                              return p.name.toLowerCase().includes(search) || 
                                     p.id.toLowerCase().includes(search) ||
                                     p.AgentPassport?.name?.toLowerCase().includes(search);
                            })
                            .slice(0, 50)
                            .map(pipeline => (
                              <CommandItem
                                key={pipeline.id}
                                value={pipeline.id}
                                onSelect={() => {
                                  addTargetMutation.mutate({
                                    scheduleId: editingSchedule.id,
                                    pipelineId: pipeline.id,
                                    pipelineName: pipeline.name,
                                    clientName: pipeline.AgentPassport?.name
                                  });
                                  setPipelinePopoverOpen(false);
                                  setPipelineSearch("");
                                }}
                              >
                                <div className="flex flex-col">
                                  <span>{pipeline.name}</span>
                                  {pipeline.AgentPassport?.name && (
                                    <span className="text-xs text-muted-foreground">{pipeline.AgentPassport.name}</span>
                                  )}
                                </div>
                              </CommandItem>
                            ))
                          }
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsEditDialogOpen(false); setEditingSchedule(null); }}>
              Cancelar
            </Button>
            <Button 
              onClick={() => {
                if (editingSchedule) {
                  updateScheduleMutation.mutate({ id: editingSchedule.id, ...editForm });
                }
              }}
              disabled={!editForm.label || updateScheduleMutation.isPending}
            >
              {updateScheduleMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Guardar cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Schedule Confirmation */}
      <AlertDialog open={deleteScheduleConfirm !== null} onOpenChange={(open) => !open && setDeleteScheduleConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar este schedule?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará el schedule y todos sus pipelines asociados de la programación.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteScheduleConfirm !== null) {
                  deleteScheduleMutation.mutate(deleteScheduleConfirm);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteScheduleMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Target Confirmation */}
      <AlertDialog open={deleteTargetConfirm !== null} onOpenChange={(open) => !open && setDeleteTargetConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar pipeline del schedule?</AlertDialogTitle>
            <AlertDialogDescription>
              El pipeline "{deleteTargetConfirm?.targetName}" será removido de este schedule y ya no se ejecutará automáticamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteTargetConfirm) {
                  deleteTargetMutation.mutate({ 
                    scheduleId: deleteTargetConfirm.scheduleId, 
                    targetId: deleteTargetConfirm.targetId 
                  });
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteTargetMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <X className="h-4 w-4 mr-2" />
              )}
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
