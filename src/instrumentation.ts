import { type SDKLogLevel, instrumentNode } from "@ogcio/o11y-sdk-node";

if (
  process.env.OTEL_COLLECTOR_URL &&
  process.env.OTEL_COLLECTOR_URL.length > 0
) {
  await instrumentNode({
    serviceName: process.env.OTEL_SERVICE_NAME,
    collectorUrl: process.env.OTEL_COLLECTOR_URL as string,
    collectorMode: "batch",
    diagLogLevel: (process.env.OTEL_LOG_LEVEL as SDKLogLevel) ?? "ERROR",
    ignoreUrls: [{ type: "equals", url: "/health" }],
  });
}
