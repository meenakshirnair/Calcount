// server/_core/index.ts
import "dotenv/config";
import express2 from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";

// shared/const.ts
var COOKIE_NAME = "app_session_id";
var ONE_YEAR_MS = 1e3 * 60 * 60 * 24 * 365;
var AXIOS_TIMEOUT_MS = 3e4;
var UNAUTHED_ERR_MSG = "Please login (10001)";
var NOT_ADMIN_ERR_MSG = "You do not have required permission (10002)";

// server/db.ts
import { and, eq, gte, lte } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";

// drizzle/schema.ts
import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, float } from "drizzle-orm/mysql-core";
var users = mysqlTable("users", {
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
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull()
});
var foodEntries = mysqlTable("foodEntries", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  foodName: varchar("foodName", { length: 255 }).notNull(),
  mealTime: mysqlEnum("mealTime", ["morning", "noon", "evening", "lateNight"]).notNull(),
  calories: int("calories").notNull(),
  protein: float("protein").notNull(),
  // grams
  carbs: float("carbs").notNull(),
  // grams
  fats: float("fats").notNull(),
  // grams
  quantity: float("quantity").default(1),
  // portion size
  unit: varchar("unit", { length: 50 }).default("serving"),
  // grams, ml, piece, etc
  imageUrl: varchar("imageUrl", { length: 512 }),
  barcode: varchar("barcode", { length: 100 }),
  source: mysqlEnum("source", ["manual", "image", "barcode"]).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  date: timestamp("date").notNull()
  // date of the meal entry
});
var customFoods = mysqlTable("customFoods", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  foodName: varchar("foodName", { length: 255 }).notNull(),
  calories: int("calories").notNull(),
  protein: float("protein").notNull(),
  carbs: float("carbs").notNull(),
  fats: float("fats").notNull(),
  unit: varchar("unit", { length: 50 }).default("serving"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var dailySummary = mysqlTable("dailySummary", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  date: timestamp("date").notNull(),
  totalCalories: int("totalCalories").default(0),
  totalProtein: float("totalProtein").default(0),
  totalCarbs: float("totalCarbs").default(0),
  totalFats: float("totalFats").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var userGoals = mysqlTable("userGoals", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  // BMI Calculator inputs
  height: float("height"),
  // in cm
  weight: float("weight"),
  // in kg
  age: int("age"),
  gender: mysqlEnum("gender", ["male", "female", "other"]),
  activityLevel: mysqlEnum("activityLevel", ["sedentary", "light", "moderate", "active", "veryActive"]),
  // Custom daily goals
  dailyCalories: int("dailyCalories").default(2e3),
  dailyProtein: float("dailyProtein").default(150),
  // grams
  dailyCarbs: float("dailyCarbs").default(250),
  // grams
  dailyFats: float("dailyFats").default(65),
  // grams
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});

// server/_core/env.ts
var ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? ""
};

// server/db.ts
var _db = null;
async function getDb() {
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
async function upsertUser(user) {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }
  try {
    const values = {
      openId: user.openId
    };
    const updateSet = {};
    const textFields = ["name", "email", "loginMethod"];
    const assignNullable = (field) => {
      const value = user[field];
      if (value === void 0) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== void 0) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== void 0) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }
    if (!values.lastSignedIn) {
      values.lastSignedIn = /* @__PURE__ */ new Date();
    }
    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = /* @__PURE__ */ new Date();
    }
    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}
async function getUserByOpenId(openId) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return void 0;
  }
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : void 0;
}
async function addFoodEntry(entry) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(foodEntries).values(entry);
  return result;
}
async function getFoodEntriesByDate(userId, date) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);
  return await db.select().from(foodEntries).where(
    and(
      eq(foodEntries.userId, userId),
      gte(foodEntries.date, startOfDay),
      lte(foodEntries.date, endOfDay)
    )
  ).orderBy(foodEntries.createdAt);
}
async function deleteFoodEntry(id, userId) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.delete(foodEntries).where(and(eq(foodEntries.id, id), eq(foodEntries.userId, userId)));
}
async function updateFoodEntry(id, userId, data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.update(foodEntries).set(data).where(and(eq(foodEntries.id, id), eq(foodEntries.userId, userId)));
}
async function getDailySummary(userId, date) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const result = await db.select().from(dailySummary).where(and(eq(dailySummary.userId, userId), eq(dailySummary.date, startOfDay))).limit(1);
  return result.length > 0 ? result[0] : null;
}
async function upsertDailySummary(userId, date, totals) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const existing = await getDailySummary(userId, date);
  if (existing) {
    return await db.update(dailySummary).set(totals).where(eq(dailySummary.id, existing.id));
  } else {
    return await db.insert(dailySummary).values({
      userId,
      date: startOfDay,
      totalCalories: totals.totalCalories || 0,
      totalProtein: totals.totalProtein || 0,
      totalCarbs: totals.totalCarbs || 0,
      totalFats: totals.totalFats || 0
    });
  }
}
async function addCustomFood(food) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.insert(customFoods).values(food);
}
async function getCustomFoodsByUser(userId) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.select().from(customFoods).where(eq(customFoods.userId, userId));
}
async function getUserGoals(userId) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.select().from(userGoals).where(eq(userGoals.userId, userId)).limit(1);
  return result.length > 0 ? result[0] : null;
}
async function upsertUserGoals(userId, data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await getUserGoals(userId);
  if (existing) {
    return await db.update(userGoals).set(data).where(eq(userGoals.userId, userId));
  } else {
    return await db.insert(userGoals).values({
      userId,
      ...data
    });
  }
}

