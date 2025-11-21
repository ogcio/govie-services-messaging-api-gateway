import type { FastifyReply } from "fastify";
import { describe, expect, it, vi } from "vitest";
import {
  isForbiddenError,
  sendForbidden,
  sendNotFound,
  sendUnauthorized,
} from "../../utils/error-responses.js";

describe("error-responses", () => {
  describe("sendUnauthorized", () => {
    it("should send 401 with default message", () => {
      const reply = {
        status: vi.fn().mockReturnThis(),
        send: vi.fn(),
      } as unknown as FastifyReply;

      sendUnauthorized(reply, "req-1");

      expect(reply.status).toHaveBeenCalledWith(401);
      expect(reply.send).toHaveBeenCalledWith({
        code: "UNAUTHORIZED",
        detail: "No authorization header found",
        requestId: "req-1",
        name: "UnauthorizedError",
        statusCode: 401,
      });
    });

    it("should send 401 with custom message", () => {
      const reply = {
        status: vi.fn().mockReturnThis(),
        send: vi.fn(),
      } as unknown as FastifyReply;

      sendUnauthorized(reply, "req-2", "Custom auth error");

      expect(reply.status).toHaveBeenCalledWith(401);
      expect(reply.send).toHaveBeenCalledWith({
        code: "UNAUTHORIZED",
        detail: "Custom auth error",
        requestId: "req-2",
        name: "UnauthorizedError",
        statusCode: 401,
      });
    });
  });

  describe("sendForbidden", () => {
    it("should send 403 with default message", () => {
      const reply = {
        status: vi.fn().mockReturnThis(),
        send: vi.fn(),
      } as unknown as FastifyReply;

      sendForbidden(reply, "req-3");

      expect(reply.status).toHaveBeenCalledWith(403);
      expect(reply.send).toHaveBeenCalledWith({
        code: "ORG_MISSING",
        detail: "Organization missing or forbidden",
        requestId: "req-3",
        name: "ForbiddenError",
        statusCode: 403,
      });
    });

    it("should send 403 with custom message", () => {
      const reply = {
        status: vi.fn().mockReturnThis(),
        send: vi.fn(),
      } as unknown as FastifyReply;

      sendForbidden(reply, "req-4", "Custom forbidden error");

      expect(reply.status).toHaveBeenCalledWith(403);
      expect(reply.send).toHaveBeenCalledWith({
        code: "ORG_MISSING",
        detail: "Custom forbidden error",
        requestId: "req-4",
        name: "ForbiddenError",
        statusCode: 403,
      });
    });
  });

  describe("sendNotFound", () => {
    it("should send 404 with provided message", () => {
      const reply = {
        status: vi.fn().mockReturnThis(),
        send: vi.fn(),
      } as unknown as FastifyReply;

      sendNotFound(reply, "req-5", "Resource not found");

      expect(reply.status).toHaveBeenCalledWith(404);
      expect(reply.send).toHaveBeenCalledWith({
        code: "NOT_FOUND",
        detail: "Resource not found",
        requestId: "req-5",
        name: "NotFoundError",
        statusCode: 404,
      });
    });
  });

  describe("isForbiddenError", () => {
    it("should return true for statusCode 403", () => {
      const error = { statusCode: 403 };
      expect(isForbiddenError(error)).toBe(true);
    });

    it("should return true for code ORG_MISSING", () => {
      const error = { code: "ORG_MISSING" };
      expect(isForbiddenError(error)).toBe(true);
    });

    it("should return true for both statusCode 403 and code ORG_MISSING", () => {
      const error = { statusCode: 403, code: "ORG_MISSING" };
      expect(isForbiddenError(error)).toBe(true);
    });

    it("should return false for non-forbidden statusCode", () => {
      const error = { statusCode: 404 };
      expect(isForbiddenError(error)).toBe(false);
    });

    it("should return false for non-forbidden code", () => {
      const error = { code: "NOT_FOUND" };
      expect(isForbiddenError(error)).toBe(false);
    });

    it("should return false for null", () => {
      expect(isForbiddenError(null)).toBe(false);
    });

    it("should return false for non-object", () => {
      expect(isForbiddenError("error")).toBe(false);
      expect(isForbiddenError(123)).toBe(false);
      expect(isForbiddenError(undefined)).toBe(false);
    });

    it("should return false for empty object", () => {
      expect(isForbiddenError({})).toBe(false);
    });
  });
});
