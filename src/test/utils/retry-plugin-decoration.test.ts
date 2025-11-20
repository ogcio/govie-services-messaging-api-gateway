import { describe, expect, it } from "vitest";
import { buildTestServer } from "../build-test-server.js";

describe("Retry Plugin Decoration", () => {
  it("adds retry function to fastify instance", async () => {
    const app = await buildTestServer();
    await app.ready();
    expect(typeof app.retry).toBe("function");
  });

  it("executes a function with transient retry", async () => {
    const app = await buildTestServer();
    await app.ready();
    let attempts = 0;
    const result = await app.retry(
      async () => {
        attempts++;
        if (attempts < 2) {
          const err = new Error("transient") as Error & { code?: string };
          err.code = "ECONNRESET";
          throw err;
        }
        return "ok";
      },
      { maxAttempts: 3 },
    );
    expect(result).toBe("ok");
    expect(attempts).toBe(2);
  });
});
