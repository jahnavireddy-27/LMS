import assert from "node:assert/strict";
import test from "node:test";
import { HttpError } from "../src/middleware/http-error.js";
import { requiredText, validEmail } from "../src/utils/validation.js";

test("requiredText trims accepted values and rejects invalid lengths", () => {
  assert.equal(requiredText("  Learning  ", "Title", 2, 20), "Learning");
  assert.throws(() => requiredText("x", "Title", 2, 20), HttpError);
  assert.throws(() => requiredText(4, "Title", 2, 20), HttpError);
});

test("validEmail normalizes address case and rejects malformed addresses", () => {
  assert.equal(validEmail("  LEARNER@example.com "), "learner@example.com");
  assert.throws(() => validEmail("not-an-email"), HttpError);
});
