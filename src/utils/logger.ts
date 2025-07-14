import { Logtail } from "@logtail/edge";
import { EdgeWithExecutionContext } from "@logtail/edge/dist/es6/edgeWithExecutionContext";
import { Context, ExecutionContext } from "hono";

export function createLogger(env: CloudflareBindings, c: ExecutionContext): EdgeWithExecutionContext {
  return new Logtail(env.LOGTAIL_SOURCE_TOKEN, {
    endpoint: env.LOGTAIL_ENDPOINT,
  }).withExecutionContext(c);
}

export function getLogger(c: Context): EdgeWithExecutionContext {
  const logger = c.get("logger");
  if (!logger) {
    throw new Error("Logger not initialized in context");
  }
  return logger as EdgeWithExecutionContext;
}