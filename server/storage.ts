import { 
  users, type User, type InsertUser,
  scheduleConfigs, type ScheduleConfig, type InsertScheduleConfig,
  scheduleTargets, type ScheduleTarget, type InsertScheduleTarget
} from "@shared/schema";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Schedule Config CRUD
  getScheduleConfigs(): Promise<ScheduleConfig[]>;
  getScheduleConfig(id: number): Promise<ScheduleConfig | undefined>;
  createScheduleConfig(config: InsertScheduleConfig): Promise<ScheduleConfig>;
  updateScheduleConfig(id: number, config: Partial<InsertScheduleConfig>): Promise<ScheduleConfig | undefined>;
  deleteScheduleConfig(id: number): Promise<boolean>;
  
  // Schedule Target CRUD
  getScheduleTargets(scheduleId: number): Promise<ScheduleTarget[]>;
  getAllScheduleTargets(): Promise<ScheduleTarget[]>;
  createScheduleTarget(target: InsertScheduleTarget): Promise<ScheduleTarget>;
  deleteScheduleTarget(id: number): Promise<boolean>;
  deleteScheduleTargetsBySchedule(scheduleId: number): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private schedules: Map<number, ScheduleConfig>;
  private targets: Map<number, ScheduleTarget>;
  currentId: number;
  scheduleCurrentId: number;
  targetCurrentId: number;

  constructor() {
    this.users = new Map();
    this.schedules = new Map();
    this.targets = new Map();
    this.currentId = 1;
    this.scheduleCurrentId = 1;
    this.targetCurrentId = 1;
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Schedule Config methods
  async getScheduleConfigs(): Promise<ScheduleConfig[]> {
    return Array.from(this.schedules.values()).sort((a, b) => 
      a.timeOfDay.localeCompare(b.timeOfDay)
    );
  }

  async getScheduleConfig(id: number): Promise<ScheduleConfig | undefined> {
    return this.schedules.get(id);
  }

  async createScheduleConfig(config: InsertScheduleConfig): Promise<ScheduleConfig> {
    const id = this.scheduleCurrentId++;
    const now = new Date();
    const schedule: ScheduleConfig = {
      id,
      label: config.label,
      timeOfDay: config.timeOfDay,
      timezone: config.timezone || "America/Lima",
      frequencyType: config.frequencyType,
      daysOfWeek: config.daysOfWeek || null,
      daysOfMonth: config.daysOfMonth || null,
      enabled: config.enabled ?? true,
      createdAt: now,
      updatedAt: now,
    };
    this.schedules.set(id, schedule);
    return schedule;
  }

  async updateScheduleConfig(id: number, config: Partial<InsertScheduleConfig>): Promise<ScheduleConfig | undefined> {
    const existing = this.schedules.get(id);
    if (!existing) return undefined;
    
    const updated: ScheduleConfig = {
      ...existing,
      ...config,
      updatedAt: new Date(),
    };
    this.schedules.set(id, updated);
    return updated;
  }

  async deleteScheduleConfig(id: number): Promise<boolean> {
    // Also delete associated targets
    await this.deleteScheduleTargetsBySchedule(id);
    return this.schedules.delete(id);
  }

  // Schedule Target methods
  async getScheduleTargets(scheduleId: number): Promise<ScheduleTarget[]> {
    return Array.from(this.targets.values()).filter(t => t.scheduleId === scheduleId);
  }

  async getAllScheduleTargets(): Promise<ScheduleTarget[]> {
    return Array.from(this.targets.values());
  }

  async createScheduleTarget(target: InsertScheduleTarget): Promise<ScheduleTarget> {
    const id = this.targetCurrentId++;
    const scheduleTarget: ScheduleTarget = {
      id,
      scheduleId: target.scheduleId,
      pipelineId: target.pipelineId,
      pipelineName: target.pipelineName || null,
      clientName: target.clientName || null,
      notes: target.notes || null,
      enabled: target.enabled ?? true,
      createdAt: new Date(),
    };
    this.targets.set(id, scheduleTarget);
    return scheduleTarget;
  }

  async deleteScheduleTarget(id: number): Promise<boolean> {
    return this.targets.delete(id);
  }

  async deleteScheduleTargetsBySchedule(scheduleId: number): Promise<boolean> {
    const toDelete = Array.from(this.targets.entries())
      .filter(([_, t]) => t.scheduleId === scheduleId)
      .map(([id]) => id);
    toDelete.forEach(id => this.targets.delete(id));
    return true;
  }
}

export const storage = new MemStorage();
