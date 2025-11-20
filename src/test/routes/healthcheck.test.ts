import type { FastifyInstance } from "fastify";
import { afterEach, assert, describe, expect, test } from "vitest";
import { buildTestServer } from "../build-test-server.js";

describe("Healthcheck works as expected", () => {
  let app: FastifyInstance | undefined;

  afterEach(() => {
    if (app) {
      app.close();
    }
  });

  test("GET /health returns 200", async () => {
    const appInstance = await buildTestServer();
    const res = await appInstance.inject({ method: "GET", url: "/health" });
    assert.deepStrictEqual(200, res.statusCode);
  });

  test("logs contain correlationId and organizationId fields (T034)", async () => {
    const appInstance = await buildTestServer();
    const captured: Array<{ obj: unknown; msg?: string }> = [];
    const originalInfo = appInstance.log.info.bind(appInstance.log);
    appInstance.log.info = ((obj: unknown, msg?: string) => {
      captured.push({ obj, msg });
      // Preserve original signature without using any
      return originalInfo(
        obj as Record<string, unknown>,
        msg as string | undefined,
      );
    }) as typeof appInstance.log.info;

    await appInstance.inject({
      method: "GET",
      url: "/health",
      headers: {
        "x-correlation-id": "test-corr-id",
        "x-organization-id": "test-org-id",
      },
    });

    appInstance.log.info = originalInfo;
    const serialized = JSON.stringify(captured);
    expect(serialized).toContain("test-corr-id");
    expect(serialized).toContain("test-org-id");
  });
});
