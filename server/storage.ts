import { 
  users, type User, type InsertUser,
  scheduleConfigs, type ScheduleConfig, type InsertScheduleConfig,
  scheduleTargets, type ScheduleTarget, type InsertScheduleTarget
} from "@shared/schema";
import { db } from "./db";
import { eq, asc } from "drizzle-orm";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  getScheduleConfigs(): Promise<ScheduleConfig[]>;
  getScheduleConfig(id: number): Promise<ScheduleConfig | undefined>;
  createScheduleConfig(config: InsertScheduleConfig): Promise<ScheduleConfig>;
  updateScheduleConfig(id: number, config: Partial<InsertScheduleConfig>): Promise<ScheduleConfig | undefined>;
  deleteScheduleConfig(id: number): Promise<boolean>;
  deleteAllScheduleConfigs(): Promise<boolean>;
  
  getScheduleTargets(scheduleId: number): Promise<ScheduleTarget[]>;
  getAllScheduleTargets(): Promise<ScheduleTarget[]>;
  createScheduleTarget(target: InsertScheduleTarget): Promise<ScheduleTarget>;
  deleteScheduleTarget(id: number): Promise<boolean>;
  deleteScheduleTargetsBySchedule(scheduleId: number): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getScheduleConfigs(): Promise<ScheduleConfig[]> {
    return db.select().from(scheduleConfigs).orderBy(asc(scheduleConfigs.timeOfDay));
  }

  async getScheduleConfig(id: number): Promise<ScheduleConfig | undefined> {
    const [config] = await db.select().from(scheduleConfigs).where(eq(scheduleConfigs.id, id));
    return config;
  }

  async createScheduleConfig(config: InsertScheduleConfig): Promise<ScheduleConfig> {
    const [schedule] = await db.insert(scheduleConfigs).values({
      label: config.label,
      timeOfDay: config.timeOfDay,
      timezone: config.timezone || "America/Lima",
      frequencyType: config.frequencyType,
      daysOfWeek: config.daysOfWeek || null,
      daysOfMonth: config.daysOfMonth || null,
      enabled: config.enabled ?? true,
    }).returning();
    return schedule;
  }

  async updateScheduleConfig(id: number, config: Partial<InsertScheduleConfig>): Promise<ScheduleConfig | undefined> {
    const [updated] = await db.update(scheduleConfigs)
      .set({ ...config, updatedAt: new Date() })
      .where(eq(scheduleConfigs.id, id))
      .returning();
    return updated;
  }

  async deleteScheduleConfig(id: number): Promise<boolean> {
    await db.delete(scheduleTargets).where(eq(scheduleTargets.scheduleId, id));
    const result = await db.delete(scheduleConfigs).where(eq(scheduleConfigs.id, id)).returning();
    return result.length > 0;
  }

  async deleteAllScheduleConfigs(): Promise<boolean> {
    await db.delete(scheduleTargets);
    await db.delete(scheduleConfigs);
    return true;
  }

  async getScheduleTargets(scheduleId: number): Promise<ScheduleTarget[]> {
    return db.select().from(scheduleTargets).where(eq(scheduleTargets.scheduleId, scheduleId));
  }

  async getAllScheduleTargets(): Promise<ScheduleTarget[]> {
    return db.select().from(scheduleTargets);
  }

  async createScheduleTarget(target: InsertScheduleTarget): Promise<ScheduleTarget> {
    const [scheduleTarget] = await db.insert(scheduleTargets).values({
      scheduleId: target.scheduleId,
      pipelineId: target.pipelineId,
      pipelineName: target.pipelineName || null,
      clientName: target.clientName || null,
      notes: target.notes || null,
      enabled: target.enabled ?? true,
    }).returning();
    return scheduleTarget;
  }

  async deleteScheduleTarget(id: number): Promise<boolean> {
    const result = await db.delete(scheduleTargets).where(eq(scheduleTargets.id, id)).returning();
    return result.length > 0;
  }

  async deleteScheduleTargetsBySchedule(scheduleId: number): Promise<boolean> {
    await db.delete(scheduleTargets).where(eq(scheduleTargets.scheduleId, scheduleId));
    return true;
  }
}

export const storage = new DatabaseStorage();
