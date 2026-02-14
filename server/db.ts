import { and, eq, gte, lte } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, customFoods, dailySummary, foodEntries, InsertCustomFood, InsertFoodEntry, userGoals, InsertUserGoals, UserGoals } from "../drizzle/schema";
import { ENV } from './_core/env';

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
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// Food tracking functions
export async function addFoodEntry(entry: InsertFoodEntry) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(foodEntries).values(entry);
  return result;
}

export async function getFoodEntriesByDate(userId: number, date: Date) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);
  
  return await db
    .select()
    .from(foodEntries)
    .where(
      and(
        eq(foodEntries.userId, userId),
        gte(foodEntries.date, startOfDay),
        lte(foodEntries.date, endOfDay)
      )
    )
    .orderBy(foodEntries.createdAt);
}

export async function deleteFoodEntry(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db
    .delete(foodEntries)
    .where(and(eq(foodEntries.id, id), eq(foodEntries.userId, userId)));
}

export async function updateFoodEntry(id: number, userId: number, data: Partial<InsertFoodEntry>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db
    .update(foodEntries)
    .set(data)
    .where(and(eq(foodEntries.id, id), eq(foodEntries.userId, userId)));
}

export async function getDailySummary(userId: number, date: Date) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  
  const result = await db
    .select()
    .from(dailySummary)
    .where(and(eq(dailySummary.userId, userId), eq(dailySummary.date, startOfDay)))
    .limit(1);
  
  return result.length > 0 ? result[0] : null;
}

export async function upsertDailySummary(userId: number, date: Date, totals: { totalCalories?: number; totalProtein?: number; totalCarbs?: number; totalFats?: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  
  const existing = await getDailySummary(userId, date);
  
  if (existing) {
    return await db
      .update(dailySummary)
      .set(totals)
      .where(eq(dailySummary.id, existing.id));
  } else {
    return await db.insert(dailySummary).values({
      userId,
      date: startOfDay,
      totalCalories: totals.totalCalories || 0,
      totalProtein: totals.totalProtein || 0,
      totalCarbs: totals.totalCarbs || 0,
      totalFats: totals.totalFats || 0,
    });
  }
}

export async function addCustomFood(food: InsertCustomFood) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.insert(customFoods).values(food);
}

export async function getCustomFoodsByUser(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.select().from(customFoods).where(eq(customFoods.userId, userId));
}

export async function getUserGoals(userId: number): Promise<UserGoals | null> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.select().from(userGoals).where(eq(userGoals.userId, userId)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function upsertUserGoals(userId: number, data: Partial<InsertUserGoals>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const existing = await getUserGoals(userId);
  
  if (existing) {
    return await db
      .update(userGoals)
      .set(data)
      .where(eq(userGoals.userId, userId));
  } else {
    return await db.insert(userGoals).values({
      userId,
      ...data,
    });
  }
}
