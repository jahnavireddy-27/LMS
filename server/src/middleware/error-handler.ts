import type { ErrorRequestHandler } from "express";
import mongoose from "mongoose";
import { HttpError } from "./http-error.js";

export const errorHandler: ErrorRequestHandler = (error: unknown, _request, response, _next) => {
  if (error instanceof HttpError) {
    response.status(error.statusCode).json({ error: error.message });
    return;
  }

  if (error instanceof mongoose.Error.ValidationError || error instanceof mongoose.Error.CastError) {
    response.status(400).json({ error: "The submitted data is invalid" });
    return;
  }

  if (typeof error === "object" && error !== null && "code" in error && error.code === 11000) {
    response.status(409).json({ error: "A record with that value already exists" });
    return;
  }

  if (typeof error === "object" && error !== null && "type" in error && error.type === "entity.too.large") {
    response.status(413).json({ error: "Request body is too large" });
    return;
  }

  console.error("Unhandled API error:", error);
  response.status(500).json({ error: "An unexpected server error occurred" });
};