// server/_core/cookies.ts
function isSecureRequest(req) {
  if (req.protocol === "https") return true;
  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;
  const protoList = Array.isArray(forwardedProto) ? forwardedProto : forwardedProto.split(",");
  return protoList.some((proto) => proto.trim().toLowerCase() === "https");
}
function getSessionCookieOptions(req) {
  return {
    httpOnly: true,
    path: "/",
    sameSite: "none",
    secure: isSecureRequest(req)
  };
}

// shared/_core/errors.ts
var HttpError = class extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.name = "HttpError";
  }
};
var ForbiddenError = (msg) => new HttpError(403, msg);

// server/_core/sdk.ts
import axios from "axios";
import { parse as parseCookieHeader } from "cookie";
import { SignJWT, jwtVerify } from "jose";
var isNonEmptyString = (value) => typeof value === "string" && value.length > 0;
var EXCHANGE_TOKEN_PATH = `/webdev.v1.WebDevAuthPublicService/ExchangeToken`;
var GET_USER_INFO_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfo`;
var GET_USER_INFO_WITH_JWT_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfoWithJwt`;
var OAuthService = class {
  constructor(client) {
    this.client = client;
    console.log("[OAuth] Initialized with baseURL:", ENV.oAuthServerUrl);
    if (!ENV.oAuthServerUrl) {
      console.error(
        "[OAuth] ERROR: OAUTH_SERVER_URL is not configured! Set OAUTH_SERVER_URL environment variable."
      );
    }
  }
  decodeState(state) {
    const redirectUri = atob(state);
    return redirectUri;
  }
  async getTokenByCode(code, state) {
    const payload = {
      clientId: ENV.appId,
      grantType: "authorization_code",
      code,
      redirectUri: this.decodeState(state)
    };
    const { data } = await this.client.post(
      EXCHANGE_TOKEN_PATH,
      payload
    );
    return data;
  }
  async getUserInfoByToken(token) {
    const { data } = await this.client.post(
      GET_USER_INFO_PATH,
      {
        accessToken: token.accessToken
      }
    );
    return data;
  }
};
var createOAuthHttpClient = () => axios.create({
  baseURL: ENV.oAuthServerUrl,
  timeout: AXIOS_TIMEOUT_MS
});
var SDKServer = class {
  client;
  oauthService;
  constructor(client = createOAuthHttpClient()) {
    this.client = client;
    this.oauthService = new OAuthService(this.client);
  }
  deriveLoginMethod(platforms, fallback) {
    if (fallback && fallback.length > 0) return fallback;
    if (!Array.isArray(platforms) || platforms.length === 0) return null;
    const set = new Set(
      platforms.filter((p) => typeof p === "string")
    );
    if (set.has("REGISTERED_PLATFORM_EMAIL")) return "email";
    if (set.has("REGISTERED_PLATFORM_GOOGLE")) return "google";
    if (set.has("REGISTERED_PLATFORM_APPLE")) return "apple";
    if (set.has("REGISTERED_PLATFORM_MICROSOFT") || set.has("REGISTERED_PLATFORM_AZURE"))
      return "microsoft";
    if (set.has("REGISTERED_PLATFORM_GITHUB")) return "github";
    const first = Array.from(set)[0];
    return first ? first.toLowerCase() : null;
  }
  /**
   * Exchange OAuth authorization code for access token
   * @example
   * const tokenResponse = await sdk.exchangeCodeForToken(code, state);
   */
  async exchangeCodeForToken(code, state) {
    return this.oauthService.getTokenByCode(code, state);
  }
  /**
   * Get user information using access token
   * @example
   * const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
   */
  async getUserInfo(accessToken) {
    const data = await this.oauthService.getUserInfoByToken({
      accessToken
    });
    const loginMethod = this.deriveLoginMethod(
      data?.platforms,
      data?.platform ?? data.platform ?? null
    );
    return {
      ...data,
      platform: loginMethod,
      loginMethod
    };
  }
  parseCookies(cookieHeader) {
    if (!cookieHeader) {
      return /* @__PURE__ */ new Map();
    }
    const parsed = parseCookieHeader(cookieHeader);
    return new Map(Object.entries(parsed));
  }
  getSessionSecret() {
    const secret = ENV.cookieSecret;
    return new TextEncoder().encode(secret);
  }
  /**
   * Create a session token for a Manus user openId
   * @example
   * const sessionToken = await sdk.createSessionToken(userInfo.openId);
   */
  async createSessionToken(openId, options = {}) {
    return this.signSession(
      {
        openId,
        appId: ENV.appId,
        name: options.name || ""
      },
      options
    );
  }
  async signSession(payload, options = {}) {
    const issuedAt = Date.now();
    const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS;
    const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1e3);
    const secretKey = this.getSessionSecret();
    return new SignJWT({
      openId: payload.openId,
      appId: payload.appId,
      name: payload.name
    }).setProtectedHeader({ alg: "HS256", typ: "JWT" }).setExpirationTime(expirationSeconds).sign(secretKey);
  }
  async verifySession(cookieValue) {
    if (!cookieValue) {
      console.warn("[Auth] Missing session cookie");
      return null;
    }
    try {
      const secretKey = this.getSessionSecret();
      const { payload } = await jwtVerify(cookieValue, secretKey, {
        algorithms: ["HS256"]
      });
      const { openId, appId, name } = payload;
      if (!isNonEmptyString(openId) || !isNonEmptyString(appId) || !isNonEmptyString(name)) {
        console.warn("[Auth] Session payload missing required fields");
        return null;
      }
      return {
        openId,
        appId,
        name
      };
    } catch (error) {
      console.warn("[Auth] Session verification failed", String(error));
      return null;
    }
  }
  async getUserInfoWithJwt(jwtToken) {
    const payload = {
      jwtToken,
      projectId: ENV.appId
    };
    const { data } = await this.client.post(
      GET_USER_INFO_WITH_JWT_PATH,
      payload
    );
    const loginMethod = this.deriveLoginMethod(
      data?.platforms,
      data?.platform ?? data.platform ?? null
    );
    return {
      ...data,
      platform: loginMethod,
      loginMethod
    };
  }
  async authenticateRequest(req) {
    const cookies = this.parseCookies(req.headers.cookie);
    const sessionCookie = cookies.get(COOKIE_NAME);
    const session = await this.verifySession(sessionCookie);
    if (!session) {
      throw ForbiddenError("Invalid session cookie");
    }
    const sessionUserId = session.openId;
    const signedInAt = /* @__PURE__ */ new Date();
    let user = await getUserByOpenId(sessionUserId);
    if (!user) {
      try {
        const userInfo = await this.getUserInfoWithJwt(sessionCookie ?? "");
        await upsertUser({
          openId: userInfo.openId,
          name: userInfo.name || null,
          email: userInfo.email ?? null,
          loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
          lastSignedIn: signedInAt
        });
        user = await getUserByOpenId(userInfo.openId);
      } catch (error) {
        console.error("[Auth] Failed to sync user from OAuth:", error);
        throw ForbiddenError("Failed to sync user info");
      }
    }
    if (!user) {
      throw ForbiddenError("User not found");
    }
    await upsertUser({
      openId: user.openId,
      lastSignedIn: signedInAt
    });
    return user;
  }
};
var sdk = new SDKServer();

