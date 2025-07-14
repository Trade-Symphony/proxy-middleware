import { Logtail } from "@logtail/edge";
import { Context } from "hono";

export function createLogger(env: CloudflareBindings) {
  return new Logtail(env.LOGTAIL_SOURCE_TOKEN, {
    endpoint: env.LOGTAIL_ENDPOINT,
  });
}

export function getLogger(c: Context): Logtail {
  const logger = c.get("logger");
  if (!logger) {
    throw new Error("Logger not initialized in context");
  }
  return logger as Logtail;
}