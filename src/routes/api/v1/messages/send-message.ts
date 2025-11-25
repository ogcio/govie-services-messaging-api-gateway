import type { MultipartFile } from "@fastify/multipart";
import type { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import createError from "http-errors";
import { sendMessage } from "../../../../services/message-orchestration.js";
import { requireAuthToken } from "../../../../utils/auth-helpers.js";
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
      preValidation: async (request, res) => {
        await fastify.gatewayCheckPermissions(request, res, []);
        if (request.isMultipart() && request.body) {
          // With attachFieldsToBody: true, fields have .value property
          const body = request.body as unknown as Record<
            string,
            { value: unknown }
          >;

          // Extract values from wrapped fields
          for (const key in body) {
            const field = body[key];
            if (field && typeof field === "object" && "value" in field) {
              // Parse recipient JSON if it's a string
              if (key === "recipient" && typeof field.value === "string") {
                try {
                  body[key] = JSON.parse(field.value) as typeof field;
                } catch {
                  throw createError.BadRequest("Invalid recipient JSON format");
                }
              } else {
                // Extract the value for other fields
                body[key] = field.value as typeof field;
              }
            }
          }
        }
      },
    },
    async (
      request: FastifyRequestTypebox<typeof sendMessageRouteSchema>,
      reply: FastifyReplyTypebox<typeof sendMessageRouteSchema>,
    ) => {
      const { body } = request;
      const accessToken = requireAuthToken(request, reply);
      if (!request.userData || !accessToken) {
        return;
      }

      // Acquire downstream SDK clients via token
      const profileSdk = fastify.getProfileSdk(accessToken);
      const uploadSdk = fastify.getUploadSdk(accessToken);
      const messagingSdk = fastify.getMessagingSdk(accessToken);

      // Collect file parts (with attachFieldsToBody: true, files are MultipartFile objects)
      const attachments: MultipartFile[] = [];
      if (request.isMultipart() && request.body.attachments) {
        const parts = Array.isArray(request.body.attachments)
          ? request.body.attachments
          : [request.body.attachments];

        for (const part of parts) {
          if (part && typeof part === "object" && "file" in part) {
            // part is a MultipartFile with properties: filename, mimetype, encoding, file, toBuffer()
            attachments.push(part as MultipartFile);
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
            userData: request.userData,
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