// server/_core/oauth.ts
function getQueryParam(req, key) {
  const value = req.query[key];
  return typeof value === "string" ? value : void 0;
}
function registerOAuthRoutes(app) {
  app.get("/api/oauth/callback", async (req, res) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");
    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }
    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
      if (!userInfo.openId) {
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }
      await upsertUser({
        openId: userInfo.openId,
        name: userInfo.name || null,
        email: userInfo.email ?? null,
        loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
        lastSignedIn: /* @__PURE__ */ new Date()
      });
      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS
      });
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      res.redirect(302, "/");
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });
}

// server/_core/systemRouter.ts
import { z } from "zod";

// server/_core/notification.ts
import { TRPCError } from "@trpc/server";
var TITLE_MAX_LENGTH = 1200;
var CONTENT_MAX_LENGTH = 2e4;
var trimValue = (value) => value.trim();
var isNonEmptyString2 = (value) => typeof value === "string" && value.trim().length > 0;
var buildEndpointUrl = (baseUrl) => {
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return new URL(
    "webdevtoken.v1.WebDevService/SendNotification",
    normalizedBase
  ).toString();
};
var validatePayload = (input) => {
  if (!isNonEmptyString2(input.title)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification title is required."
    });
  }
  if (!isNonEmptyString2(input.content)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification content is required."
    });
  }
  const title = trimValue(input.title);
  const content = trimValue(input.content);
  if (title.length > TITLE_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification title must be at most ${TITLE_MAX_LENGTH} characters.`
    });
  }
  if (content.length > CONTENT_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification content must be at most ${CONTENT_MAX_LENGTH} characters.`
    });
  }
  return { title, content };
};
async function notifyOwner(payload) {
  const { title, content } = validatePayload(payload);
  if (!ENV.forgeApiUrl) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service URL is not configured."
    });
  }
  if (!ENV.forgeApiKey) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service API key is not configured."
    });
  }
  const endpoint = buildEndpointUrl(ENV.forgeApiUrl);
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${ENV.forgeApiKey}`,
        "content-type": "application/json",
        "connect-protocol-version": "1"
      },
      body: JSON.stringify({ title, content })
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.warn(
        `[Notification] Failed to notify owner (${response.status} ${response.statusText})${detail ? `: ${detail}` : ""}`
      );
      return false;
    }
    return true;
  } catch (error) {
    console.warn("[Notification] Error calling notification service:", error);
    return false;
  }
}

// server/_core/trpc.ts
import { initTRPC, TRPCError as TRPCError2 } from "@trpc/server";
import superjson from "superjson";
var t = initTRPC.context().create({
  transformer: superjson
});
var router = t.router;
var publicProcedure = t.procedure;
var requireUser = t.middleware(async (opts) => {
  const { ctx, next } = opts;
  if (!ctx.user) {
    throw new TRPCError2({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user
    }
  });
});
var protectedProcedure = t.procedure.use(requireUser);
var adminProcedure = t.procedure.use(
  t.middleware(async (opts) => {
    const { ctx, next } = opts;
    if (!ctx.user || ctx.user.role !== "admin") {
      throw new TRPCError2({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }
    return next({
      ctx: {
        ...ctx,
        user: ctx.user
      }
    });
  })
);

// server/_core/systemRouter.ts
var systemRouter = router({
  health: publicProcedure.input(
    z.object({
      timestamp: z.number().min(0, "timestamp cannot be negative")
    })
  ).query(() => ({
    ok: true
  })),
  notifyOwner: adminProcedure.input(
    z.object({
      title: z.string().min(1, "title is required"),
      content: z.string().min(1, "content is required")
    })
  ).mutation(async ({ input }) => {
    const delivered = await notifyOwner(input);
    return {
      success: delivered
    };
  })
});

// server/routers/food.ts
import { z as z2 } from "zod";

// server/_core/llm.ts
var ensureArray = (value) => Array.isArray(value) ? value : [value];
var normalizeContentPart = (part) => {
  if (typeof part === "string") {
    return { type: "text", text: part };
  }
  if (part.type === "text") {
    return part;
  }
  if (part.type === "image_url") {
    return part;
  }
  if (part.type === "file_url") {
    return part;
  }
  throw new Error("Unsupported message content part");
};
var normalizeMessage = (message) => {
  const { role, name, tool_call_id } = message;
  if (role === "tool" || role === "function") {
    const content = ensureArray(message.content).map((part) => typeof part === "string" ? part : JSON.stringify(part)).join("\n");
    return {
      role,
      name,
      tool_call_id,
      content
    };
  }
  const contentParts = ensureArray(message.content).map(normalizeContentPart);
  if (contentParts.length === 1 && contentParts[0].type === "text") {
    return {
      role,
      name,
      content: contentParts[0].text
    };
  }
  return {
    role,
    name,
    content: contentParts
  };
};
var normalizeToolChoice = (toolChoice, tools) => {
  if (!toolChoice) return void 0;
  if (toolChoice === "none" || toolChoice === "auto") {
    return toolChoice;
  }
  if (toolChoice === "required") {
    if (!tools || tools.length === 0) {
      throw new Error(
        "tool_choice 'required' was provided but no tools were configured"
      );
    }
    if (tools.length > 1) {
      throw new Error(
        "tool_choice 'required' needs a single tool or specify the tool name explicitly"
      );
    }
    return {
      type: "function",
      function: { name: tools[0].function.name }
    };
  }
  if ("name" in toolChoice) {
    return {
      type: "function",
      function: { name: toolChoice.name }
    };
  }
  return toolChoice;
};
var resolveApiUrl = () => ENV.forgeApiUrl && ENV.forgeApiUrl.trim().length > 0 ? `${ENV.forgeApiUrl.replace(/\/$/, "")}/v1/chat/completions` : "https://forge.manus.im/v1/chat/completions";
var assertApiKey = () => {
  if (!ENV.forgeApiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }
};
var normalizeResponseFormat = ({
  responseFormat,
  response_format,
  outputSchema,
  output_schema
}) => {
  const explicitFormat = responseFormat || response_format;
  if (explicitFormat) {
    if (explicitFormat.type === "json_schema" && !explicitFormat.json_schema?.schema) {
      throw new Error(
        "responseFormat json_schema requires a defined schema object"
      );
    }
    return explicitFormat;
  }
  const schema = outputSchema || output_schema;
  if (!schema) return void 0;
  if (!schema.name || !schema.schema) {
    throw new Error("outputSchema requires both name and schema");
  }
  return {
    type: "json_schema",
    json_schema: {
      name: schema.name,
      schema: schema.schema,
      ...typeof schema.strict === "boolean" ? { strict: schema.strict } : {}
    }
  };
};
async function invokeLLM(params) {
  assertApiKey();
  const {
    messages,
    tools,
    toolChoice,
    tool_choice,
    outputSchema,
    output_schema,
    responseFormat,
    response_format
  } = params;
  const payload = {
    model: "gemini-2.5-flash",
    messages: messages.map(normalizeMessage)
  };
  if (tools && tools.length > 0) {
    payload.tools = tools;
  }
  const normalizedToolChoice = normalizeToolChoice(
    toolChoice || tool_choice,
    tools
  );
  if (normalizedToolChoice) {
    payload.tool_choice = normalizedToolChoice;
  }
  payload.max_tokens = 32768;
  payload.thinking = {
    "budget_tokens": 128
  };
  const normalizedResponseFormat = normalizeResponseFormat({
    responseFormat,
    response_format,
    outputSchema,
    output_schema
  });
  if (normalizedResponseFormat) {
    payload.response_format = normalizedResponseFormat;
  }
  const response = await fetch(resolveApiUrl(), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${ENV.forgeApiKey}`
    },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `LLM invoke failed: ${response.status} ${response.statusText} \u2013 ${errorText}`
    );
  }
  return await response.json();
}

