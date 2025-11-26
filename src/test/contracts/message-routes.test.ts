import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { messagingRouteSchemas } from "../../routes/api/v1/messages/schema.js";
import { buildTestServer } from "../build-test-server.js";

/**
 * Contract tests for message routes
 *
 * Purpose: Validate request/response schemas match OpenAPI specification
 * Spec: US1, US2, US3
 */

describe("Message Routes - Contract Tests (Phase 2)", () => {
  let server: FastifyInstance;

  beforeAll(async () => {
    server = await buildTestServer();
  });

  afterAll(async () => {
    await server.close();
  });

  it("aggregated schemas expose expected response codes", () => {
    const sendCodes = Object.keys(messagingRouteSchemas.sendMessage.response);
    expect(sendCodes).toEqual(
      expect.arrayContaining([
        "201",
        "400",
        "401",
        "403",
        "404",
        "409",
        "413",
        "500",
        "502",
        "503",
        "504",
      ]),
    );
    const eventsCodes = Object.keys(
      messagingRouteSchemas.getMessageEvents.response,
    );
    expect(eventsCodes).toEqual(
      expect.arrayContaining(["200", "401", "403", "500"]),
    );
    const historyCodes = Object.keys(
      messagingRouteSchemas.getMessageHistory.response,
    );
    expect(historyCodes).toEqual(
      expect.arrayContaining(["200", "401", "403", "404", "500"]),
    );
  });

  it("sendMessage schema includes body and 201 response", () => {
    expect(messagingRouteSchemas.sendMessage.body).toBeDefined();
    expect(messagingRouteSchemas.sendMessage.response[201]).toBeDefined();
  });

  it("events schema includes querystring pagination", () => {
    expect(messagingRouteSchemas.getMessageEvents.querystring).toBeDefined();
    expect(messagingRouteSchemas.getMessageEvents.response[200]).toBeDefined();
  });

  it("history schema includes params and 200 response", () => {
    expect(messagingRouteSchemas.getMessageHistory.params).toBeDefined();
    expect(messagingRouteSchemas.getMessageHistory.response[200]).toBeDefined();
  });

  // T062: Contract test for send-message schema fields
  it("send-message schema validates required fields and response structure", () => {
    const bodySchema = messagingRouteSchemas.sendMessage.body;
    const responseSchema = messagingRouteSchemas.sendMessage.response[201];

    // Verify body schema has required properties
    expect(bodySchema).toBeDefined();
    expect(bodySchema.properties).toHaveProperty("subject");
    expect(bodySchema.properties).toHaveProperty("plainTextBody");
    expect(bodySchema.properties).toHaveProperty("securityLevel");
    expect(bodySchema.properties).toHaveProperty("language");
    expect(bodySchema.properties).toHaveProperty("scheduledAt");
    expect(bodySchema.properties).toHaveProperty("recipient");

    // Verify optional fields present
    expect(bodySchema.properties).toHaveProperty("htmlBody");

    // Verify recipient union schema
    const recipientSchema = bodySchema.properties.recipient;
    expect(recipientSchema.anyOf).toBeDefined();
    expect(recipientSchema.anyOf).toHaveLength(2);

    // Verify 201 response schema structure
    expect(responseSchema).toBeDefined();
    expect(responseSchema.properties).toHaveProperty("data");

    const dataSchema = responseSchema.properties.data;
    expect(dataSchema.properties).toHaveProperty("messageId");
    expect(dataSchema.properties).toHaveProperty("recipientId");
    expect(dataSchema.properties).toHaveProperty("attachmentIds");
  });

  // T087: Contract test for history schema correctness
  it("history schema validates required fields and response structure", () => {
    const paramsSchema = messagingRouteSchemas.getMessageHistory.params;
    const responseSchema =
      messagingRouteSchemas.getMessageHistory.response[200];

    // Verify params schema has messageId
    expect(paramsSchema).toBeDefined();
    expect(paramsSchema.properties).toHaveProperty("messageId");

    // Verify 200 response schema structure
    expect(responseSchema).toBeDefined();
    expect(responseSchema.properties).toHaveProperty("data");

    const dataSchema = responseSchema.properties.data;
    expect(dataSchema.type).toBe("array");
    expect(dataSchema.items).toBeDefined();
    expect(dataSchema.items.properties).toHaveProperty("eventType");
    expect(dataSchema.items.properties).toHaveProperty("createdAt");
  });
});
