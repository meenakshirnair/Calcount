import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { addFoodEntry, getFoodEntriesByDate, deleteFoodEntry, updateFoodEntry, getDailySummary, upsertDailySummary, addCustomFood, getCustomFoodsByUser, getUserGoals, upsertUserGoals } from "../db";
import { invokeLLM } from "../_core/llm";
import { storagePut } from "../storage";
import { nanoid } from "nanoid";

const MealTime = z.enum(["morning", "noon", "evening", "lateNight"]);
const FoodSource = z.enum(["manual", "image", "barcode"]);

const AddFoodEntrySchema = z.object({
  foodName: z.string().min(1),
  mealTime: MealTime,
  calories: z.number().int().min(0),
  protein: z.number().min(0),
  carbs: z.number().min(0),
  fats: z.number().min(0),
  quantity: z.number().default(1),
  unit: z.string().default("serving"),
  imageUrl: z.string().optional(),
  barcode: z.string().optional(),
  source: FoodSource,
  date: z.date(),
});

const AnalyzeFoodImageSchema = z.object({
  imageUrl: z.string(),
  mealTime: MealTime,
  date: z.date(),
});

const AnalyzeBarcodeSchema = z.object({
  barcode: z.string(),
  mealTime: MealTime,
  date: z.date(),
});

