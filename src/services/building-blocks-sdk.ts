import { getBuildingBlockSDK } from "@ogcio/building-blocks-sdk";
import type { FastifyBaseLogger } from "fastify";
import type { BuildingBlocksSdkEnvConfig } from "../plugins/external/env.js";

export function getProfileSdk(params: {
  token: string;
  config: BuildingBlocksSdkEnvConfig;
  logger?: FastifyBaseLogger;
}) {
  const { token, config, logger } = params;

  return getBuildingBlockSDK({
    services: {
      profile: {
        baseUrl: config.PROFILE_API_URL,
      },
    },
    getTokenFn: () => Promise.resolve(token),
    logger,
  }).profile;
}

export function getMessagingSdk(params: {
  token: string;
  config: BuildingBlocksSdkEnvConfig;
  logger?: FastifyBaseLogger;
}) {
  const { token, config, logger } = params;

  return getBuildingBlockSDK({
    services: {
      messaging: {
        baseUrl: config.MESSAGING_API_URL,
      },
    },
    getTokenFn: () => Promise.resolve(token),
    logger,
  }).messaging;
}

export function getUploadSdk(params: {
  token: string;
  config: BuildingBlocksSdkEnvConfig;
  logger?: FastifyBaseLogger;
}) {
  const { token, config, logger } = params;

  return getBuildingBlockSDK({
    services: {
      upload: {
        baseUrl: config.UPLOAD_API_URL,
      },
    },
    getTokenFn: () => Promise.resolve(token),
    logger,
  }).upload;
}