// server/storage.ts
function getStorageConfig() {
  const baseUrl = ENV.forgeApiUrl;
  const apiKey = ENV.forgeApiKey;
  if (!baseUrl || !apiKey) {
    throw new Error(
      "Storage proxy credentials missing: set BUILT_IN_FORGE_API_URL and BUILT_IN_FORGE_API_KEY"
    );
  }
  return { baseUrl: baseUrl.replace(/\/+$/, ""), apiKey };
}
function buildUploadUrl(baseUrl, relKey) {
  const url = new URL("v1/storage/upload", ensureTrailingSlash(baseUrl));
  url.searchParams.set("path", normalizeKey(relKey));
  return url;
}
function ensureTrailingSlash(value) {
  return value.endsWith("/") ? value : `${value}/`;
}
function normalizeKey(relKey) {
  return relKey.replace(/^\/+/, "");
}
function toFormData(data, contentType, fileName) {
  const blob = typeof data === "string" ? new Blob([data], { type: contentType }) : new Blob([data], { type: contentType });
  const form = new FormData();
  form.append("file", blob, fileName || "file");
  return form;
}
function buildAuthHeaders(apiKey) {
  return { Authorization: `Bearer ${apiKey}` };
}
async function storagePut(relKey, data, contentType = "application/octet-stream") {
  const { baseUrl, apiKey } = getStorageConfig();
  const key = normalizeKey(relKey);
  const uploadUrl = buildUploadUrl(baseUrl, key);
  const formData = toFormData(data, contentType, key.split("/").pop() ?? key);
  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: buildAuthHeaders(apiKey),
    body: formData
  });
  if (!response.ok) {
    const message = await response.text().catch(() => response.statusText);
    throw new Error(
      `Storage upload failed (${response.status} ${response.statusText}): ${message}`
    );
  }
  const url = (await response.json()).url;
  return { key, url };
}

