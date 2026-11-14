import { Redis } from "ioredis";
import { env } from "./env.js";

export const redisClient = new Redis(env.redisUrl, {
  lazyConnect: true,
  maxRetriesPerRequest: 1,
  retryStrategy: (attempt: number) => Math.min(attempt * 250, 2000),
});

export async function connectRedis(): Promise<void> {
  await redisClient.connect();
}

export async function disconnectRedis(): Promise<void> {
  if (redisClient.status !== "end") {
    await redisClient.quit();
  }
}

export function isRedisReady(): boolean {
  return redisClient.status === "ready";
}
