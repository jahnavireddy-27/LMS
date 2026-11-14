import "dotenv/config";

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function portFromEnvironment(): number {
  const rawPort = process.env.PORT ?? "4000";
  const port = Number(rawPort);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("PORT must be an integer between 1 and 65535");
  }
  return port;
}

const nodeEnv = process.env.NODE_ENV ?? "development";
if (!["development", "production", "test"].includes(nodeEnv)) {
  throw new Error("NODE_ENV must be development, production, or test");
}

export const env = {
  nodeEnv,
  port: portFromEnvironment(),
  clientOrigin: process.env.CLIENT_ORIGIN ?? "http://localhost:3000",
  adminEmail: process.env.ADMIN_EMAIL?.trim().toLowerCase() || undefined,
  adminBootstrapToken: process.env.ADMIN_BOOTSTRAP_TOKEN || undefined,
  sessionTtlSeconds: 60 * 60 * 24 * 7,
  mongoUri: required("MONGODB_URI"),
  redisUrl: required("REDIS_URL"),
} as const;
