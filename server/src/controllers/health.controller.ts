import type { Request, Response } from "express";
import { isDatabaseReady } from "../config/database.js";
import { isRedisReady } from "../config/redis.js";

export function getHealth(_request: Request, response: Response): void {
  const dependencies = {
    database: isDatabaseReady() ? "connected" : "disconnected",
    cache: isRedisReady() ? "connected" : "disconnected",
  } as const;
  const isReady = Object.values(dependencies).every((state) => state === "connected");

  response.status(isReady ? 200 : 503).json({
    status: isReady ? "ok" : "degraded",
    service: "personalized-learning-api",
    dependencies,
    timestamp: new Date().toISOString(),
  });
}
