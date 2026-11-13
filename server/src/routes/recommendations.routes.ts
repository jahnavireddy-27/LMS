import { Router } from "express";
import { requireUser } from "../middleware/authentication.js";
import { HttpError } from "../middleware/http-error.js";
import { CourseModel } from "../models/course.model.js";
import { EnrollmentModel } from "../models/enrollment.model.js";

export const recommendationsRouter = Router();

recommendationsRouter.get("/", requireUser, async (request, response) => {
  if (!request.user) throw new HttpError(401, "Please sign in to continue");
  const enrollments = await EnrollmentModel.find({ learner: request.user._id });
  const enrolledCourseIds = enrollments.map((enrollment) => enrollment.course);
  const enrolledCourses = await CourseModel.find({
    _id: { $in: enrolledCourseIds },
    isPublished: true,
  }).select("category");

  const categoryCounts = new Map<string, number>();
  for (const course of enrolledCourses) {
    categoryCounts.set(course.category, (categoryCounts.get(course.category) ?? 0) + 1);
  }

  if (categoryCounts.size === 0) {
    response.json({ recommendations: [], reason: "Enroll in a course to personalize your recommendations." });
    return;
  }

  const courses = await CourseModel.find({
    isPublished: true,
    category: { $in: [...categoryCounts.keys()] },
    _id: { $nin: enrolledCourseIds },
  }).sort({ createdAt: -1 }).limit(20);

  response.json({
    recommendations: courses
      .map((course) => ({
        course,
        reason: `Because you are learning ${course.category}`,
        score: categoryCounts.get(course.category) ?? 0,
      }))
      .sort((left, right) => right.score - left.score)
      .slice(0, 6),
  });
});
