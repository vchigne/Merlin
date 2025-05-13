import { pgTable, text, serial, integer, boolean, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

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
