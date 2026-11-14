import { Router, type Request } from "express";
import mongoose from "mongoose";
import { requireAdmin, requireUser } from "../middleware/authentication.js";
import { HttpError } from "../middleware/http-error.js";
import { CourseModel } from "../models/course.model.js";
import { EnrollmentModel } from "../models/enrollment.model.js";
import { isRecord, requiredText } from "../utils/validation.js";

export const coursesRouter = Router();

type CourseInput = {
  title: string;
  description: string;
  category: string;
  level: "beginner" | "intermediate" | "advanced";
  lessons: Array<{ _id?: string; title: string; content: string; videoUrl?: string }>;
};

function youtubeUrl(value: unknown, label: string): string | undefined {
  if (value === undefined || value === "") return undefined;
  if (typeof value !== "string" || value.length > 2048) {
    throw new HttpError(400, `${label} must be a valid YouTube video URL`);
  }
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    const videoId = host === "youtu.be"
      ? url.pathname.slice(1)
      : ["youtube.com", "www.youtube.com", "m.youtube.com"].includes(host)
        ? url.searchParams.get("v") ?? ""
        : "";
    if (url.protocol !== "https:" || !/^[a-zA-Z0-9_-]{11}$/.test(videoId)) throw new Error("invalid");
    return url.toString();
  } catch {
    throw new HttpError(400, `${label} must be a valid YouTube video URL`);
  }
}

function parseCourseInput(value: unknown, existingLessonIds?: Set<string>): CourseInput {
  if (!isRecord(value)) throw new HttpError(400, "A JSON request body is required");
  const title = requiredText(value.title, "Title", 3, 120);
  const description = requiredText(value.description, "Description", 20, 4000);
  const category = requiredText(value.category, "Category", 2, 60);
  if (value.level !== "beginner" && value.level !== "intermediate" && value.level !== "advanced") {
    throw new HttpError(400, "Level must be beginner, intermediate, or advanced");
  }
  if (!Array.isArray(value.lessons) || value.lessons.length < 1 || value.lessons.length > 50) {
    throw new HttpError(400, "A course must include between 1 and 50 lessons");
  }

  const seenLessonIds = new Set<string>();
  const lessons = value.lessons.map((lesson, index) => {
    if (!isRecord(lesson)) throw new HttpError(400, `Lesson ${index + 1} must be an object`);
    const lessonInput: CourseInput["lessons"][number] = {
      title: requiredText(lesson.title, `Lesson ${index + 1} title`, 2, 120),
      content: requiredText(lesson.content, `Lesson ${index + 1} content`, 1, 12000),
    };
    const videoUrl = youtubeUrl(lesson.videoUrl, `Lesson ${index + 1} video URL`);
    if (videoUrl) lessonInput.videoUrl = videoUrl;
    if (lesson._id !== undefined) {
      if (typeof lesson._id !== "string" || !existingLessonIds?.has(lesson._id)) {
        throw new HttpError(400, `Lesson ${index + 1} has an invalid lesson ID`);
      }
      if (seenLessonIds.has(lesson._id)) throw new HttpError(400, "A lesson can only appear once in a course");
      seenLessonIds.add(lesson._id);
      lessonInput._id = lesson._id;
    }
    return lessonInput;
  });
  return { title, description, category, level: value.level, lessons };
}

function validId(id: string): boolean {
  return mongoose.isValidObjectId(id);
}

function getCourseId(request: Request): string {
  const { courseId } = request.params;
  if (typeof courseId !== "string" || !validId(courseId)) throw new HttpError(404, "Course not found");
  return courseId;
}

coursesRouter.get("/", async (request, response) => {
  const filter: Record<string, unknown> = { isPublished: true };
  const search = typeof request.query.search === "string" ? request.query.search.trim().slice(0, 100) : "";
  const category = typeof request.query.category === "string" ? request.query.category.trim().slice(0, 60) : "";
  if (search) {
    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.$or = [{ title: new RegExp(escaped, "i") }, { description: new RegExp(escaped, "i") }];
  }
  if (category) filter.category = category;

  const courses = await CourseModel.find(filter).sort({ createdAt: -1 }).limit(100);
  const counts = await EnrollmentModel.aggregate([
    { $match: { course: { $in: courses.map((course) => course._id) } } },
    { $group: { _id: "$course", count: { $sum: 1 } } },
  ]);
  const enrollmentCounts = new Map(counts.map((entry) => [entry._id.toString(), entry.count]));
  response.json({
    courses: courses.map((course) => ({
      ...course.toObject(),
      enrollmentCount: enrollmentCounts.get(course.id) ?? 0,
    })),
  });
});

coursesRouter.get("/:courseId", async (request, response) => {
  const courseId = getCourseId(request);
  const course = await CourseModel.findOne({ _id: courseId, isPublished: true });
  if (!course) throw new HttpError(404, "Course not found");
  response.json({ course });
});

coursesRouter.post("/", requireUser, requireAdmin, async (request, response) => {
  if (!request.user) throw new HttpError(401, "Please sign in to continue");
  const course = await CourseModel.create({ ...parseCourseInput(request.body), author: request.user._id });
  response.status(201).json({ course });
});

coursesRouter.put("/:courseId", requireUser, requireAdmin, async (request, response) => {
  const courseId = getCourseId(request);
  const course = await CourseModel.findById(courseId);
  if (!course) throw new HttpError(404, "Course not found");
  const existingLessonIds = new Set(course.lessons.map((lesson) => lesson._id.toString()));
  course.set(parseCourseInput(request.body, existingLessonIds));
  await course.save();

  const validLessonIds = new Set(course.lessons.map((lesson) => lesson._id.toString()));
  const enrollments = await EnrollmentModel.find({ course: course._id });
  for (const enrollment of enrollments) {
    enrollment.completedLessons = enrollment.completedLessons.filter((id) => validLessonIds.has(id.toString()));
    enrollment.status = enrollment.completedLessons.length === course.lessons.length ? "completed" : "in_progress";
    await enrollment.save();
  }
  response.json({ course });
});

coursesRouter.delete("/:courseId", requireUser, requireAdmin, async (request, response) => {
  const courseId = getCourseId(request);
  const course = await CourseModel.findByIdAndUpdate(
    courseId,
    { isPublished: false },
    { new: true, runValidators: true },
  );
  if (!course) throw new HttpError(404, "Course not found");
  response.status(204).end();
});
