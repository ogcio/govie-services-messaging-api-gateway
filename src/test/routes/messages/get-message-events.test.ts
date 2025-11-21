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
  it("returns correct pagination links for multi-page results", async () => {
    // Simulate 25 events, page size 10, offset 10 (page 2)
    const events = Array.from({ length: 10 }, (_, i) => ({
      id: fakeUuid(`event${i}`),
      messageId: fakeUuid(`message${i}`),
      subject: `Paginated event ${i + 11}`,
      receiverFullName: `User ${i + 11}`,
      eventType: "email_sent",
      eventStatus: "sent",
      scheduledAt: new Date().toISOString(),
    }));
    (
      app.getMessagingSdk("test-token") as unknown as typeof messagingSdk
    ).getMessageEvents.mockResolvedValueOnce({
      data: events,
      metadata: { totalCount: 25 },
    });
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/messages/events?limit=10&offset=10",
    });
    expect(res.statusCode).toBe(200);
    const payload = res.json();
    expect(payload.data.length).toBe(10);
    // Check pagination links
    const links = payload.metadata.links;
    expect(links.first.href).toContain("limit=10");
    expect(links.first.href).toContain("offset=0");
    expect(links.self.href).toContain("limit=10");
    expect(links.self.href).toContain("offset=10");
    expect(links.next.href).toContain("offset=20");
    expect(links.prev.href).toContain("offset=0");
    expect(links.last.href).toContain("offset=20");
    expect(payload.metadata.totalCount).toBe(25);
    // No rel property assertions: links only have href
  });
  let app: FastifyInstance;
  let messagingSdk: { getMessageEvents: ReturnType<typeof vi.fn> };

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

    messagingSdk = {
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
      url: "/api/v1/messages/events?limit=10&offset=0",
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

  it("filters events by recipientId", async () => {
    // Patch SDK to return only events matching recipientId
    const recipientId = "recipient-123";
    const matchingEvent = {
      id: fakeUuid("event"),
      messageId: fakeUuid("message"),
      subject: "Subject for recipientId",
      receiverFullName: "Alice Example",
      eventType: "email_sent",
      eventStatus: "sent",
      scheduledAt: new Date().toISOString(),
    };
    (
      app.getMessagingSdk("test-token") as unknown as typeof messagingSdk
    ).getMessageEvents.mockResolvedValueOnce({
      data: [matchingEvent],
      metadata: { totalCount: 1 },
    });
    const res = await app.inject({
      method: "GET",
      url: `/api/v1/messages/events?limit=10&offset=0&recipientId=${recipientId}`,
    });
    expect(res.statusCode).toBe(200);
    const payload = res.json();
    expect(payload.data.length).toBe(1);
    expect(payload.data[0].receiverFullName).toBe("Alice Example");
  });

  it("filters events by subjectContains", async () => {
    const subject = "Special Subject";
    const matchingEvent = {
      id: fakeUuid("event"),
      messageId: fakeUuid("message"),
      subject,
      receiverFullName: "Bob Example",
      eventType: "email_sent",
      eventStatus: "sent",
      scheduledAt: new Date().toISOString(),
    };
    (
      app.getMessagingSdk("test-token") as unknown as typeof messagingSdk
    ).getMessageEvents.mockResolvedValueOnce({
      data: [matchingEvent],
      metadata: { totalCount: 1 },
    });
    const res = await app.inject({
      method: "GET",
      url: `/api/v1/messages/events?limit=10&offset=0&subjectContains=Special`,
    });
    expect(res.statusCode).toBe(200);
    const payload = res.json();
    expect(payload.data.length).toBe(1);
    expect(payload.data[0].subject).toContain("Special");
  });

  it("filters events by dateFrom and dateTo", async () => {
    const now = new Date();
    const earlier = new Date(now.getTime() - 1000 * 60 * 60).toISOString();
    const later = new Date(now.getTime() + 1000 * 60 * 60).toISOString();
    const matchingEvent = {
      id: fakeUuid("event"),
      messageId: fakeUuid("message"),
      subject: "Date range event",
      receiverFullName: "Carol Example",
      eventType: "email_sent",
      eventStatus: "sent",
      scheduledAt: now.toISOString(),
    };
    (
      app.getMessagingSdk("test-token") as unknown as typeof messagingSdk
    ).getMessageEvents.mockResolvedValueOnce({
      data: [matchingEvent],
      metadata: { totalCount: 1 },
    });
    const res = await app.inject({
      method: "GET",
      url: `/api/v1/messages/events?limit=10&offset=0&dateFrom=${earlier}&dateTo=${later}`,
    });
    expect(res.statusCode).toBe(200);
    const payload = res.json();
    expect(payload.data.length).toBe(1);
    expect(payload.data[0].subject).toBe("Date range event");
  });

  it("filters events by recipientEmail", async () => {
    const recipientEmail = "test@example.com";
    const matchingEvent = {
      id: fakeUuid("event"),
      messageId: fakeUuid("message"),
      subject: "Email filter event",
      receiverFullName: "Dana Example",
      eventType: "email_sent",
      eventStatus: "sent",
      scheduledAt: new Date().toISOString(),
    };
    (
      app.getMessagingSdk("test-token") as unknown as typeof messagingSdk
    ).getMessageEvents.mockResolvedValueOnce({
      data: [matchingEvent],
      metadata: { totalCount: 1 },
    });
    const res = await app.inject({
      method: "GET",
      url: `/api/v1/messages/events?limit=10&offset=0&recipientEmail=${recipientEmail}`,
    });
    expect(res.statusCode).toBe(200);
    const payload = res.json();
    expect(payload.data.length).toBe(1);
    expect(payload.data[0].receiverFullName).toBe("Dana Example");
  });
});
