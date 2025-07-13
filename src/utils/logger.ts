import { Logtail } from "@logtail/edge";

export function createLogger(env: CloudflareBindings) {
  return new Logtail(env.LOGTAIL_SOURCE_TOKEN, {
    endpoint: env.LOGTAIL_ENDPOINT,
  });
}