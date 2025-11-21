import type { FastifyInstance, FastifyRequest } from "fastify";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { buildTestServer } from "../../build-test-server.js";

function fakeUuid(label: string) {
  return `${label}-xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx`.replace(
    /[xy]/g,
    (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    },
  );
}

describe("GET /v1/messages/events integration", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildTestServer();

    app.addHook("onRequest", (req: FastifyRequest, _reply, done) => {
      (req as unknown as { userData: unknown }).userData = {
        accessToken: "test-token",
        organizationId: "org-123",
        userId: "user-123",
        isM2MApplication: false,
      };
      done();
    });

    const messagingSdk = {
      getMessageEvents: vi.fn().mockResolvedValue({
        data: [
          {
            id: fakeUuid("event"),
            messageId: fakeUuid("message"),
            subject: "Test subject one",
            receiverFullName: "John Doe",
            eventType: "email_sent",
            eventStatus: "sent",
            scheduledAt: new Date().toISOString(),
          },
          {
            id: fakeUuid("event"),
            messageId: fakeUuid("message"),
            subject: "Test subject two",
            receiverFullName: "Jane Smith",
            eventType: "email_delivered",
            eventStatus: "delivered",
            scheduledAt: new Date(Date.now() - 1000).toISOString(),
          },
        ],
        metadata: {
          totalCount: 2,
        },
      }),
    };

    app.getMessagingSdk = vi
      .fn()
      .mockReturnValue(
        messagingSdk as { getMessageEvents: (p: unknown) => Promise<unknown> },
      );

    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("returns 200 with events and pagination metadata (no filters)", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/messages/v1/messages/events?limit=10&offset=0",
    });

    expect(res.statusCode).toBe(200);
    const payload = res.json();
    expect(Array.isArray(payload.data)).toBe(true);
    expect(payload.data.length).toBe(2);
    expect(payload.metadata.totalCount).toBe(2);
    expect(payload.metadata.links.first.href).toContain("/v1/messages/events");
    expect(payload.metadata.links.self.href).toContain("limit=10");
    expect(payload.metadata.links.self.href).toContain("offset=0");
  });
});
