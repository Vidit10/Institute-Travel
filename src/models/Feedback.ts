import { Schema, model, models } from "mongoose";

const feedbackSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    category: { type: String, enum: ["recommendation", "bug", "other"], required: true },
    message: { type: String, required: true, minlength: 1, maxlength: 2000 },
  },
  { timestamps: true }
);

export const Feedback = models.Feedback || model("Feedback", feedbackSchema);
