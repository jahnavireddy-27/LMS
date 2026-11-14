import { Router, type Request } from "express";
import mongoose from "mongoose";
import { requireUser } from "../middleware/authentication.js";
import { HttpError } from "../middleware/http-error.js";
import { CourseModel } from "../models/course.model.js";
import { EnrollmentModel } from "../models/enrollment.model.js";
import { isRecord } from "../utils/validation.js";

export const enrollmentsRouter = Router();

function getCourseId(request: Request): string {
  const { courseId } = request.params;
  if (typeof courseId !== "string" || !mongoose.isValidObjectId(courseId)) {
    throw new HttpError(404, "Course not found");
  }
  return courseId;
}

enrollmentsRouter.use(requireUser);

enrollmentsRouter.get("/me", async (request, response) => {
  const enrollments = await EnrollmentModel.find({ learner: request.user!._id }).sort({ updatedAt: -1 });
  const courses = await CourseModel.find({
    _id: { $in: enrollments.map((enrollment) => enrollment.course) },
    isPublished: true,
  });
  const coursesById = new Map(courses.map((course) => [course.id, course]));

  response.json({
    enrollments: enrollments.flatMap((enrollment) => {
      const course = coursesById.get(enrollment.course.toString());
      if (!course) return [];
      return [{
        ...enrollment.toObject(),
        course,
        progress: Math.round((enrollment.completedLessons.length / course.lessons.length) * 100),
      }];
    }),
  });
});

enrollmentsRouter.post("/:courseId", async (request, response) => {
  const courseId = getCourseId(request);
  const course = await CourseModel.findOne({ _id: courseId, isPublished: true });
  if (!course) throw new HttpError(404, "Course not found");

  const enrollment = await EnrollmentModel.findOneAndUpdate(
    { learner: request.user!._id, course: course._id },
    { $setOnInsert: { learner: request.user!._id, course: course._id, completedLessons: [], status: "in_progress" } },
    { new: true, upsert: true, runValidators: true },
  );
  response.status(201).json({ enrollment });
});

enrollmentsRouter.patch("/:courseId/progress", async (request, response) => {
  const courseId = getCourseId(request);
  if (!isRecord(request.body) || typeof request.body.lessonId !== "string" || !mongoose.isValidObjectId(request.body.lessonId)) {
    throw new HttpError(400, "A valid lessonId is required");
  }
  const lessonIdValue = request.body.lessonId;
  if (typeof request.body.completed !== "boolean") {
    throw new HttpError(400, "completed must be true or false");
  }
  const completed = request.body.completed;

  const course = await CourseModel.findOne({ _id: courseId, isPublished: true });
  if (!course) throw new HttpError(404, "Course not found");
  const lessonExists = course.lessons.some((lesson) => lesson._id.toString() === lessonIdValue);
  if (!lessonExists) throw new HttpError(404, "Lesson not found in this course");

  const enrollment = await EnrollmentModel.findOne({ learner: request.user!._id, course: course._id });
  if (!enrollment) throw new HttpError(404, "Enroll in this course before tracking progress");

  const lessonId = new mongoose.Types.ObjectId(lessonIdValue);
  if (completed) {
    if (!enrollment.completedLessons.some((id) => id.equals(lessonId))) enrollment.completedLessons.push(lessonId);
  } else {
    enrollment.completedLessons = enrollment.completedLessons.filter((id) => !id.equals(lessonId));
  }
  enrollment.status = enrollment.completedLessons.length === course.lessons.length ? "completed" : "in_progress";
  await enrollment.save();

  response.json({
    enrollment,
    progress: Math.round((enrollment.completedLessons.length / course.lessons.length) * 100),
  });
});
