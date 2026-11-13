import { createHash } from "node:crypto";
import type { Request, Response, NextFunction } from "express";
import { redisClient } from "../config/redis.js";
import { UserModel, type UserDocument } from "../models/user.model.js";
import { HttpError } from "./http-error.js";

const sessionCookieName = "lms_session";

function sessionTokenFrom(request: Request): string | undefined {
  const cookieHeader = request.headers.cookie;
  if (!cookieHeader) return undefined;
  const cookie = cookieHeader.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${sessionCookieName}=`));
  return cookie?.slice(sessionCookieName.length + 1);
}

export function sessionKey(token: string): string {
  return `session:${createHash("sha256").update(token).digest("hex")}`;
}

export function setSessionCookie(response: Response, token: string, ttlSeconds: number): void {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  response.append(
    "Set-Cookie",
    `${sessionCookieName}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${ttlSeconds}${secure}`,
  );
}

export function clearSessionCookie(response: Response): void {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  response.append("Set-Cookie", `${sessionCookieName}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${secure}`);
}

export async function requireUser(request: Request, _response: Response, next: NextFunction): Promise<void> {
  const token = sessionTokenFrom(request);
  if (!token) throw new HttpError(401, "Please sign in to continue");

  const userId = await redisClient.get(sessionKey(token));
  if (!userId) throw new HttpError(401, "Your session has expired. Please sign in again");

  const user = await UserModel.findById(userId);
  if (!user) {
    await redisClient.del(sessionKey(token));
    throw new HttpError(401, "Your session is no longer valid. Please sign in again");
  }

  request.user = user;
  next();
}

export function requireAdmin(request: Request, _response: Response, next: NextFunction): void {
  if (request.user?.role !== "admin") {
    next(new HttpError(403, "Administrator access is required"));
    return;
  }
  next();
}

declare global {
  namespace Express {
    interface Request {
      user?: UserDocument;
    }
  }
}
