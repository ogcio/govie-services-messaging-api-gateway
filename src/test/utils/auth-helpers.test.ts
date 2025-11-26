import type { FastifyReply, FastifyRequest } from "fastify";
import { describe, expect, it, vi } from "vitest";
import { requirePublicServant } from "../../utils/auth-helpers.js";

describe("auth-helpers", () => {
  describe("requirePublicServant", () => {
    it("should return token when present in userData", () => {
      const token = "test-token-123";
      const userData = { accessToken: token, organizationId: "org-456" };
      const request = {
        id: "req-1",
        userData,
      } as FastifyRequest;
      const reply = {
        status: vi.fn().mockReturnThis(),
        send: vi.fn(),
      } as unknown as FastifyReply;

      const result = requirePublicServant(request, reply);

      expect(result).toStrictEqual({
        token: token,
        organizationId: userData.organizationId,
      });
      expect(reply.status).not.toHaveBeenCalled();
      expect(reply.send).not.toHaveBeenCalled();
    });

    it("should send 401 and return null when token is missing", () => {
      const request = {
        id: "req-2",
        userData: undefined,
      } as FastifyRequest;
      const reply = {
        status: vi.fn().mockReturnThis(),
        send: vi.fn(),
      } as unknown as FastifyReply;

      const result = requirePublicServant(request, reply);

      expect(result).toBeNull();
      expect(reply.status).toHaveBeenCalledWith(401);
      expect(reply.send).toHaveBeenCalledWith({
        code: "UNAUTHORIZED",
        detail: "No authorization header found",
        requestId: "req-2",
        name: "UnauthorizedError",
        statusCode: 401,
      });
    });

    it("should send 401 and return null when userData exists but accessToken is missing", () => {
      const request = {
        id: "req-3",
        userData: {},
      } as FastifyRequest;
      const reply = {
        status: vi.fn().mockReturnThis(),
        send: vi.fn(),
      } as unknown as FastifyReply;

      const result = requirePublicServant(request, reply);

      expect(result).toBeNull();
      expect(reply.status).toHaveBeenCalledWith(401);
      expect(reply.send).toHaveBeenCalledWith({
        code: "UNAUTHORIZED",
        detail: "No authorization header found",
        requestId: "req-3",
        name: "UnauthorizedError",
        statusCode: 401,
      });
    });

    it("should send 401 and return null when accessToken is empty string", () => {
      const request = {
        id: "req-4",
        userData: { accessToken: "" },
      } as FastifyRequest;
      const reply = {
        status: vi.fn().mockReturnThis(),
        send: vi.fn(),
      } as unknown as FastifyReply;

      const result = requirePublicServant(request, reply);

      expect(result).toBeNull();
      expect(reply.status).toHaveBeenCalledWith(401);
    });

    it("should send 403 and return null when organizationId is missing", () => {
      const request = {
        id: "req-2",
        userData: { accessToken: "valid-token" },
      } as FastifyRequest;
      const reply = {
        status: vi.fn().mockReturnThis(),
        send: vi.fn(),
      } as unknown as FastifyReply;

      const result = requirePublicServant(request, reply);

      expect(result).toBeNull();
      expect(reply.status).toHaveBeenCalledWith(403);
      expect(reply.send).toHaveBeenCalledWith({
        code: "ORG_MISSING",
        detail: "Organization missing or forbidden",
        requestId: "req-2",
        name: "ForbiddenError",
        statusCode: 403,
      });
    });

    it("should send 403 and return null when organizationId is empty string", () => {
      const request = {
        id: "req-4",
        userData: { accessToken: "valid-token", organizationId: "" },
      } as FastifyRequest;
      const reply = {
        status: vi.fn().mockReturnThis(),
        send: vi.fn(),
      } as unknown as FastifyReply;

      const result = requirePublicServant(request, reply);

      expect(result).toBeNull();
      expect(reply.status).toHaveBeenCalledWith(403);
    });
  });
});
