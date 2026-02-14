import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, float } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const foodEntries = mysqlTable("foodEntries", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  foodName: varchar("foodName", { length: 255 }).notNull(),
  mealTime: mysqlEnum("mealTime", ["morning", "noon", "evening", "lateNight"]).notNull(),
  calories: int("calories").notNull(),
  protein: float("protein").notNull(), // grams
  carbs: float("carbs").notNull(), // grams
  fats: float("fats").notNull(), // grams
  quantity: float("quantity").default(1), // portion size
  unit: varchar("unit", { length: 50 }).default("serving"), // grams, ml, piece, etc
  imageUrl: varchar("imageUrl", { length: 512 }),
  barcode: varchar("barcode", { length: 100 }),
  source: mysqlEnum("source", ["manual", "image", "barcode"]).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  date: timestamp("date").notNull(), // date of the meal entry
});

export type FoodEntry = typeof foodEntries.$inferSelect;
export type InsertFoodEntry = typeof foodEntries.$inferInsert;

export const customFoods = mysqlTable("customFoods", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  foodName: varchar("foodName", { length: 255 }).notNull(),
  calories: int("calories").notNull(),
  protein: float("protein").notNull(),
  carbs: float("carbs").notNull(),
  fats: float("fats").notNull(),
  unit: varchar("unit", { length: 50 }).default("serving"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CustomFood = typeof customFoods.$inferSelect;
export type InsertCustomFood = typeof customFoods.$inferInsert;

export const dailySummary = mysqlTable("dailySummary", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  date: timestamp("date").notNull(),
  totalCalories: int("totalCalories").default(0),
  totalProtein: float("totalProtein").default(0),
  totalCarbs: float("totalCarbs").default(0),
  totalFats: float("totalFats").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type DailySummary = typeof dailySummary.$inferSelect;
export type InsertDailySummary = typeof dailySummary.$inferInsert;
export const userGoals = mysqlTable("userGoals", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  // BMI Calculator inputs
  height: float("height"), // in cm
  weight: float("weight"), // in kg
  age: int("age"),
  gender: mysqlEnum("gender", ["male", "female", "other"]),
  activityLevel: mysqlEnum("activityLevel", ["sedentary", "light", "moderate", "active", "veryActive"]),
  // Custom daily goals
  dailyCalories: int("dailyCalories").default(2000),
  dailyProtein: float("dailyProtein").default(150), // grams
  dailyCarbs: float("dailyCarbs").default(250), // grams
  dailyFats: float("dailyFats").default(65), // grams
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type UserGoals = typeof userGoals.$inferSelect;
export type InsertUserGoals = typeof userGoals.$inferInsert;
