import { randomBytes, timingSafeEqual } from "node:crypto";
import { Router } from "express";
import { env } from "../config/env.js";
import { redisClient } from "../config/redis.js";
import { requireUser, sessionKey, setSessionCookie, clearSessionCookie } from "../middleware/authentication.js";
import { limitAuthAttempts } from "../middleware/auth-rate-limit.js";
import { HttpError } from "../middleware/http-error.js";
import { UserModel, type UserDocument } from "../models/user.model.js";
import { hashPassword, verifyPassword } from "../utils/password.js";
import { isRecord, requiredText, validEmail } from "../utils/validation.js";

export const authRouter = Router();

function publicUser(user: UserDocument) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };
}

function validBootstrapToken(candidate: unknown): boolean {
  if (typeof candidate !== "string" || !env.adminBootstrapToken || !env.adminEmail) return false;
  const expected = Buffer.from(env.adminBootstrapToken);
  const received = Buffer.from(candidate);
  return expected.length === received.length && timingSafeEqual(expected, received);
}

async function createSession(userId: string, response: Parameters<typeof setSessionCookie>[0]): Promise<void> {
  const token = randomBytes(32).toString("hex");
  await redisClient.set(sessionKey(token), userId, "EX", env.sessionTtlSeconds);
  setSessionCookie(response, token, env.sessionTtlSeconds);
}

authRouter.post("/register", limitAuthAttempts("register"), async (request, response) => {
  if (!isRecord(request.body)) throw new HttpError(400, "A JSON request body is required");
  const name = requiredText(request.body.name, "Name", 2, 80);
  const email = validEmail(request.body.email);
  const password = request.body.password;
  if (typeof password !== "string" || password.length < 12 || password.length > 128) {
    throw new HttpError(400, "Password must be between 12 and 128 characters");
  }

  const wantsAdmin = env.adminEmail === email && validBootstrapToken(request.body.adminBootstrapToken);
  const hasAdmin = wantsAdmin ? await UserModel.exists({ role: "admin" }) : null;
  const user = await UserModel.create({
    name,
    email,
    passwordHash: await hashPassword(password),
    role: wantsAdmin && !hasAdmin ? "admin" : "learner",
  });
  await createSession(user.id, response);
  response.status(201).json({ user: publicUser(user) });
});

authRouter.post("/login", limitAuthAttempts("login"), async (request, response) => {
  if (!isRecord(request.body)) throw new HttpError(400, "A JSON request body is required");
  const email = validEmail(request.body.email);
  const password = request.body.password;
  if (typeof password !== "string" || password.length > 128) {
    throw new HttpError(401, "Email or password is incorrect");
  }

  const user = await UserModel.findOne({ email }).select("+passwordHash");
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    throw new HttpError(401, "Email or password is incorrect");
  }

  await createSession(user.id, response);
  response.json({ user: publicUser(user) });
});

authRouter.get("/me", requireUser, (request, response) => {
  if (!request.user) throw new HttpError(401, "Please sign in to continue");
  response.json({ user: publicUser(request.user) });
});

authRouter.post("/logout", async (request, response) => {
  const cookie = request.headers.cookie
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith("lms_session="));
  const token = cookie?.slice("lms_session=".length);
  if (token) await redisClient.del(sessionKey(token));
  clearSessionCookie(response);
  response.status(204).end();
});
