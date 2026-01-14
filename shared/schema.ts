import { pgTable, text, serial, integer, boolean, timestamp, varchar, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { sql } from "drizzle-orm";

// Keep the original users table for authentication if needed
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

// Add new tables for local dashboard preferences and history
export const dashboardPreferences = pgTable("dashboard_preferences", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  theme: text("theme").default("light"),
  sidebarCollapsed: boolean("sidebar_collapsed").default(false),
  lastViewedAgent: text("last_viewed_agent"),
  lastViewedPipeline: text("last_viewed_pipeline"),
  refreshInterval: integer("refresh_interval").default(30), // in seconds
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const queryHistory = pgTable("query_history", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  query: text("query").notNull(),
  executedAt: timestamp("executed_at").defaultNow(),
});

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  message: text("message").notNull(),
  type: text("type").notNull(), // info, warning, error, success
  isRead: boolean("is_read").default(false),
  relatedEntityType: text("related_entity_type"), // agent, pipeline, job
  relatedEntityId: text("related_entity_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Schemas
export const insertDashboardPreferencesSchema = createInsertSchema(dashboardPreferences).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertQueryHistorySchema = createInsertSchema(queryHistory).omit({
  id: true,
  executedAt: true,
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type DashboardPreferences = typeof dashboardPreferences.$inferSelect;
export type InsertDashboardPreferences = z.infer<typeof insertDashboardPreferencesSchema>;
export type QueryHistory = typeof queryHistory.$inferSelect;
export type InsertQueryHistory = z.infer<typeof insertQueryHistorySchema>;
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;

// ============ SCHEDULE CONFIGURATION TABLES ============

export const frequencyTypeEnum = z.enum(["daily", "weekly", "monthly"]);
export type FrequencyType = z.infer<typeof frequencyTypeEnum>;

export const scheduleConfigs = pgTable("schedule_configs", {
  id: serial("id").primaryKey(),
  label: text("label").notNull(),
  timeOfDay: text("time_of_day").notNull(),
  timezone: text("timezone").default("America/Lima"),
  frequencyType: text("frequency_type").notNull().default("daily"),
  daysOfWeek: text("days_of_week"),
  daysOfMonth: text("days_of_month"),
  enabled: boolean("enabled").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const scheduleTargets = pgTable("schedule_targets", {
  id: serial("id").primaryKey(),
  scheduleId: integer("schedule_id").notNull().references(() => scheduleConfigs.id, { onDelete: "cascade" }),
  pipelineId: text("pipeline_id").notNull(),
  pipelineName: text("pipeline_name"),
  clientName: text("client_name"),
  notes: text("notes"),
  enabled: boolean("enabled").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Schedule Schemas
export const insertScheduleConfigSchema = createInsertSchema(scheduleConfigs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  frequencyType: frequencyTypeEnum,
  daysOfWeek: z.string().optional(),
  daysOfMonth: z.string().optional(),
});

export const insertScheduleTargetSchema = createInsertSchema(scheduleTargets).omit({
  id: true,
  createdAt: true,
});

// Schedule Types
export type ScheduleConfig = typeof scheduleConfigs.$inferSelect;
export type InsertScheduleConfig = z.infer<typeof insertScheduleConfigSchema>;
export type ScheduleTarget = typeof scheduleTargets.$inferSelect;
export type InsertScheduleTarget = z.infer<typeof insertScheduleTargetSchema>;