export const foodRouter = router({
  // Add a food entry manually
  addFood: protectedProcedure
    .input(AddFoodEntrySchema)
    .mutation(async ({ ctx, input }) => {
      const entry = await addFoodEntry({
        userId: ctx.user.id,
        ...input,
      });

      // Update daily summary
      const entries = await getFoodEntriesByDate(ctx.user.id, input.date);
      const totals = entries.reduce(
        (acc, e) => ({
          totalCalories: acc.totalCalories + e.calories,
          totalProtein: acc.totalProtein + (e.protein || 0),
          totalCarbs: acc.totalCarbs + (e.carbs || 0),
          totalFats: acc.totalFats + (e.fats || 0),
        }),
        { totalCalories: 0, totalProtein: 0, totalCarbs: 0, totalFats: 0 }
      );

      await upsertDailySummary(ctx.user.id, input.date, totals);

      return entry;
    }),

  // Get food entries for a specific date
  getFoodsByDate: protectedProcedure
    .input(z.object({ date: z.date() }))
    .query(async ({ ctx, input }) => {
      const entries = await getFoodEntriesByDate(ctx.user.id, input.date);
      return entries;
    }),

  // Delete a food entry
  deleteFood: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await deleteFoodEntry(input.id, ctx.user.id);
      return { success: true };
    }),

  // Update a food entry
  updateFood: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        data: AddFoodEntrySchema.partial(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await updateFoodEntry(input.id, ctx.user.id, input.data);
      return { success: true };
    }),

  // Get daily summary
  getDailySummary: protectedProcedure
    .input(z.object({ date: z.date() }))
    .query(async ({ ctx, input }) => {
      const summary = await getDailySummary(ctx.user.id, input.date);
      return summary || { totalCalories: 0, totalProtein: 0, totalCarbs: 0, totalFats: 0 };
    }),

  // Analyze food image with LLM
  analyzeImage: protectedProcedure
    .input(AnalyzeFoodImageSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: "You are a nutrition expert. Analyze the food image and provide accurate nutritional information. Return JSON with foodName, calories, protein, carbs, fats, quantity, unit.",
            },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "Analyze this food image and provide nutritional information.",
                },
                {
                  type: "image_url",
                  image_url: {
                    url: input.imageUrl,
                    detail: "high",
                  },
                },
              ] as any,
            },
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
                  unit: { type: "string" },
                },
                required: ["foodName", "calories", "protein", "carbs", "fats", "quantity", "unit"],
                additionalProperties: false,
              },
            },
          },
        });

        const rawContent = response.choices[0]?.message.content;
        if (!rawContent) throw new Error("No response from LLM");
        const content = typeof rawContent === 'string' ? rawContent : JSON.stringify(rawContent);
        const analysis = JSON.parse(content);

        // Add the food entry
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
          date: input.date,
        });

        // Update daily summary
        const entries = await getFoodEntriesByDate(ctx.user.id, input.date);
        const totals = entries.reduce(
          (acc, e) => ({
            totalCalories: acc.totalCalories + e.calories,
            totalProtein: acc.totalProtein + (e.protein || 0),
            totalCarbs: acc.totalCarbs + (e.carbs || 0),
            totalFats: acc.totalFats + (e.fats || 0),
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
  analyzeBarcode: protectedProcedure
    .input(AnalyzeBarcodeSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: "You are a nutrition expert. Given a barcode number, provide accurate nutritional information. Return JSON with foodName, calories, protein, carbs, fats, servingSize, servingUnit.",
            },
            {
              role: "user",
              content: `Look up nutrition for barcode: ${input.barcode}`,
            },
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
                  servingUnit: { type: "string" },
                },
                required: ["foodName", "calories", "protein", "carbs", "fats", "servingSize", "servingUnit"],
                additionalProperties: false,
              },
            },
          },
        });

        const rawContent = response.choices[0]?.message.content;
        if (!rawContent) throw new Error("No response from LLM");
        const content = typeof rawContent === 'string' ? rawContent : JSON.stringify(rawContent);
        const analysis = JSON.parse(content);

        // Add the food entry
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
          date: input.date,
        });

        // Update daily summary
        const entries = await getFoodEntriesByDate(ctx.user.id, input.date);
        const totals = entries.reduce(
          (acc, e) => ({
            totalCalories: acc.totalCalories + e.calories,
            totalProtein: acc.totalProtein + (e.protein || 0),
            totalCarbs: acc.totalCarbs + (e.carbs || 0),
            totalFats: acc.totalFats + (e.fats || 0),
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
  uploadImage: protectedProcedure
    .input(z.object({ imageBase64: z.string() }))
    .mutation(async ({ ctx, input }) => {
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
  addCustomFood: protectedProcedure
    .input(
      z.object({
        foodName: z.string().min(1),
        calories: z.number().int().min(0),
        protein: z.number().min(0),
        carbs: z.number().min(0),
        fats: z.number().min(0),
        unit: z.string().default("serving"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const food = await addCustomFood({
        userId: ctx.user.id,
        ...input,
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
      dailyCalories: 2000,
      dailyProtein: 150,
      dailyCarbs: 250,
      dailyFats: 65,
    };
  }),

  // Calculate macros for a food item
  calculateMacros: protectedProcedure
    .input(
      z.object({
        foodName: z.string().min(1),
        quantity: z.number().default(1),
        unit: z.string().default("serving"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: "You are a nutrition expert. Given a food name, quantity, and unit, provide accurate nutritional information per serving. Return JSON with calories, protein, carbs, fats.",
            },
            {
              role: "user",
              content: `Calculate nutrition for: ${input.quantity} ${input.unit} of ${input.foodName}`,
            },
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
                  fats: { type: "number" },
                },
                required: ["calories", "protein", "carbs", "fats"],
                additionalProperties: false,
              },
            },
          },
        });

        const rawContent = response.choices[0]?.message.content;
        if (!rawContent) throw new Error("No response from LLM");
        const content = typeof rawContent === 'string' ? rawContent : JSON.stringify(rawContent);
        const analysis = JSON.parse(content);

        return analysis;
      } catch (error) {
        console.error("Macro calculation error:", error);
        // Return default values if LLM fails
        return {
          calories: 0,
          protein: 0,
          carbs: 0,
          fats: 0,
        };
      }
    }),

  // Update user's goals
  updateGoals: protectedProcedure
    .input(
      z.object({
        height: z.number().optional(),
        weight: z.number().optional(),
        age: z.number().optional(),
        gender: z.enum(["male", "female", "other"]).optional(),
        activityLevel: z.enum(["sedentary", "light", "moderate", "active", "veryActive"]).optional(),
        dailyCalories: z.number().int().min(500).max(10000).optional(),
        dailyProtein: z.number().min(0).max(500).optional(),
        dailyCarbs: z.number().min(0).max(1000).optional(),
        dailyFats: z.number().min(0).max(500).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const goals = await upsertUserGoals(ctx.user.id, input);
      return goals;
    }),
});
