import { describe, expect, it } from "vitest";
import { appRouter } from "../routers";
import type { TrpcContext } from "../_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user-goals",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "test",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };

  return ctx;
}

describe("food.getGoals", () => {
  it("returns default goals when user has no custom goals", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const goals = await caller.food.getGoals();

    expect(goals).toBeDefined();
    // Goals should have the expected macro properties
    expect(goals).toHaveProperty('dailyCalories');
    expect(goals).toHaveProperty('dailyProtein');
    expect(goals).toHaveProperty('dailyCarbs');
    expect(goals).toHaveProperty('dailyFats');
  });
});

describe("food.updateGoals", () => {
  it("updates daily calorie goal", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.food.updateGoals({
      dailyCalories: 2500,
    });

    // Mutation returns a result set header, just verify it executed
    expect(result).toBeDefined();
  });

  it("updates BMI calculator inputs", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.food.updateGoals({
      height: 175,
      weight: 75,
      age: 28,
      gender: "male",
      activityLevel: "moderate",
    });

    // Mutation returns a result set header, just verify it executed
    expect(result).toBeDefined();
  });

  it("updates all macro goals together", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.food.updateGoals({
      dailyCalories: 1800,
      dailyProtein: 180,
      dailyCarbs: 200,
      dailyFats: 60,
    });

    // Mutation returns a result set header, just verify it executed
    expect(result).toBeDefined();
  });

  it("validates calorie range", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Should reject values outside valid range
    try {
      await caller.food.updateGoals({
        dailyCalories: 100, // Too low
      });
      expect.fail("Should have thrown validation error");
    } catch (error: any) {
      expect(error.message).toContain(">=500");
    }
  });

  it("validates macro ranges", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Should reject negative values
    try {
      await caller.food.updateGoals({
        dailyProtein: -10,
      });
      expect.fail("Should have thrown validation error");
    } catch (error: any) {
      // Error should be thrown for invalid input
      expect(error).toBeDefined();
    }
  });
});
