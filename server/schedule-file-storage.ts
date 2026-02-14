import * as fs from 'fs';
import * as path from 'path';
import YAML from 'yaml';

export interface FileScheduleConfig {
  id: number;
  label: string;
  timeOfDay: string;
  timezone: string;
  frequencyType: string;
  daysOfWeek: string | null;
  daysOfMonth: string | null;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface FileScheduleTarget {
  id: number;
  scheduleId: number;
  pipelineId: string;
  pipelineName: string | null;
  clientName: string | null;
  notes: string | null;
  enabled: boolean;
  createdAt: Date;
}

interface ScheduleFileData {
  schedules: Array<{
    id: number;
    label: string;
    timeOfDay: string;
    timezone: string;
    frequencyType: string;
    daysOfWeek?: string;
    daysOfMonth?: string;
    enabled: boolean;
    createdAt: string;
    updatedAt: string;
    targets: Array<{
      id: number;
      pipelineId: string;
      pipelineName?: string;
      clientName?: string;
      notes?: string;
      enabled: boolean;
      createdAt: string;
    }>;
  }>;
  nextScheduleId: number;
  nextTargetId: number;
}

const SCHEDULES_FILE = path.join(process.cwd(), 'data', 'schedules.yaml');

function ensureDataDir(): void {
  const dataDir = path.dirname(SCHEDULES_FILE);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

function loadScheduleFile(): ScheduleFileData {
  ensureDataDir();
  
  if (!fs.existsSync(SCHEDULES_FILE)) {
    const defaultData: ScheduleFileData = {
      schedules: [],
      nextScheduleId: 1,
      nextTargetId: 1
    };
    saveScheduleFile(defaultData);
    return defaultData;
  }
  
  try {
    const content = fs.readFileSync(SCHEDULES_FILE, 'utf-8');
    const parsed = YAML.parse(content);
    return {
      schedules: parsed.schedules || [],
      nextScheduleId: parsed.nextScheduleId || 1,
      nextTargetId: parsed.nextTargetId || 1
    };
  } catch (error) {
    console.error('Error loading schedules file:', error);
    return { schedules: [], nextScheduleId: 1, nextTargetId: 1 };
  }
}

function saveScheduleFile(data: ScheduleFileData): void {
  ensureDataDir();
  const content = YAML.stringify(data);
  fs.writeFileSync(SCHEDULES_FILE, content, 'utf-8');
}

export function getScheduleConfigs(): FileScheduleConfig[] {
  const data = loadScheduleFile();
  return data.schedules.map(s => ({
    id: s.id,
    label: s.label,
    timeOfDay: s.timeOfDay,
    timezone: s.timezone,
    frequencyType: s.frequencyType,
    daysOfWeek: s.daysOfWeek || null,
    daysOfMonth: s.daysOfMonth || null,
    enabled: s.enabled,
    createdAt: new Date(s.createdAt),
    updatedAt: new Date(s.updatedAt)
  })).sort((a, b) => a.timeOfDay.localeCompare(b.timeOfDay));
}

export function getScheduleConfig(id: number): FileScheduleConfig | undefined {
  const data = loadScheduleFile();
  const schedule = data.schedules.find(s => s.id === id);
  if (!schedule) return undefined;
  
  return {
    id: schedule.id,
    label: schedule.label,
    timeOfDay: schedule.timeOfDay,
    timezone: schedule.timezone,
    frequencyType: schedule.frequencyType,
    daysOfWeek: schedule.daysOfWeek || null,
    daysOfMonth: schedule.daysOfMonth || null,
    enabled: schedule.enabled,
    createdAt: new Date(schedule.createdAt),
    updatedAt: new Date(schedule.updatedAt)
  };
}

export function createScheduleConfig(config: {
  label: string;
  timeOfDay: string;
  timezone?: string;
  frequencyType: string;
  daysOfWeek?: string;
  daysOfMonth?: string;
  enabled?: boolean;
}): FileScheduleConfig {
  const data = loadScheduleFile();
  const now = new Date().toISOString();
  
  const newSchedule = {
    id: data.nextScheduleId,
    label: config.label,
    timeOfDay: config.timeOfDay,
    timezone: config.timezone || 'America/Lima',
    frequencyType: config.frequencyType,
    daysOfWeek: config.daysOfWeek,
    daysOfMonth: config.daysOfMonth,
    enabled: config.enabled ?? true,
    createdAt: now,
    updatedAt: now,
    targets: []
  };
  
  data.schedules.push(newSchedule);
  data.nextScheduleId++;
  saveScheduleFile(data);
  
  return {
    id: newSchedule.id,
    label: newSchedule.label,
    timeOfDay: newSchedule.timeOfDay,
    timezone: newSchedule.timezone,
    frequencyType: newSchedule.frequencyType,
    daysOfWeek: newSchedule.daysOfWeek || null,
    daysOfMonth: newSchedule.daysOfMonth || null,
    enabled: newSchedule.enabled,
    createdAt: new Date(newSchedule.createdAt),
    updatedAt: new Date(newSchedule.updatedAt)
  };
}

export function updateScheduleConfig(id: number, config: {
  label?: string;
  timeOfDay?: string;
  timezone?: string;
  frequencyType?: string;
  daysOfWeek?: string;
  daysOfMonth?: string;
  enabled?: boolean;
}): FileScheduleConfig | undefined {
  const data = loadScheduleFile();
  const index = data.schedules.findIndex(s => s.id === id);
  if (index === -1) return undefined;
  
  const schedule = data.schedules[index];
  const now = new Date().toISOString();
  
  if (config.label !== undefined) schedule.label = config.label;
  if (config.timeOfDay !== undefined) schedule.timeOfDay = config.timeOfDay;
  if (config.timezone !== undefined) schedule.timezone = config.timezone;
  if (config.frequencyType !== undefined) schedule.frequencyType = config.frequencyType;
  if (config.daysOfWeek !== undefined) schedule.daysOfWeek = config.daysOfWeek;
  if (config.daysOfMonth !== undefined) schedule.daysOfMonth = config.daysOfMonth;
  if (config.enabled !== undefined) schedule.enabled = config.enabled;
  schedule.updatedAt = now;
  
  saveScheduleFile(data);
  
  return {
    id: schedule.id,
    label: schedule.label,
    timeOfDay: schedule.timeOfDay,
    timezone: schedule.timezone,
    frequencyType: schedule.frequencyType,
    daysOfWeek: schedule.daysOfWeek || null,
    daysOfMonth: schedule.daysOfMonth || null,
    enabled: schedule.enabled,
    createdAt: new Date(schedule.createdAt),
    updatedAt: new Date(schedule.updatedAt)
  };
}

export function deleteScheduleConfig(id: number): boolean {
  const data = loadScheduleFile();
  const index = data.schedules.findIndex(s => s.id === id);
  if (index === -1) return false;
  
  data.schedules.splice(index, 1);
  saveScheduleFile(data);
  return true;
}

export function deleteAllScheduleConfigs(): boolean {
  const data = loadScheduleFile();
  data.schedules = [];
  data.nextScheduleId = 1;
  data.nextTargetId = 1;
  saveScheduleFile(data);
  return true;
}

export function getScheduleTargets(scheduleId: number): FileScheduleTarget[] {
  const data = loadScheduleFile();
  const schedule = data.schedules.find(s => s.id === scheduleId);
  if (!schedule) return [];
  
  return schedule.targets.map(t => ({
    id: t.id,
    scheduleId: scheduleId,
    pipelineId: t.pipelineId,
    pipelineName: t.pipelineName || null,
    clientName: t.clientName || null,
    notes: t.notes || null,
    enabled: t.enabled,
    createdAt: new Date(t.createdAt)
  }));
}

export function getAllScheduleTargets(): FileScheduleTarget[] {
  const data = loadScheduleFile();
  const allTargets: FileScheduleTarget[] = [];
  
  for (const schedule of data.schedules) {
    for (const target of schedule.targets) {
      allTargets.push({
        id: target.id,
        scheduleId: schedule.id,
        pipelineId: target.pipelineId,
        pipelineName: target.pipelineName || null,
        clientName: target.clientName || null,
        notes: target.notes || null,
        enabled: target.enabled,
        createdAt: new Date(target.createdAt)
      });
    }
  }
  
  return allTargets;
}

export function createScheduleTarget(target: {
  scheduleId: number;
  pipelineId: string;
  pipelineName?: string;
  clientName?: string;
  notes?: string;
  enabled?: boolean;
}): FileScheduleTarget | undefined {
  const data = loadScheduleFile();
  const schedule = data.schedules.find(s => s.id === target.scheduleId);
  if (!schedule) return undefined;
  
  const now = new Date().toISOString();
  
  const newTarget = {
    id: data.nextTargetId,
    pipelineId: target.pipelineId,
    pipelineName: target.pipelineName,
    clientName: target.clientName,
    notes: target.notes,
    enabled: target.enabled ?? true,
    createdAt: now
  };
  
  schedule.targets.push(newTarget);
  data.nextTargetId++;
  saveScheduleFile(data);
  
  return {
    id: newTarget.id,
    scheduleId: target.scheduleId,
    pipelineId: newTarget.pipelineId,
    pipelineName: newTarget.pipelineName || null,
    clientName: newTarget.clientName || null,
    notes: newTarget.notes || null,
    enabled: newTarget.enabled,
    createdAt: new Date(newTarget.createdAt)
  };
}

export function updateScheduleTarget(id: number, updates: { enabled?: boolean; pipelineName?: string; clientName?: string; notes?: string }): FileScheduleTarget | undefined {
  const data = loadScheduleFile();
  
  for (const schedule of data.schedules) {
    const target = schedule.targets.find(t => t.id === id);
    if (target) {
      if (updates.enabled !== undefined) target.enabled = updates.enabled;
      if (updates.pipelineName !== undefined) target.pipelineName = updates.pipelineName;
      if (updates.clientName !== undefined) target.clientName = updates.clientName;
      if (updates.notes !== undefined) target.notes = updates.notes;
      saveScheduleFile(data);
      
      return {
        id: target.id,
        scheduleId: schedule.id,
        pipelineId: target.pipelineId,
        pipelineName: target.pipelineName || null,
        clientName: target.clientName || null,
        notes: target.notes || null,
        enabled: target.enabled,
        createdAt: new Date(target.createdAt)
      };
    }
  }
  
  return undefined;
}

export function deleteScheduleTarget(id: number): boolean {
  const data = loadScheduleFile();
  
  for (const schedule of data.schedules) {
    const index = schedule.targets.findIndex(t => t.id === id);
    if (index !== -1) {
      schedule.targets.splice(index, 1);
      saveScheduleFile(data);
      return true;
    }
  }
  
  return false;
}

export function deleteScheduleTargetsBySchedule(scheduleId: number): boolean {
  const data = loadScheduleFile();
  const schedule = data.schedules.find(s => s.id === scheduleId);
  if (!schedule) return false;
  
  schedule.targets = [];
  saveScheduleFile(data);
  return true;
}

export function getSchedulesByPipelineId(pipelineId: string): FileScheduleConfig[] {
  const data = loadScheduleFile();
  const matchingScheduleIds = new Set<number>();
  
  for (const schedule of data.schedules) {
    for (const target of schedule.targets) {
      if (target.pipelineId === pipelineId) {
        matchingScheduleIds.add(schedule.id);
        break;
      }
    }
  }
  
  return data.schedules
    .filter(s => matchingScheduleIds.has(s.id))
    .map(s => ({
      id: s.id,
      label: s.label,
      timeOfDay: s.timeOfDay,
      timezone: s.timezone,
      frequencyType: s.frequencyType,
      daysOfWeek: s.daysOfWeek || null,
      daysOfMonth: s.daysOfMonth || null,
      enabled: s.enabled,
      createdAt: new Date(s.createdAt),
      updatedAt: new Date(s.updatedAt)
    }));
}
