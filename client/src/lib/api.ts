const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export class ApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body !== undefined) headers.set("Content-Type", "application/json");

  const response = await fetch(`${apiBaseUrl.replace(/\/$/, "")}${path}`, {
    ...init,
    headers,
    credentials: "include",
    cache: "no-store",
  });

  if (response.status === 204) return undefined as T;

  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      typeof payload === "object" &&
      payload !== null &&
      "error" in payload &&
      typeof payload.error === "string"
        ? payload.error
        : `Request failed (${response.status})`;
    throw new ApiError(message, response.status);
  }
  return payload as T;
}

export type User = {
  id: string;
  name: string;
  email: string;
  role: "learner" | "admin";
};

export type CourseLesson = {
  _id: string;
  title: string;
  content: string;
  videoUrl?: string;
};

export type Course = {
  _id: string;
  title: string;
  description: string;
  category: string;
  level: "beginner" | "intermediate" | "advanced";
  lessons: CourseLesson[];
  author: string | { _id: string; name: string };
  enrollmentCount?: number;
};

export type Enrollment = {
  _id: string;
  course: Course;
  completedLessons: string[];
  status: "in_progress" | "completed";
  progress: number;
};

export type Recommendation = {
  course: Course;
  reason: string;
};
