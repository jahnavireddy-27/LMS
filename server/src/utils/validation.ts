import { HttpError } from "../middleware/http-error.js";

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function requiredText(value: unknown, name: string, minLength: number, maxLength: number): string {
  if (typeof value !== "string") throw new HttpError(400, `${name} is required`);
  const text = value.trim();
  if (text.length < minLength || text.length > maxLength) {
    throw new HttpError(400, `${name} must be between ${minLength} and ${maxLength} characters`);
  }
  return text;
}

export function validEmail(value: unknown): string {
  const email = requiredText(value, "Email", 3, 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, "Enter a valid email address");
  return email;
}
