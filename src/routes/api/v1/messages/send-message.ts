import type { MultipartFile } from "@fastify/multipart";
import type { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import createError from "http-errors";
import { sendMessage } from "../../../../services/message-orchestration.js";
import type {
  FastifyReplyTypebox,
  FastifyRequestTypebox,
} from "../../../shared-routes.js";
import { sendMessageRouteSchema } from "./schema.js";

/**
 * POST /v1/messages
 *
 * Send a message to recipients with optional attachments
 *
 * Content-Type: multipart/form-data
 * - Uses attachToBody option to attach parsed fields to request.body
 * - Files are streamed via onFile handler to avoid buffering
 *
 * Spec: US1, FR-001 through FR-039
 * Success: 201 Created
 * Errors: 400 validation_error, 401 auth_missing, 403 org_missing,
 *         404 recipient_not_found, 409 recipient_conflict,
 *         413 attachment_limit_exceeded, 500 internal_error,
 *         502/503/504 transient_failure
 */

const sendMessageRoute: FastifyPluginAsyncTypebox = async (fastify) => {
  fastify.post(
    "/",
    {
      schema: sendMessageRouteSchema,
    },
    async (
      request: FastifyRequestTypebox<typeof sendMessageRouteSchema>,
      reply: FastifyReplyTypebox<typeof sendMessageRouteSchema>,
    ) => {
      const { body, userData } = request;
      if (!userData || !userData.accessToken) {
        throw createError.Unauthorized("Missing access token");
      }

      // Acquire downstream SDK clients via token
      const profileSdk = fastify.getProfileSdk(userData.accessToken);
      const uploadSdk = fastify.getUploadSdk(userData.accessToken);
      const messagingSdk = fastify.getMessagingSdk(userData.accessToken);

      // Collect file parts (streamed via onFile, attached to request)
      const attachments: MultipartFile[] = [];
      if (request.isMultipart()) {
        const parts = request.parts();
        for await (const part of parts) {
          if (part.type === "file") {
            attachments.push(part);
          }
        }
      }

      // Map request body to orchestration input shape
      const input = {
        subject: body.subject,
        plainTextBody: body.plainTextBody,
        htmlBody: body.htmlBody,
        securityLevel: body.securityLevel,
        language: body.language,
        scheduledAt: body.scheduledAt,
        recipient: body.recipient,
        attachments: attachments.length ? attachments : undefined,
      };

      try {
        const result = await sendMessage(
          {
            profileSdk,
            uploadSdk,
            messagingSdk,
            userData,
            logger: request.log,
          },
          input,
        );

        // Assemble generic response (metadata minimal for now)
        reply.status(201).send({ data: { ...result, status: "created" } });
      } catch (err) {
        // http-errors already thrown by underlying services; map fallback
        if ((err as { statusCode?: number }).statusCode) throw err;
        request.log.error({ err }, "send-message handler unexpected error");
        throw createError.InternalServerError("Failed to send message");
      }
    },
  );
};

export default sendMessageRoute;
