import { model, Schema, type InferSchemaType } from "mongoose";

const enrollmentSchema = new Schema(
  {
    learner: { type: Schema.Types.ObjectId, ref: "User", required: true },
    course: { type: Schema.Types.ObjectId, ref: "Course", required: true },
    completedLessons: [{ type: Schema.Types.ObjectId, required: true }],
    status: { type: String, enum: ["in_progress", "completed"], default: "in_progress", required: true },
  },
  { timestamps: true },
);

enrollmentSchema.index({ learner: 1, course: 1 }, { unique: true });

export type EnrollmentDocument = InferSchemaType<typeof enrollmentSchema>;
export const EnrollmentModel = model("Enrollment", enrollmentSchema);
