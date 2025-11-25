import { describe, expect, it, vi } from "vitest";
import {
  executeWithRetry,
  isRetryableError,
  type RetryableError,
  TRANSIENT_STATUS_CODES,
} from "../../utils/retry.js";

describe("retry utility", () => {
  describe("isRetryableError", () => {
    it("should identify 502 as retryable", () => {
      const error: RetryableError = new Error("Bad Gateway");
      error.statusCode = 502;
      expect(isRetryableError(error)).toBe(true);
    });

    it("should identify 503 as retryable", () => {
      const error: RetryableError = new Error("Service Unavailable");
      error.statusCode = 503;
      expect(isRetryableError(error)).toBe(true);
    });

    it("should identify 504 as retryable", () => {
      const error: RetryableError = new Error("Gateway Timeout");
      error.statusCode = 504;
      expect(isRetryableError(error)).toBe(true);
    });

    it("should identify ETIMEDOUT as retryable", () => {
      const error: RetryableError = new Error("Timeout");
      error.code = "ETIMEDOUT";
      expect(isRetryableError(error)).toBe(true);
    });

    it("should identify ECONNRESET as retryable", () => {
      const error: RetryableError = new Error("Connection reset");
      error.code = "ECONNRESET";
      expect(isRetryableError(error)).toBe(true);
    });

    it("should NOT retry 400 errors", () => {
      const error: RetryableError = new Error("Bad Request");
      error.statusCode = 400;
      expect(isRetryableError(error)).toBe(false);
    });

    it("should NOT retry 401 errors", () => {
      const error: RetryableError = new Error("Unauthorized");
      error.statusCode = 401;
      expect(isRetryableError(error)).toBe(false);
    });

    it("should NOT retry 403 errors", () => {
      const error: RetryableError = new Error("Forbidden");
      error.statusCode = 403;
      expect(isRetryableError(error)).toBe(false);
    });

    it("should NOT retry 404 errors", () => {
      const error: RetryableError = new Error("Not Found");
      error.statusCode = 404;
      expect(isRetryableError(error)).toBe(false);
    });

    it("should NOT retry 500 errors", () => {
      const error: RetryableError = new Error("Internal Server Error");
      error.statusCode = 500;
      expect(isRetryableError(error)).toBe(false);
    });
  });

  describe("executeWithRetry", () => {
    it("should succeed on first attempt", async () => {
      const fn = vi.fn().mockResolvedValue("success");
      const result = await executeWithRetry(fn);
      expect(result).toBe("success");
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it("should retry transient 503 error and eventually succeed", async () => {
      const error: RetryableError = new Error("Service Unavailable");
      error.statusCode = 503;

      const fn = vi
        .fn()
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce("success");

      const result = await executeWithRetry(fn);
      expect(result).toBe("success");
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it("should NOT retry 401 error", async () => {
      const error: RetryableError = new Error("Unauthorized");
      error.statusCode = 401;

      const fn = vi.fn().mockRejectedValue(error);

      await expect(executeWithRetry(fn)).rejects.toThrow("Unauthorized");
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it("should exhaust retries after 3 attempts for persistent 503", async () => {
      const error: RetryableError = new Error("Service Unavailable");
      error.statusCode = 503;

      const fn = vi.fn().mockRejectedValue(error);

      await expect(executeWithRetry(fn)).rejects.toThrow("Service Unavailable");
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it("should call onRetry callback with attempt number and delay", async () => {
      const error: RetryableError = new Error("Service Unavailable");
      error.statusCode = 503;

      const fn = vi
        .fn()
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce("success");

      const onRetry = vi.fn();

      await executeWithRetry(fn, { onRetry });

      expect(onRetry).toHaveBeenCalledTimes(1);
      expect(onRetry).toHaveBeenCalledWith(
        1, // attempt number
        expect.any(Number), // delay
        error,
      );
    });

    it("should apply delays with jitter", async () => {
      const error: RetryableError = new Error("Service Unavailable");
      error.statusCode = 503;

      const fn = vi.fn().mockRejectedValue(error);
      const delays: number[] = [];

      await expect(
        executeWithRetry(fn, {
          onRetry: (_attempt: number, delayMs: number) => delays.push(delayMs),
        }),
      ).rejects.toThrow();

      // Should have 2 delays (for retry 1 and 2)
      expect(delays).toHaveLength(2);

      // Delays should be within jitter bounds
      // First delay: nominal 100ms, range [50, 150]
      expect(delays[0]).toBeGreaterThanOrEqual(50);
      expect(delays[0]).toBeLessThanOrEqual(150);

      // Second delay: nominal 200ms, range [100, 300]
      expect(delays[1]).toBeGreaterThanOrEqual(100);
      expect(delays[1]).toBeLessThanOrEqual(300);
    });
  });

  describe("TRANSIENT_STATUS_CODES", () => {
    it("should export correct transient status codes", () => {
      expect(TRANSIENT_STATUS_CODES).toEqual([502, 503, 504]);
    });
  });
});
