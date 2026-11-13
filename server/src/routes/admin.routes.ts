import { Router } from "express";
import { requireAdmin, requireUser } from "../middleware/authentication.js";
import { CourseModel } from "../models/course.model.js";
import { EnrollmentModel } from "../models/enrollment.model.js";
import { UserModel } from "../models/user.model.js";

export const adminRouter = Router();

adminRouter.get("/analytics", requireUser, requireAdmin, async (_request, response) => {
  const [learners, publishedCourses, totalEnrollments, completedEnrollments, popularCourses] = await Promise.all([
    UserModel.countDocuments({ role: "learner" }),
    CourseModel.countDocuments({ isPublished: true }),
    EnrollmentModel.countDocuments(),
    EnrollmentModel.countDocuments({ status: "completed" }),
    EnrollmentModel.aggregate([
      {
        $group: {
          _id: "$course",
          enrollments: { $sum: 1 },
          completions: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } },
        },
      },
      { $lookup: { from: "courses", localField: "_id", foreignField: "_id", as: "course" } },
      { $unwind: "$course" },
      { $match: { "course.isPublished": true } },
      {
        $project: {
          _id: 0,
          title: "$course.title",
          category: "$course.category",
          enrollments: 1,
          completions: 1,
        },
      },
      { $sort: { enrollments: -1, title: 1 } },
      { $limit: 5 },
    ]),
  ]);

  response.json({
    summary: {
      learners,
      publishedCourses,
      totalEnrollments,
      completedEnrollments,
      completionRate: totalEnrollments === 0 ? 0 : Math.round((completedEnrollments / totalEnrollments) * 100),
    },
    popularCourses,
  });
});
