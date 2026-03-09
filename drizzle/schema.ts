// Drizzle ORM Schema for MySQL
import { mysqlTable, varchar, datetime, text } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: varchar("id", { length: 255 }).primaryKey(),
  openId: varchar("open_id", { length: 255 }).notNull().unique(),
  email: varchar("email", { length: 255 }).notNull(),
  name: varchar("name", { length: 255 }),
  role: varchar("role", { length: 50 }).notNull().default("user"),
  loginMethod: varchar("login_method", { length: 50 }),
  lastSignedIn: datetime("last_signed_in"),
  createdAt: datetime("created_at").notNull(),
  updatedAt: datetime("updated_at").notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = Partial<typeof users.$inferInsert> & { openId: string };
