import { z } from "zod";
import {
  RECOMMENDATION_CATEGORIES,
  MAX_RECOMMENDATION_DAYS,
  FOOD_TYPES,
  LEISURE_TYPES,
  VIBE_TAGS_BY_CATEGORY,
  MAX_RECOMMENDATION_VIBE_TAGS,
  MAX_RECOMMENDATION_DISHES,
  MAX_RECOMMENDATION_COMMENT_LENGTH,
} from "@/lib/constants";

// Shared between the public create route (src/app/api/recommendations/route.ts)
// and the admin edit-and-approve route (src/app/api/admin/recommendations/[id]/route.ts)
// — a Next.js route.ts file can only export recognized handler names, so this
// can't live there directly.
export const recommendationFieldsSchema = z
  .object({
    category: z.enum(RECOMMENDATION_CATEGORIES),
    title: z.string().min(1).max(100),
    note: z.string().max(MAX_RECOMMENDATION_COMMENT_LENGTH).optional(),
    area: z.string().max(100).optional(),
    mapLink: z.string().url().max(500),
    suggestedDays: z.number().int().min(1).max(MAX_RECOMMENDATION_DAYS).optional(),
    foodType: z.enum(FOOD_TYPES).optional(),
    dishes: z.array(z.string().min(1).max(50)).max(MAX_RECOMMENDATION_DISHES).optional(),
    leisureType: z.enum(LEISURE_TYPES).optional(),
    vibeTags: z.array(z.string()).max(MAX_RECOMMENDATION_VIBE_TAGS).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.foodType && data.category !== "food") {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Food type only applies to Food & Dining", path: ["foodType"] });
    }
    if (data.dishes && data.category !== "food") {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Dishes only apply to Food & Dining", path: ["dishes"] });
    }
    if (data.leisureType && data.category !== "leisure") {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Leisure type only applies to Leisure", path: ["leisureType"] });
    }
    if (data.vibeTags) {
      const allowed = VIBE_TAGS_BY_CATEGORY[data.category];
      if (!allowed) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "This category doesn't take 'good for' tags", path: ["vibeTags"] });
      } else if (!data.vibeTags.every((t) => allowed.includes(t))) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Invalid tag for this category", path: ["vibeTags"] });
      }
    }
    if (data.suggestedDays && data.category !== "sightseeing") {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Suggested days only applies to Sightseeing", path: ["suggestedDays"] });
    }
  });
