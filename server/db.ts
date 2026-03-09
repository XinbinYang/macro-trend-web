import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, User, users } from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const now = new Date();
    const id = user.id || crypto.randomUUID();

    // Build insert values with defaults
    const insertValues: Record<string, unknown> = {
      id,
      openId: user.openId,
      email: user.email || "",
      role: user.role || "user",
      createdAt: now,
      updatedAt: now,
    };

    // Add optional fields
    if (user.name !== undefined) insertValues.name = user.name;
    if (user.loginMethod !== undefined) insertValues.loginMethod = user.loginMethod;
    if (user.lastSignedIn !== undefined) insertValues.lastSignedIn = user.lastSignedIn;

    // Build update set (exclude createdAt)
    const updateSet: Record<string, unknown> = {
      updatedAt: now,
    };
    if (user.name !== undefined) updateSet.name = user.name;
    if (user.email !== undefined) updateSet.email = user.email;
    if (user.role !== undefined) updateSet.role = user.role;
    if (user.loginMethod !== undefined) updateSet.loginMethod = user.loginMethod;
    if (user.lastSignedIn !== undefined) updateSet.lastSignedIn = user.lastSignedIn;

    await db.insert(users).values(insertValues as typeof users.$inferInsert).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string): Promise<User | undefined> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// TODO: add feature queries here as your schema grows.
