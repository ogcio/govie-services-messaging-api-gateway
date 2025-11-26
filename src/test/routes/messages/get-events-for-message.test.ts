import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify/types/instance.js";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { buildTestServer } from "../../build-test-server.js";

describe("GET /v1/messages/:messageId/events integration", () => {
  let app: FastifyInstance;
  let messagingSdk: { getMessageEvents: ReturnType<typeof vi.fn> };

  beforeAll(async () => {
    app = await buildTestServer();
    app.addHook("onRequest", (req, _reply, done) => {
      req.userData = {
        accessToken: "test-token",
        organizationId: "org-123",
        userId: "user-123",
        isM2MApplication: false,
      };
      done();
    });

    await app.ready();
  });

  beforeEach(() => {
    messagingSdk = {
      getMessageEvents: vi.fn(),
    };
    app.getMessagingSdk = vi.fn().mockReturnValue(messagingSdk);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });

  it("returns event history for valid messageId", async () => {
    const messageId = randomUUID();
    const events = [
      {
        id: randomUUID(),
        messageId,
        subject: "Test subject",
        receiverFullName: "John Doe",
        eventType: "email_sent",
        eventStatus: "sent",
        scheduledAt: "2023-01-01T10:00:00.000Z",
      },
      {
        id: randomUUID(),
        messageId,
        subject: "Test subject",
        receiverFullName: "John Doe",
        eventType: "email_delivered",
        eventStatus: "delivered",
        scheduledAt: "2023-01-01T10:05:00.000Z",
      },
    ];
    messagingSdk.getMessageEvents.mockResolvedValueOnce({
      data: events,
    });
    const res = await app.inject({
      method: "GET",
      url: `/api/v1/messages/${messageId}/events`,
    });
    expect(res.statusCode).toBe(200);
    const payload = res.json();
    expect(Array.isArray(payload.data)).toBe(true);
    expect(payload.data.length).toBe(2);
    expect(payload.data[0].eventType).toBe("email_sent");
    expect(payload.data[1].eventType).toBe("email_delivered");
  });

  it("returns 404 for non-existent messageId", async () => {
    const messageId = randomUUID();
    messagingSdk.getMessageEvents.mockResolvedValueOnce({
      data: [],
    });
    const res = await app.inject({
      method: "GET",
      url: `/api/v1/messages/${messageId}/events`,
    });
    expect(res.statusCode).toBe(404);
    const payload = res.json();
    expect(payload.code).toBe("NOT_FOUND");
  });

  it("returns 401 if no token", async () => {
    const noTokenApp = await buildTestServer({ setToken: false });
    try {
      const messagingSdkNoToken = {
        getMessageEvents: vi.fn(),
      };
      noTokenApp.getMessagingSdk = vi.fn().mockReturnValue(messagingSdkNoToken);
      await noTokenApp.ready();
      const messageId = randomUUID();
      // Remove userData for this request
      const res = await noTokenApp.inject({
        method: "GET",
        url: `/api/v1/messages/${messageId}/events`,
        headers: {},
      });

      expect(res.statusCode).toBe(401);
      const payload = res.json();
      expect(payload.code).toBe("UNAUTHORIZED");
    } finally {
      await noTokenApp.close();
    }
  });

  it("returns 401 if org missing or forbidden", async () => {
    const noOrgApp = await buildTestServer({ organizationId: undefined });
    noOrgApp.getMessagingSdk = vi.fn().mockReturnValue(messagingSdk);
    try {
      await noOrgApp.ready();

      const messageId = randomUUID();
      messagingSdk.getMessageEvents.mockRejectedValueOnce({ statusCode: 403 });
      const res = await noOrgApp.inject({
        method: "GET",
        url: `/api/v1/messages/${messageId}/events`,
      });

      expect(res.statusCode).toBe(403);
      const payload = res.json();
      expect(payload.code).toBe("ORG_MISSING");
    } finally {
      await noOrgApp.close();
    }
  });
});
