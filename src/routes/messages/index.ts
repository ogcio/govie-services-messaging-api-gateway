import type { FastifyPluginAsync } from "fastify";
import getMessageEventsRoute from "./get-message-events.js";
import getMessageHistoryRoute from "./get-message-history.js";
import sendMessageRoute from "./send-message.js";

/**
 * Message Routes (v1/messages)
 *
 * Purpose: Public-facing message API endpoints
 * Spec: US1, US2, US3
 */

const messagesRoutes: FastifyPluginAsync = async (fastify) => {
  await fastify.register(sendMessageRoute);
  await fastify.register(getMessageEventsRoute);
  await fastify.register(getMessageHistoryRoute);
};

export default messagesRoutes;
