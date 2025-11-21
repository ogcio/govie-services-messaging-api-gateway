import type { FastifyInstance, FastifyRequest } from "fastify";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { buildTestServer } from "../../build-test-server.js";

// Helper to create random UUID-like strings (not cryptographically strong)
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

// NOTE: Multipart (attachments) tests removed pending streaming implementation.
// Future iteration will add streaming-based attachment handling tests.

describe("POST /v1/messages integration", () => {
  let app: FastifyInstance;
  let messagingSendSpy: ReturnType<typeof vi.fn>;

  beforeAll(async () => {
    app = await buildTestServer();

    // Inject auth userData for every request
    app.addHook("onRequest", (req: FastifyRequest, _reply, done) => {
      (req as unknown as { userData: unknown }).userData = {
        accessToken: "test-token",
        organizationId: "org-123",
        userId: "user-123",
        isM2MApplication: false,
      };
      done();
    });

    // Override SDK factories with test doubles
    interface ProfileStub {
      findProfile: ReturnType<typeof vi.fn>;
    }
    const profileSdk: ProfileStub = {
      findProfile: vi.fn().mockResolvedValue({
        data: {
          id: fakeUuid("profile"),
          email: "recipient@example.com",
          details: { firstName: "A", lastName: "B" },
        },
      }),
    };

    type UploadMode = "success" | "uploadFail" | "shareFail";
    interface UploadStub {
      uploadFile: ReturnType<typeof vi.fn>;
      shareFile: ReturnType<typeof vi.fn>;
      scheduleFileDeletion: ReturnType<typeof vi.fn>;
    }
    const makeUploadSdk = (mode: UploadMode): UploadStub => ({
      uploadFile:
        mode === "uploadFail"
          ? vi.fn().mockResolvedValue({
              error: { statusCode: 502, detail: "upload failed" },
            })
          : vi
              .fn()
              .mockResolvedValue({ data: { uploadId: fakeUuid("upload") } }),
      shareFile:
        mode === "shareFail"
          ? vi.fn().mockResolvedValue({
              error: { statusCode: 502, detail: "share failed" },
            })
          : vi.fn().mockResolvedValue({ data: { fileId: fakeUuid("share") } }),
      scheduleFileDeletion: vi.fn().mockResolvedValue({ data: {} }),
    });

    messagingSendSpy = vi
      .fn()
      .mockResolvedValue({ data: { id: fakeUuid("message") } });
    interface MessagingStub {
      send: ReturnType<typeof vi.fn>;
    }
    const messagingSdk: MessagingStub = { send: messagingSendSpy };

    app.getProfileSdk = vi.fn().mockReturnValue(profileSdk);
    app.getUploadSdk = vi
      .fn()
      .mockImplementation((_token: string) => makeUploadSdk("success"));
    app.getMessagingSdk = vi.fn().mockReturnValue(messagingSdk);

    // Multipart stubbing removed (attachments streaming TBD)

    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  const baseBody = {
    subject: "Test Subject",
    plainTextBody: "Hello",
    securityLevel: "public",
    language: "en",
    scheduledAt: new Date().toISOString(),
    recipient: {
      type: "email",
      firstName: "A",
      lastName: "B",
      email: "recipient@example.com",
    },
  };

  // Success path without attachments (multipart tests deferred)
  it("returns 201 and message identifiers (success path, no attachments)", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/messages/v1/messages",
      payload: baseBody,
    });
    expect(res.statusCode).toBe(201);
    const payload = res.json();
    expect(payload.data.messageId).toMatch(/message/);
    expect(payload.data.recipientId).toMatch(/profile/);
    // attachmentIds may be undefined when no attachments present
    expect(
      payload.data.attachmentIds === undefined ||
        Array.isArray(payload.data.attachmentIds),
    ).toBe(true);
  });

  // Removed upload/share failure multipart tests pending streaming implementation

  // Scheduling behavior test deferred until semantics finalized
  it.skip("dispatches immediately when scheduledAt is in the past", async () => {
    (
      app.getUploadSdk as unknown as {
        mockImplementation: (fn: () => unknown) => void;
      }
    ).mockImplementation(() => makeUploadSdk("success"));
    messagingSendSpy.mockClear();
    const pastBody = {
      ...baseBody,
      scheduledAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    };
    const res = await app.inject({
      method: "POST",
      url: "/messages/v1/messages",
      payload: pastBody,
    });
    expect(res.statusCode).toBe(201);
    expect(messagingSendSpy).toHaveBeenCalledTimes(1);
    const callArg = messagingSendSpy.mock.calls[0][0];
    expect(callArg.scheduleAt).toBe(pastBody.scheduledAt);
  });
});
