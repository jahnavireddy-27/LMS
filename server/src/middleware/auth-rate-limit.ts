import { createHash } from "node:crypto";
import type { Request, Response, NextFunction } from "express";
import { redisClient } from "../config/redis.js";
import { HttpError } from "./http-error.js";

const windowSeconds = 15 * 60;
const requestLimit = 10;
const incrementWithinWindow = `
  local count = redis.call('INCR', KEYS[1])
  if count == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end
  return count
`;

export function limitAuthAttempts(action: "login" | "register") {
  return async (request: Request, _response: Response, next: NextFunction): Promise<void> => {
    const address = request.ip || request.socket.remoteAddress || "unknown";
    const addressHash = createHash("sha256").update(address).digest("hex");
    const key = `auth-rate:${action}:${addressHash}`;
    const count = Number(await redisClient.eval(incrementWithinWindow, 1, key, windowSeconds));
    if (count > requestLimit) {
      next(new HttpError(429, "Too many attempts. Please wait 15 minutes and try again."));
      return;
    }
    next();
  };
}
