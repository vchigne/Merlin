import { 
  users, type User, type InsertUser
} from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";
import * as fileStorage from "./schedule-file-storage";
import type { FileScheduleConfig, FileScheduleTarget } from "./schedule-file-storage";

export type ScheduleConfig = FileScheduleConfig;
export type ScheduleTarget = FileScheduleTarget;
export type InsertScheduleConfig = {
  label: string;
  timeOfDay: string;
  timezone?: string;
  frequencyType: string;
  daysOfWeek?: string;
  daysOfMonth?: string;
  enabled?: boolean;
};
export type InsertScheduleTarget = {
  scheduleId: number;
  pipelineId: string;
  pipelineName?: string;
  clientName?: string;
  notes?: string;
  enabled?: boolean;
};

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
  createScheduleTarget(target: InsertScheduleTarget): Promise<ScheduleTarget | undefined>;
  deleteScheduleTarget(id: number): Promise<boolean>;
  deleteScheduleTargetsBySchedule(scheduleId: number): Promise<boolean>;
  getSchedulesByPipelineId(pipelineId: string): Promise<ScheduleConfig[]>;
}

export class FileBasedStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    if (!db) return undefined;
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    if (!db) return undefined;
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    if (!db) throw new Error("Database not configured");
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getScheduleConfigs(): Promise<ScheduleConfig[]> {
    return fileStorage.getScheduleConfigs();
  }

  async getScheduleConfig(id: number): Promise<ScheduleConfig | undefined> {
    return fileStorage.getScheduleConfig(id);
  }

  async createScheduleConfig(config: InsertScheduleConfig): Promise<ScheduleConfig> {
    return fileStorage.createScheduleConfig(config);
  }

  async updateScheduleConfig(id: number, config: Partial<InsertScheduleConfig>): Promise<ScheduleConfig | undefined> {
    return fileStorage.updateScheduleConfig(id, config);
  }

  async deleteScheduleConfig(id: number): Promise<boolean> {
    return fileStorage.deleteScheduleConfig(id);
  }

  async deleteAllScheduleConfigs(): Promise<boolean> {
    return fileStorage.deleteAllScheduleConfigs();
  }

  async getScheduleTargets(scheduleId: number): Promise<ScheduleTarget[]> {
    return fileStorage.getScheduleTargets(scheduleId);
  }

  async getAllScheduleTargets(): Promise<ScheduleTarget[]> {
    return fileStorage.getAllScheduleTargets();
  }

  async createScheduleTarget(target: InsertScheduleTarget): Promise<ScheduleTarget | undefined> {
    return fileStorage.createScheduleTarget(target);
  }

  async deleteScheduleTarget(id: number): Promise<boolean> {
    return fileStorage.deleteScheduleTarget(id);
  }

  async deleteScheduleTargetsBySchedule(scheduleId: number): Promise<boolean> {
    return fileStorage.deleteScheduleTargetsBySchedule(scheduleId);
  }
  
  async getSchedulesByPipelineId(pipelineId: string): Promise<ScheduleConfig[]> {
    return fileStorage.getSchedulesByPipelineId(pipelineId);
  }
}

export const storage = new FileBasedStorage();
