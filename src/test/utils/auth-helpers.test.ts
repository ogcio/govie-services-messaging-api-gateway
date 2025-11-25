import type { FastifyReply, FastifyRequest } from "fastify";
import { describe, expect, it, vi } from "vitest";
import { requireAuthToken } from "../../utils/auth-helpers.js";

describe("auth-helpers", () => {
  describe("requireAuthToken", () => {
    it("should return token when present in userData", () => {
      const token = "test-token-123";
      const request = {
        id: "req-1",
        userData: { accessToken: token },
      } as FastifyRequest;
      const reply = {
        status: vi.fn().mockReturnThis(),
        send: vi.fn(),
      } as unknown as FastifyReply;

      const result = requireAuthToken(request, reply);

      expect(result).toBe(token);
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

      const result = requireAuthToken(request, reply);

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

      const result = requireAuthToken(request, reply);

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

      const result = requireAuthToken(request, reply);

      expect(result).toBeNull();
      expect(reply.status).toHaveBeenCalledWith(401);
    });
  });
});
