import { Schema, model, models, type InferSchemaType } from "mongoose";

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
    year: {
      type: String,
      enum: ["UG-1", "UG-2", "UG-3", "UG-4", "PG-1", "PG-2"],
      required: false,
    },
    program: { type: String, enum: ["UG", "PG"], required: false },

    // Settings — editable any time after onboarding.
    nonEssentialEmailOptIn: { type: Boolean, default: true },
    contactShareDefaultConsent: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export type UserDoc = InferSchemaType<typeof userSchema>;

export const User = models.User || model("User", userSchema);
