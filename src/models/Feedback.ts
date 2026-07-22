import { Schema, model, models } from "mongoose";

const feedbackSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    category: {
      type: String,
      enum: ["recommendation", "bug", "report", "profile_correction", "other"],
      required: true,
    },
    message: { type: String, required: true, minlength: 1, maxlength: 2000 },
    // Free-text pointer to what's being reported (a trip, a person, an arrival
    // entry) — kept simple since there's no admin UI, just read directly in
    // Mongo. Not a ref/populate relationship on purpose.
    contextLabel: { type: String, required: false, maxlength: 200 },
  },
  { timestamps: true }
);

export const Feedback = models.Feedback || model("Feedback", feedbackSchema);
