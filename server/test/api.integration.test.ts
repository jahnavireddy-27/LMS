import assert from "node:assert/strict";
import test from "node:test";

const integrationEnabled = process.env.RUN_INTEGRATION_TESTS === "true";

test(
  "API supports admin publishing and learner enrollment/progress",
  { skip: !integrationEnabled },
  async () => {
    process.env.NODE_ENV = "test";
    process.env.MONGODB_URI ??= "mongodb://127.0.0.1:27017/lms_test";
    process.env.REDIS_URL ??= "redis://127.0.0.1:6379";
    process.env.CLIENT_ORIGIN ??= "http://localhost:3000";

    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const adminEmail = `admin-${suffix}@example.test`;
    const learnerEmail = `learner-${suffix}@example.test`;
    const adminToken = `integration-${suffix}-bootstrap-token`;
    process.env.ADMIN_EMAIL = adminEmail;
    process.env.ADMIN_BOOTSTRAP_TOKEN = adminToken;

    const [{ app }, database, redis, { UserModel }, { CourseModel }, { EnrollmentModel }] = await Promise.all([
      import("../src/app.js"),
      import("../src/config/database.js"),
      import("../src/config/redis.js"),
      import("../src/models/user.model.js"),
      import("../src/models/course.model.js"),
      import("../src/models/enrollment.model.js"),
    ]);

    let courseId: string | undefined;
    let adminCookie = "";
    let learnerCookie = "";
    let server: ReturnType<typeof app.listen> | undefined;
    let baseUrl = "";

    try {
      await database.connectDatabase();
      await redis.connectRedis();
      server = app.listen(0, "127.0.0.1");
      await new Promise<void>((resolve, reject) => {
        server?.once("listening", resolve);
        server?.once("error", reject);
      });
      const address = server.address();
      assert.ok(address && typeof address !== "string");
      baseUrl = `http://127.0.0.1:${address.port}`;

      async function request(path: string, options: RequestInit = {}) {
        return fetch(`${baseUrl}${path}`, options);
      }

      const adminResponse = await request("/api/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "Project Admin", email: adminEmail, password: "secure-password-123", adminBootstrapToken: adminToken }),
      });
      assert.equal(adminResponse.status, 201);
      assert.equal((await adminResponse.json() as { user: { role: string } }).user.role, "admin");
      adminCookie = adminResponse.headers.get("set-cookie")?.split(";")[0] ?? "";
      assert.ok(adminCookie);

      const courseResponse = await request("/api/courses", {
        method: "POST",
        headers: { "content-type": "application/json", cookie: adminCookie },
        body: JSON.stringify({
          title: "Intro to Learning Systems",
          description: "A practical introduction to learning systems and course design.",
          category: "Technology",
          level: "beginner",
          lessons: [{
            title: "Course foundations",
            content: "Start with the basic ideas behind a learning system.",
            videoUrl: "https://www.youtube.com/watch?v=eWRfhZUzrAc",
          }],
        }),
      });
      assert.equal(courseResponse.status, 201);
      const course = (await courseResponse.json() as { course: { _id: string; lessons: Array<{ _id: string; videoUrl?: string }> } }).course;
      courseId = course._id;
      assert.equal(course.lessons[0]?.videoUrl, "https://www.youtube.com/watch?v=eWRfhZUzrAc");

      const learnerResponse = await request("/api/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "Project Learner", email: learnerEmail, password: "another-secure-password-123" }),
      });
      assert.equal(learnerResponse.status, 201);
      assert.equal((await learnerResponse.json() as { user: { role: string } }).user.role, "learner");
      learnerCookie = learnerResponse.headers.get("set-cookie")?.split(";")[0] ?? "";
      assert.ok(learnerCookie);

      const forbiddenPublish = await request("/api/courses", {
        method: "POST",
        headers: { "content-type": "application/json", cookie: learnerCookie },
        body: JSON.stringify({}),
      });
      assert.equal(forbiddenPublish.status, 403);

      const enrollmentResponse = await request(`/api/enrollments/${courseId}`, {
        method: "POST",
        headers: { cookie: learnerCookie },
      });
      assert.equal(enrollmentResponse.status, 201);

      const progressResponse = await request(`/api/enrollments/${courseId}/progress`, {
        method: "PATCH",
        headers: { "content-type": "application/json", cookie: learnerCookie },
        body: JSON.stringify({ lessonId: course.lessons[0]._id, completed: true }),
      });
      assert.equal(progressResponse.status, 200);
      assert.equal((await progressResponse.json() as { progress: number }).progress, 100);

      const myEnrollments = await request("/api/enrollments/me", { headers: { cookie: learnerCookie } });
      assert.equal(myEnrollments.status, 200);
      assert.equal((await myEnrollments.json() as { enrollments: Array<{ progress: number }> }).enrollments[0]?.progress, 100);
    } finally {
      if (adminCookie && baseUrl) await fetch(`${baseUrl}/api/auth/logout`, { method: "POST", headers: { cookie: adminCookie } }).catch(() => undefined);
      if (learnerCookie && baseUrl) await fetch(`${baseUrl}/api/auth/logout`, { method: "POST", headers: { cookie: learnerCookie } }).catch(() => undefined);
      if (server) await new Promise<void>((resolve) => server?.close(() => resolve()));
      if (courseId) await EnrollmentModel.deleteMany({ course: courseId });
      if (courseId) await CourseModel.deleteOne({ _id: courseId });
      await UserModel.deleteMany({ email: { $in: [adminEmail, learnerEmail] } });
      await Promise.allSettled([database.disconnectDatabase(), redis.disconnectRedis()]);
    }
  },
);