// server/routers/food.ts
import { nanoid } from "nanoid";
var MealTime = z2.enum(["morning", "noon", "evening", "lateNight"]);
var FoodSource = z2.enum(["manual", "image", "barcode"]);
var AddFoodEntrySchema = z2.object({
  foodName: z2.string().min(1),
  mealTime: MealTime,
  calories: z2.number().int().min(0),
  protein: z2.number().min(0),
  carbs: z2.number().min(0),
  fats: z2.number().min(0),
  quantity: z2.number().default(1),
  unit: z2.string().default("serving"),
  imageUrl: z2.string().optional(),
  barcode: z2.string().optional(),
  source: FoodSource,
  date: z2.date()
});
var AnalyzeFoodImageSchema = z2.object({
  imageUrl: z2.string(),
  mealTime: MealTime,
  date: z2.date()
});
var AnalyzeBarcodeSchema = z2.object({
  barcode: z2.string(),
  mealTime: MealTime,
  date: z2.date()
});
var foodRouter = router({
  // Add a food entry manually
  addFood: protectedProcedure.input(AddFoodEntrySchema).mutation(async ({ ctx, input }) => {
    const entry = await addFoodEntry({
      userId: ctx.user.id,
      ...input
    });
    const entries = await getFoodEntriesByDate(ctx.user.id, input.date);
    const totals = entries.reduce(
      (acc, e) => ({
        totalCalories: acc.totalCalories + e.calories,
        totalProtein: acc.totalProtein + (e.protein || 0),
        totalCarbs: acc.totalCarbs + (e.carbs || 0),
        totalFats: acc.totalFats + (e.fats || 0)
      }),
      { totalCalories: 0, totalProtein: 0, totalCarbs: 0, totalFats: 0 }
    );
    await upsertDailySummary(ctx.user.id, input.date, totals);
    return entry;
  }),
  // Get food entries for a specific date
  getFoodsByDate: protectedProcedure.input(z2.object({ date: z2.date() })).query(async ({ ctx, input }) => {
    const entries = await getFoodEntriesByDate(ctx.user.id, input.date);
    return entries;
  }),
  // Delete a food entry
  deleteFood: protectedProcedure.input(z2.object({ id: z2.number() })).mutation(async ({ ctx, input }) => {
    await deleteFoodEntry(input.id, ctx.user.id);
    return { success: true };
  }),
  // Update a food entry
  updateFood: protectedProcedure.input(
    z2.object({
      id: z2.number(),
      data: AddFoodEntrySchema.partial()
    })
  ).mutation(async ({ ctx, input }) => {
    await updateFoodEntry(input.id, ctx.user.id, input.data);
    return { success: true };
  }),
  // Get daily summary
  getDailySummary: protectedProcedure.input(z2.object({ date: z2.date() })).query(async ({ ctx, input }) => {
    const summary = await getDailySummary(ctx.user.id, input.date);
    return summary || { totalCalories: 0, totalProtein: 0, totalCarbs: 0, totalFats: 0 };
  }),
  // Analyze food image with LLM
  analyzeImage: protectedProcedure.input(AnalyzeFoodImageSchema).mutation(async ({ ctx, input }) => {
    try {
      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: "You are a nutrition expert. Analyze the food image and provide accurate nutritional information. Return JSON with foodName, calories, protein, carbs, fats, quantity, unit."
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Analyze this food image and provide nutritional information."
              },
              {
                type: "image_url",
                image_url: {
                  url: input.imageUrl,
                  detail: "high"
                }
              }
            ]
          }
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "food_analysis",
            strict: true,
            schema: {
              type: "object",
              properties: {
                foodName: { type: "string" },
                calories: { type: "number" },
                protein: { type: "number" },
                carbs: { type: "number" },
                fats: { type: "number" },
                quantity: { type: "number" },
                unit: { type: "string" }
              },
              required: ["foodName", "calories", "protein", "carbs", "fats", "quantity", "unit"],
              additionalProperties: false
            }
          }
        }
      });
      const rawContent = response.choices[0]?.message.content;
      if (!rawContent) throw new Error("No response from LLM");
      const content = typeof rawContent === "string" ? rawContent : JSON.stringify(rawContent);
      const analysis = JSON.parse(content);
      const entry = await addFoodEntry({
        userId: ctx.user.id,
        foodName: analysis.foodName,
        mealTime: input.mealTime,
        calories: Math.round(analysis.calories),
        protein: analysis.protein,
        carbs: analysis.carbs,
        fats: analysis.fats,
        quantity: analysis.quantity,
        unit: analysis.unit,
        imageUrl: input.imageUrl,
        source: "image",
        date: input.date
      });
      const entries = await getFoodEntriesByDate(ctx.user.id, input.date);
      const totals = entries.reduce(
        (acc, e) => ({
          totalCalories: acc.totalCalories + e.calories,
          totalProtein: acc.totalProtein + (e.protein || 0),
          totalCarbs: acc.totalCarbs + (e.carbs || 0),
          totalFats: acc.totalFats + (e.fats || 0)
        }),
        { totalCalories: 0, totalProtein: 0, totalCarbs: 0, totalFats: 0 }
      );
      await upsertDailySummary(ctx.user.id, input.date, totals);
      return { success: true, analysis, entry };
    } catch (error) {
      console.error("Image analysis error:", error);
      throw error;
    }
  }),
  // Analyze barcode with LLM
  analyzeBarcode: protectedProcedure.input(AnalyzeBarcodeSchema).mutation(async ({ ctx, input }) => {
    try {
      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: "You are a nutrition expert. Given a barcode number, provide accurate nutritional information. Return JSON with foodName, calories, protein, carbs, fats, servingSize, servingUnit."
          },
          {
            role: "user",
            content: `Look up nutrition for barcode: ${input.barcode}`
          }
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "barcode_analysis",
            strict: true,
            schema: {
              type: "object",
              properties: {
                foodName: { type: "string" },
                calories: { type: "number" },
                protein: { type: "number" },
                carbs: { type: "number" },
                fats: { type: "number" },
                servingSize: { type: "number" },
                servingUnit: { type: "string" }
              },
              required: ["foodName", "calories", "protein", "carbs", "fats", "servingSize", "servingUnit"],
              additionalProperties: false
            }
          }
        }
      });
      const rawContent = response.choices[0]?.message.content;
      if (!rawContent) throw new Error("No response from LLM");
      const content = typeof rawContent === "string" ? rawContent : JSON.stringify(rawContent);
      const analysis = JSON.parse(content);
      const entry = await addFoodEntry({
        userId: ctx.user.id,
        foodName: analysis.foodName,
        mealTime: input.mealTime,
        calories: Math.round(analysis.calories),
        protein: analysis.protein,
        carbs: analysis.carbs,
        fats: analysis.fats,
        quantity: analysis.servingSize,
        unit: analysis.servingUnit,
        barcode: input.barcode,
        source: "barcode",
        date: input.date
      });
      const entries = await getFoodEntriesByDate(ctx.user.id, input.date);
      const totals = entries.reduce(
        (acc, e) => ({
          totalCalories: acc.totalCalories + e.calories,
          totalProtein: acc.totalProtein + (e.protein || 0),
          totalCarbs: acc.totalCarbs + (e.carbs || 0),
          totalFats: acc.totalFats + (e.fats || 0)
        }),
        { totalCalories: 0, totalProtein: 0, totalCarbs: 0, totalFats: 0 }
      );
      await upsertDailySummary(ctx.user.id, input.date, totals);
      return { success: true, analysis, entry };
    } catch (error) {
      console.error("Barcode analysis error:", error);
      throw error;
    }
  }),
  // Upload image and return URL for analysis
  uploadImage: protectedProcedure.input(z2.object({ imageBase64: z2.string() })).mutation(async ({ ctx, input }) => {
    try {
      const buffer = Buffer.from(input.imageBase64, "base64");
      const fileKey = `food-images/${ctx.user.id}/${nanoid()}.jpg`;
      const { url } = await storagePut(fileKey, buffer, "image/jpeg");
      return { url };
    } catch (error) {
      console.error("Image upload error:", error);
      throw error;
    }
  }),
  // Add custom food to user's database
  addCustomFood: protectedProcedure.input(
    z2.object({
      foodName: z2.string().min(1),
      calories: z2.number().int().min(0),
      protein: z2.number().min(0),
      carbs: z2.number().min(0),
      fats: z2.number().min(0),
      unit: z2.string().default("serving")
    })
  ).mutation(async ({ ctx, input }) => {
    const food = await addCustomFood({
      userId: ctx.user.id,
      ...input
    });
    return food;
  }),
  // Get user's custom foods
  getCustomFoods: protectedProcedure.query(async ({ ctx }) => {
    const foods = await getCustomFoodsByUser(ctx.user.id);
    return foods;
  }),
  // Get user's goals
  getGoals: protectedProcedure.query(async ({ ctx }) => {
    const goals = await getUserGoals(ctx.user.id);
    return goals || {
      dailyCalories: 2e3,
      dailyProtein: 150,
      dailyCarbs: 250,
      dailyFats: 65
    };
  }),
  // Calculate macros for a food item
  calculateMacros: protectedProcedure.input(
    z2.object({
      foodName: z2.string().min(1),
      quantity: z2.number().default(1),
      unit: z2.string().default("serving")
    })
  ).mutation(async ({ ctx, input }) => {
    try {
      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: "You are a nutrition expert. Given a food name, quantity, and unit, provide accurate nutritional information per serving. Return JSON with calories, protein, carbs, fats."
          },
          {
            role: "user",
            content: `Calculate nutrition for: ${input.quantity} ${input.unit} of ${input.foodName}`
          }
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "macro_calculation",
            strict: true,
            schema: {
              type: "object",
              properties: {
                calories: { type: "number" },
                protein: { type: "number" },
                carbs: { type: "number" },
                fats: { type: "number" }
              },
              required: ["calories", "protein", "carbs", "fats"],
              additionalProperties: false
            }
          }
        }
      });
      const rawContent = response.choices[0]?.message.content;
      if (!rawContent) throw new Error("No response from LLM");
      const content = typeof rawContent === "string" ? rawContent : JSON.stringify(rawContent);
      const analysis = JSON.parse(content);
      return analysis;
    } catch (error) {
      console.error("Macro calculation error:", error);
      return {
        calories: 0,
        protein: 0,
        carbs: 0,
        fats: 0
      };
    }
  }),
  // Update user's goals
  updateGoals: protectedProcedure.input(
    z2.object({
      height: z2.number().optional(),
      weight: z2.number().optional(),
      age: z2.number().optional(),
      gender: z2.enum(["male", "female", "other"]).optional(),
      activityLevel: z2.enum(["sedentary", "light", "moderate", "active", "veryActive"]).optional(),
      dailyCalories: z2.number().int().min(500).max(1e4).optional(),
      dailyProtein: z2.number().min(0).max(500).optional(),
      dailyCarbs: z2.number().min(0).max(1e3).optional(),
      dailyFats: z2.number().min(0).max(500).optional()
    })
  ).mutation(async ({ ctx, input }) => {
    const goals = await upsertUserGoals(ctx.user.id, input);
    return goals;
  })
});

