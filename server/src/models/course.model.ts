import { model, Schema, type InferSchemaType } from "mongoose";

const lessonSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, minlength: 2, maxlength: 120 },
    content: { type: String, required: true, trim: true, minlength: 1, maxlength: 12000 },
    videoUrl: { type: String, trim: true, maxlength: 2048 },
  },
  { timestamps: false },
);

const courseSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, minlength: 3, maxlength: 120 },
    description: { type: String, required: true, trim: true, minlength: 20, maxlength: 4000 },
    category: { type: String, required: true, trim: true, minlength: 2, maxlength: 60 },
    level: { type: String, enum: ["beginner", "intermediate", "advanced"], required: true },
    lessons: { type: [lessonSchema], required: true, validate: [(lessons: unknown[]) => lessons.length > 0, "A course needs at least one lesson"] },
    author: { type: Schema.Types.ObjectId, ref: "User", required: true },
    isPublished: { type: Boolean, default: true, required: true },
  },
  { timestamps: true },
);

export type CourseDocument = InferSchemaType<typeof courseSchema>;
export const CourseModel = model("Course", courseSchema);
