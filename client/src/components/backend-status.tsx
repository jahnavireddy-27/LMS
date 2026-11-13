"use client";

import { useEffect, useState } from "react";

type ConnectionState = "loading" | "online" | "offline";

type HealthResponse = {
  status?: string;
};

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export function BackendStatus() {
  const [state, setState] = useState<ConnectionState>("loading");

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 5000);

    async function checkBackend() {
      try {
        const response = await fetch(`${apiBaseUrl.replace(/\/$/, "")}/api/health`, {
          cache: "no-store",
          signal: controller.signal,
        });

        if (!response.ok) {
          setState("offline");
          return;
        }

        const health = (await response.json()) as HealthResponse;
        setState(health.status === "ok" ? "online" : "offline");
      } catch {
        setState("offline");
      } finally {
        window.clearTimeout(timeout);
      }
    }

    void checkBackend();
    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, []);

  const label = {
    loading: "Checking connection",
    online: "System online",
    offline: "System unavailable",
  }[state];

  return (
    <div className={`connection connection-${state}`} role="status" aria-live="polite">
      <span className="connection-indicator" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}
