import fastifyMultipart, {
  type FastifyMultipartOptions,
} from "@fastify/multipart";

/**
 * Multipart form data plugin for file uploads
 *
 * Purpose: Enable multipart/form-data parsing for attachment uploads
 * Spec: FR-005, FR-015
 */

export const autoConfig: FastifyMultipartOptions = {
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB per file
  },
};

export default fastifyMultipart;
