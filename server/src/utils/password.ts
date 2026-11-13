import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

function deriveKey(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, 64, (error, key) => {
      if (error) reject(error);
      else resolve(key);
    });
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const key = await deriveKey(password, salt);
  return `${salt}:${key.toString("hex")}`;
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const [salt, keyHex] = storedHash.split(":");
  if (!salt || !keyHex || !/^[a-f0-9]{128}$/i.test(keyHex)) return false;
  const storedKey = Buffer.from(keyHex, "hex");
  const candidateKey = await deriveKey(password, salt);
  return storedKey.length === candidateKey.length && timingSafeEqual(storedKey, candidateKey);
}
