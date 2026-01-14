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
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Settings2,
  Upload,
  FileCode,
  Pencil,
  X
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

  // Group schedules by time
  const schedulesByTime = useMemo(() => {
    if (!schedules) return {};
    const grouped: Record<string, ScheduleWithTargets[]> = {};
    schedules.forEach(s => {
      if (!grouped[s.timeOfDay]) {
        grouped[s.timeOfDay] = [];
      }
      grouped[s.timeOfDay].push(s);
    });
    return grouped;
  }, [schedules]);

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
                              onClick={() => deleteScheduleMutation.mutate(schedule.id)}
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
                            onClick={() => deleteTargetMutation.mutate({ scheduleId: editingSchedule.id, targetId: target.id })}
                            disabled={deleteTargetMutation.isPending}
                          >
                            <X className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>

                {/* Add Pipeline */}
                <div className="flex gap-2">
                  <Select
                    onValueChange={(pipelineId) => {
                      const pipeline = pipelines?.find(p => p.id === pipelineId);
                      if (pipeline && editingSchedule) {
                        addTargetMutation.mutate({
                          scheduleId: editingSchedule.id,
                          pipelineId: pipeline.id,
                          pipelineName: pipeline.name,
                          clientName: pipeline.AgentPassport?.name
                        });
                      }
                    }}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Agregar pipeline..." />
                    </SelectTrigger>
                    <SelectContent>
                      <ScrollArea className="h-[200px]">
                        {pipelines?.filter(p => !editingSchedule.targets.some(t => t.pipelineId === p.id))
                          .map(pipeline => (
                            <SelectItem key={pipeline.id} value={pipeline.id}>
                              {pipeline.name}
                              {pipeline.AgentPassport?.name && (
                                <span className="text-muted-foreground ml-2">({pipeline.AgentPassport.name})</span>
                              )}
                            </SelectItem>
                          ))
                        }
                      </ScrollArea>
                    </SelectContent>
                  </Select>
                </div>
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
    </div>
  );
}
