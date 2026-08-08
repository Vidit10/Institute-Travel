import { z } from "zod";
import {
  EVENT_CATEGORIES,
  MAX_EVENT_TITLE_LENGTH,
  MAX_EVENT_DESCRIPTION_LENGTH,
  MAX_EVENT_ADVANCE_DAYS,
} from "@/lib/constants";

// Shared by the create route (and any future edit route) so the rules can't
// drift apart — same pattern as recommendationFieldsSchema.
export const createEventSchema = z
  .object({
    title: z.string().min(1).max(MAX_EVENT_TITLE_LENGTH),
    description: z.string().max(MAX_EVENT_DESCRIPTION_LENGTH).optional(),
    category: z.enum(EVENT_CATEGORIES),
    location: z.string().min(1).max(200),
    mapLink: z.string().url().max(500).optional(),
    startTime: z.string().datetime(),
    capacity: z.number().int().min(1).max(500).optional(),
  })
  .refine(
    (data) => {
      const start = new Date(data.startTime);
      const now = Date.now();
      return start.getTime() > now && start.getTime() <= now + MAX_EVENT_ADVANCE_DAYS * 24 * 60 * 60 * 1000;
    },
    {
      message: `Events can only be listed for a start time within the next ${MAX_EVENT_ADVANCE_DAYS} days`,
      path: ["startTime"],
    }
  );
