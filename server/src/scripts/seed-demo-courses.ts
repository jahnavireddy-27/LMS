import { connectDatabase, disconnectDatabase } from "../config/database.js";
import { env } from "../config/env.js";
import { CourseModel } from "../models/course.model.js";
import { UserModel } from "../models/user.model.js";

const demoCourses = [
  {
    title: "Python Programming: First Steps",
    description: "Learn the Python basics through short lessons and small exercises. Start with the full beginner tutorial, then practice variables, conditions, loops, and functions.",
    category: "Programming",
    level: "beginner" as const,
    lessons: [
      {
        title: "Python setup and first program",
        content: "Watch the beginner tutorial, install Python, and run your first print statement. Try changing the message and printing it on two lines.",
        videoUrl: "https://www.youtube.com/watch?v=eWRfhZUzrAc",
      },
      {
        title: "Variables and simple input",
        content: "Practice storing a name, age, and course in variables. Use input() to ask a learner for their name, then print a short welcome message.",
      },
      {
        title: "Conditions and loops",
        content: "Write a small program that checks whether a score is passing. Then use a loop to print the numbers from 1 to 10.",
      },
      {
        title: "Functions and a mini exercise",
        content: "Create a function that converts minutes to seconds. Call it with a few values and check the results.",
      },
    ],
  },
  {
    title: "Build Your First Web Page",
    description: "Get comfortable with the building blocks of a web page. Learn basic HTML structure, add useful CSS, and make a simple page that works on a phone.",
    category: "Web development",
    level: "beginner" as const,
    lessons: [
      {
        title: "HTML and CSS course overview",
        content: "Watch the full beginner course, then create an index.html file and add a heading, paragraph, and link of your own.",
        videoUrl: "https://www.youtube.com/watch?v=a_iQb1lnAEQ",
      },
      {
        title: "Structure a page with HTML",
        content: "Add a header, main section, and footer. Use semantic elements and give the page a useful title.",
      },
      {
        title: "Style the page with CSS",
        content: "Choose two colors, set a readable font size, and add spacing between sections. Keep the layout simple and easy to scan.",
      },
      {
        title: "Make it work on mobile",
        content: "Resize your browser to a phone width. Add one media query so the content remains readable on a narrow screen.",
      },
    ],
  },
];

async function seedDemoCourses(): Promise<void> {
  await connectDatabase();
  const admin = await UserModel.findOne({ role: "admin", ...(env.adminEmail ? { email: env.adminEmail } : {}) });
  if (!admin) {
    throw new Error("Create the configured administrator account in the app before seeding demo courses.");
  }

  let created = 0;
  for (const courseData of demoCourses) {
    const existing = await CourseModel.exists({ title: courseData.title });
    if (existing) continue;
    await CourseModel.create({ ...courseData, author: admin._id, isPublished: true });
    created += 1;
  }
  console.info(`Demo courses ready. ${created} course${created === 1 ? "" : "s"} added; existing courses were kept.`);
}

seedDemoCourses()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "Could not seed demo courses.");
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectDatabase();
  });
