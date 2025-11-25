import type { MultipartFile } from "@fastify/multipart";
import type { Upload } from "@ogcio/building-blocks-sdk/dist/types/index.js";
import type { FastifyBaseLogger } from "fastify";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanupFiles,
  shareFile,
  uploadFile,
} from "../../services/upload-service.js";

describe("upload-service", () => {
  let mockLogger: FastifyBaseLogger;
  let mockUploadSdk: Upload;

  beforeEach(() => {
    mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
      fatal: vi.fn(),
      trace: vi.fn(),
      child: vi.fn().mockReturnThis(),
    } as unknown as FastifyBaseLogger;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("cleanupFiles", () => {
    // T058: cleanup deletion success path
    it("returns success stats when all files deleted successfully", async () => {
      mockUploadSdk = {
        scheduleFileDeletion: vi.fn().mockResolvedValue({ data: {} }),
      } as unknown as Upload;

      const uploadIds = ["upload-1", "upload-2", "upload-3"];
      const result = await cleanupFiles(mockUploadSdk, mockLogger, uploadIds);

      expect(result).toEqual({
        deletedCount: 3,
        attemptedCount: 3,
        successRate: 1.0,
      });
      expect(mockUploadSdk.scheduleFileDeletion).toHaveBeenCalledTimes(3);
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          deleted: 3,
          attempted: 3,
          successRate: "100.0%",
          uploadIds,
        }),
        "Cleanup complete",
      );
    });

    // T059: cleanup partial failure logs
    it("logs partial failure when some deletions fail", async () => {
      mockUploadSdk = {
        scheduleFileDeletion: vi
          .fn()
          .mockResolvedValueOnce({ data: {} }) // upload-1 success
          .mockResolvedValueOnce({ error: { detail: "Not found" } }) // upload-2 fail
          .mockResolvedValueOnce({ data: {} }), // upload-3 success
      } as unknown as Upload;

      const uploadIds = ["upload-1", "upload-2", "upload-3"];
      const result = await cleanupFiles(mockUploadSdk, mockLogger, uploadIds);

      expect(result).toEqual({
        deletedCount: 2,
        attemptedCount: 3,
        successRate: expect.closeTo(0.6666, 3),
      });
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          deleted: 2,
          attempted: 3,
          successRate: "66.7%",
        }),
        "Cleanup complete",
      );
    });

    it("handles empty upload ID array", async () => {
      mockUploadSdk = {} as Upload;

      const result = await cleanupFiles(mockUploadSdk, mockLogger, []);

      expect(result).toEqual({
        deletedCount: 0,
        attemptedCount: 0,
        successRate: 1.0,
      });
    });
  });

  describe("uploadFile - retry behavior", () => {
    // T060: retry utility used for transient upload error
    it("retries on transient upload errors (502/503/504)", async () => {
      mockUploadSdk = {
        uploadFile: vi
          .fn()
          .mockResolvedValueOnce({
            error: { statusCode: 502, detail: "Bad Gateway" },
          })
          .mockResolvedValueOnce({
            error: { statusCode: 503, detail: "Service Unavailable" },
          })
          .mockResolvedValueOnce({ data: { uploadId: "upload-success" } }),
      } as unknown as Upload;

      const mockFile = {
        filename: "test.pdf",
        mimetype: "application/pdf",
        toBuffer: vi.fn().mockResolvedValue(Buffer.from("test content")),
      } as unknown as MultipartFile;

      const result = await uploadFile(mockUploadSdk, mockLogger, mockFile);

      expect(result.uploadId).toBe("upload-success");
      expect(mockUploadSdk.uploadFile).toHaveBeenCalledTimes(3);
    });

    // T061: no retry on 401/403 upload errors
    it("does not retry on 401/403 upload errors", async () => {
      mockUploadSdk = {
        uploadFile: vi.fn().mockResolvedValue({
          error: { statusCode: 401, detail: "Unauthorized" },
        }),
      } as unknown as Upload;

      const mockFile = {
        filename: "test.pdf",
        mimetype: "application/pdf",
        toBuffer: vi.fn().mockResolvedValue(Buffer.from("test content")),
      } as unknown as MultipartFile;

      await expect(
        uploadFile(mockUploadSdk, mockLogger, mockFile),
      ).rejects.toThrow();

      // Should only be called once (no retry)
      expect(mockUploadSdk.uploadFile).toHaveBeenCalledTimes(1);
    });
  });

  describe("shareFile - retry behavior", () => {
    it("retries on transient share errors", async () => {
      mockUploadSdk = {
        shareFile: vi
          .fn()
          .mockResolvedValueOnce({
            error: { statusCode: 502, detail: "Bad Gateway" },
          })
          .mockResolvedValueOnce({ data: { fileId: "share-success" } }),
      } as unknown as Upload;

      const result = await shareFile(
        mockUploadSdk,
        mockLogger,
        "upload-1",
        "profile-123",
      );

      expect(result.shareId).toBe("share-success");
      expect(mockUploadSdk.shareFile).toHaveBeenCalledTimes(2);
    });

    it("does not retry on 403 share errors", async () => {
      mockUploadSdk = {
        shareFile: vi.fn().mockResolvedValue({
          error: { statusCode: 403, detail: "Forbidden" },
        }),
      } as unknown as Upload;

      await expect(
        shareFile(mockUploadSdk, mockLogger, "upload-1", "profile-123"),
      ).rejects.toThrow();

      expect(mockUploadSdk.shareFile).toHaveBeenCalledTimes(1);
    });
  });
});
