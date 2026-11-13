import assert from "node:assert/strict";
import test from "node:test";
import { hashPassword, verifyPassword } from "../src/utils/password.js";

test("password hashes are salted and verify only the original password", async () => {
  const firstHash = await hashPassword("correct horse battery staple");
  const secondHash = await hashPassword("correct horse battery staple");

  assert.notEqual(firstHash, secondHash);
  assert.equal(await verifyPassword("correct horse battery staple", firstHash), true);
  assert.equal(await verifyPassword("incorrect password", firstHash), false);
  assert.equal(await verifyPassword("anything", "not-a-valid-hash"), false);
});
