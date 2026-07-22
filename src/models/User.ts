import { Schema, model, models, type InferSchemaType } from "mongoose";
import { PROGRAMS, YEARS } from "@/lib/constants";

const userSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true },
    name: { type: String, required: true },
    googleId: { type: String, required: true, unique: true },
    image: { type: String },

    // Onboarding fields — required to be set before using the rest of the app.
    onboarded: { type: Boolean, default: false },
    gender: { type: String, enum: ["female", "male", "other"], required: false },
    phone: { type: String, required: false },
    year: { type: String, enum: YEARS, required: false },
    program: { type: String, enum: PROGRAMS, required: false },

    // Set on every successful sign-in (not on every session check) — powers
    // the admin dashboard's WAU/MAU active-user counts.
    lastLoginAt: { type: Date, required: false },

    // Settings — editable any time after onboarding.
    contactShareDefaultConsent: { type: Boolean, default: true },
    // Only meaningful for female users — pre-marks their arrival-board posts
    // as girls-only by default so they don't have to re-toggle it every time
    // (still overridable per-post on the arrivals form itself).
    arrivalsGirlsOnlyDefault: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export type UserDoc = InferSchemaType<typeof userSchema>;

export const User = models.User || model("User", userSchema);
