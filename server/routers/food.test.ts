import { describe, it, expect, beforeEach, vi } from "vitest";
import { foodRouter } from "./food";
import { protectedProcedure } from "../_core/trpc";
import type { TrpcContext } from "../_core/context";

// Mock the database functions
vi.mock("../db", () => ({
  addFoodEntry: vi.fn(),
  getFoodEntriesByDate: vi.fn(),
  deleteFoodEntry: vi.fn(),
  updateFoodEntry: vi.fn(),
  getDailySummary: vi.fn(),
  upsertDailySummary: vi.fn(),
  addCustomFood: vi.fn(),
  getCustomFoodsByUser: vi.fn(),
}));

// Mock the LLM
vi.mock("../_core/llm", () => ({
  invokeLLM: vi.fn(),
}));

// Mock the storage
vi.mock("../storage", () => ({
  storagePut: vi.fn(),
}));

describe("Food Router", () => {
  let mockContext: TrpcContext;

  beforeEach(() => {
    mockContext = {
      user: {
        id: 1,
        openId: "test-user",
        email: "test@example.com",
        name: "Test User",
        loginMethod: "manus",
        role: "user",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      },
      req: {
        protocol: "https",
        headers: {},
      } as TrpcContext["req"],
      res: {} as TrpcContext["res"],
    };
  });

  it("should have addFood procedure", () => {
    const procedures = Object.keys(foodRouter._def.procedures);
    expect(procedures).toContain("addFood");
  });

  it("should have getFoodsByDate procedure", () => {
    const procedures = Object.keys(foodRouter._def.procedures);
    expect(procedures).toContain("getFoodsByDate");
  });

  it("should have deleteFood procedure", () => {
    const procedures = Object.keys(foodRouter._def.procedures);
    expect(procedures).toContain("deleteFood");
  });

  it("should have updateFood procedure", () => {
    const procedures = Object.keys(foodRouter._def.procedures);
    expect(procedures).toContain("updateFood");
  });

  it("should have getDailySummary procedure", () => {
    const procedures = Object.keys(foodRouter._def.procedures);
    expect(procedures).toContain("getDailySummary");
  });

  it("should have analyzeImage procedure", () => {
    const procedures = Object.keys(foodRouter._def.procedures);
    expect(procedures).toContain("analyzeImage");
  });

  it("should have analyzeBarcode procedure", () => {
    const procedures = Object.keys(foodRouter._def.procedures);
    expect(procedures).toContain("analyzeBarcode");
  });

  it("should have uploadImage procedure", () => {
    const procedures = Object.keys(foodRouter._def.procedures);
    expect(procedures).toContain("uploadImage");
  });

  it("should have addCustomFood procedure", () => {
    const procedures = Object.keys(foodRouter._def.procedures);
    expect(procedures).toContain("addCustomFood");
  });

  it("should have getCustomFoods procedure", () => {
    const procedures = Object.keys(foodRouter._def.procedures);
    expect(procedures).toContain("getCustomFoods");
  });
});
