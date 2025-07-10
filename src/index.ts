import { Hono } from "hono";

const app = new Hono<{ Bindings: CloudflareBindings }>();

app.get("/health", (c) => {
  const now = Date.now();
  return c.json({
    status: "OK",
    timestamp: new Date(now).toISOString(),
  }, 200);
});

export default app;
