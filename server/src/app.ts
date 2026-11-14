import cors from "cors";
import express from "express";
import helmet from "helmet";
import { env } from "./config/env.js";
import { authRouter } from "./routes/auth.routes.js";
import { adminRouter } from "./routes/admin.routes.js";
import { coursesRouter } from "./routes/courses.routes.js";
import { enrollmentsRouter } from "./routes/enrollments.routes.js";
import { healthRouter } from "./routes/health.routes.js";
import { recommendationsRouter } from "./routes/recommendations.routes.js";
import { errorHandler } from "./middleware/error-handler.js";

export const app = express();

app.disable("x-powered-by");
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      "frame-src": ["'self'", "https://www.youtube-nocookie.com"],
    },
  },
}));
app.use(cors({ origin: env.clientOrigin, credentials: true }));
app.use(express.json({ limit: "1mb" }));

app.use("/api/health", healthRouter);
app.use("/api/auth", authRouter);
app.use("/api/admin", adminRouter);
app.use("/api/courses", coursesRouter);
app.use("/api/enrollments", enrollmentsRouter);
app.use("/api/recommendations", recommendationsRouter);

app.use((_request, response) => {
  response.status(404).json({ error: "Not found" });
});

app.use(errorHandler);