// server/routers.ts
var appRouter = router({
  // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true
      };
    })
  }),
  food: foodRouter
});

// server/_core/context.ts
async function createContext(opts) {
  let user = null;
  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    user = null;
  }
  return {
    req: opts.req,
    res: opts.res,
    user
  };
}

// server/_core/vite.ts
import express from "express";
import fs2 from "fs";
import { nanoid as nanoid2 } from "nanoid";
import path2 from "path";
import { createServer as createViteServer } from "vite";

// vite.config.ts
import { jsxLocPlugin } from "@builder.io/vite-plugin-jsx-loc";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "node:path";
import { defineConfig } from "vite";
import { vitePluginManusRuntime } from "vite-plugin-manus-runtime";
var PROJECT_ROOT = import.meta.dirname;
var LOG_DIR = path.join(PROJECT_ROOT, ".manus-logs");
var MAX_LOG_SIZE_BYTES = 1 * 1024 * 1024;
var TRIM_TARGET_BYTES = Math.floor(MAX_LOG_SIZE_BYTES * 0.6);
function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}
function trimLogFile(logPath, maxSize) {
  try {
    if (!fs.existsSync(logPath) || fs.statSync(logPath).size <= maxSize) {
      return;
    }
    const lines = fs.readFileSync(logPath, "utf-8").split("\n");
    const keptLines = [];
    let keptBytes = 0;
    const targetSize = TRIM_TARGET_BYTES;
    for (let i = lines.length - 1; i >= 0; i--) {
      const lineBytes = Buffer.byteLength(`${lines[i]}
`, "utf-8");
      if (keptBytes + lineBytes > targetSize) break;
      keptLines.unshift(lines[i]);
      keptBytes += lineBytes;
    }
    fs.writeFileSync(logPath, keptLines.join("\n"), "utf-8");
  } catch {
  }
}
function writeToLogFile(source, entries) {
  if (entries.length === 0) return;
  ensureLogDir();
  const logPath = path.join(LOG_DIR, `${source}.log`);
  const lines = entries.map((entry) => {
    const ts = (/* @__PURE__ */ new Date()).toISOString();
    return `[${ts}] ${JSON.stringify(entry)}`;
  });
  fs.appendFileSync(logPath, `${lines.join("\n")}
`, "utf-8");
  trimLogFile(logPath, MAX_LOG_SIZE_BYTES);
}
function vitePluginManusDebugCollector() {
  return {
    name: "manus-debug-collector",
    transformIndexHtml(html) {
      if (process.env.NODE_ENV === "production") {
        return html;
      }
      return {
        html,
        tags: [
          {
            tag: "script",
            attrs: {
              src: "/__manus__/debug-collector.js",
              defer: true
            },
            injectTo: "head"
          }
        ]
      };
    },
    configureServer(server) {
      server.middlewares.use("/__manus__/logs", (req, res, next) => {
        if (req.method !== "POST") {
          return next();
        }
        const handlePayload = (payload) => {
          if (payload.consoleLogs?.length > 0) {
            writeToLogFile("browserConsole", payload.consoleLogs);
          }
          if (payload.networkRequests?.length > 0) {
            writeToLogFile("networkRequests", payload.networkRequests);
          }
          if (payload.sessionEvents?.length > 0) {
            writeToLogFile("sessionReplay", payload.sessionEvents);
          }
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ success: true }));
        };
        const reqBody = req.body;
        if (reqBody && typeof reqBody === "object") {
          try {
            handlePayload(reqBody);
          } catch (e) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: false, error: String(e) }));
          }
          return;
        }
        let body = "";
        req.on("data", (chunk) => {
          body += chunk.toString();
        });
        req.on("end", () => {
          try {
            const payload = JSON.parse(body);
            handlePayload(payload);
          } catch (e) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: false, error: String(e) }));
          }
        });
      });
    }
  };
}
var plugins = [react(), tailwindcss(), jsxLocPlugin(), vitePluginManusRuntime(), vitePluginManusDebugCollector()];
var vite_config_default = defineConfig({
  plugins,
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets")
    }
  },
  envDir: path.resolve(import.meta.dirname),
  root: path.resolve(import.meta.dirname, "client"),
  publicDir: path.resolve(import.meta.dirname, "client", "public"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  },
  server: {
    host: true,
    allowedHosts: [
      ".manuspre.computer",
      ".manus.computer",
      ".manus-asia.computer",
      ".manuscomputer.ai",
      ".manusvm.computer",
      "localhost",
      "127.0.0.1"
    ],
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  }
});

// server/_core/vite.ts
async function setupVite(app, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    server: serverOptions,
    appType: "custom"
  });
  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        import.meta.dirname,
        "../..",
        "client",
        "index.html"
      );
      let template = await fs2.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid2()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app) {
  const distPath = process.env.NODE_ENV === "development" ? path2.resolve(import.meta.dirname, "../..", "dist", "public") : path2.resolve(import.meta.dirname, "public");
  if (!fs2.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app.use(express.static(distPath));
  app.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/_core/index.ts
function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}
async function findAvailablePort(startPort = 3e3) {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}
async function startServer() {
  const app = express2();
  const server = createServer(app);
  app.use(express2.json({ limit: "50mb" }));
  app.use(express2.urlencoded({ limit: "50mb", extended: true }));
  registerOAuthRoutes(app);
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext
    })
  );
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);
  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }
  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}
startServer().catch(console.error);
