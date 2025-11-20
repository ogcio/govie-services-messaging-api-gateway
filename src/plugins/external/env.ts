import env from "@fastify/env";
import type { SDKLogLevel } from "@ogcio/o11y-sdk-node";

declare module "fastify" {
  export interface FastifyInstance {
    config: EnvConfig;
  }
}

interface EnvKey {
  type: "number" | "string" | "boolean";
  default?: number | string | boolean;
  required: boolean;
}

export interface BasicEnvConfig {
  PORT: number;
  FASTIFY_CLOSE_GRACE_DELAY: number;
  LOG_LEVEL: string;
  HOST_URL: string;
}

const BasicEnvConfigKeys: Record<string, EnvKey> = {
  PORT: { type: "number", required: true },
  FASTIFY_CLOSE_GRACE_DELAY: { type: "number", default: 500, required: false },
  LOG_LEVEL: { type: "string", default: "debug", required: false },
  HOST_URL: { type: "string", required: true },
};

export interface InstrumentationEnvConfig {
  OTEL_COLLECTOR_URL: string;
  OTEL_SERVER_SERVICE_NAME: string;
  OTEL_LOG_LEVEL: SDKLogLevel;
}

const InstrumentationEnvConfigKeys: Record<string, EnvKey> = {
  OTEL_COLLECTOR_URL: { type: "string", required: false },
  OTEL_SERVER_SERVICE_NAME: { type: "string", required: false },
  OTEL_LOG_LEVEL: { type: "string", default: "ERROR", required: false },
};

export interface LogtoEnvConfig {
  LOGTO_JWK_ENDPOINT: string;
  LOGTO_OIDC_ENDPOINT: string;
}

const LogtoEnvConfigKeys: Record<string, EnvKey> = {
  LOGTO_JWK_ENDPOINT: { type: "string", required: true },
  LOGTO_OIDC_ENDPOINT: { type: "string", required: true },
};

export interface BuildingBlocksSdkEnvConfig {
  PROFILE_API_URL: string;
  UPLOAD_API_URL: string;
  MESSAGING_API_URL: string;
}

const BuildingBlocksSdkEnvConfigKeys: Record<string, EnvKey> = {
  PROFILE_API_URL: { type: "string", required: true },
  UPLOAD_API_URL: { type: "string", required: true },
  MESSAGING_API_URL: { type: "string", required: true },
};

export interface EnvConfig
  extends BasicEnvConfig,
    InstrumentationEnvConfig,
    LogtoEnvConfig,
    BuildingBlocksSdkEnvConfig {}

export const EnvKeys: Record<string, EnvKey> = {
  ...BasicEnvConfigKeys,
  ...InstrumentationEnvConfigKeys,
  ...LogtoEnvConfigKeys,
  ...BuildingBlocksSdkEnvConfigKeys,
};

const allKeys = Object.keys(EnvKeys);
const required = allKeys.filter((keyName) => EnvKeys[keyName].required);
const properties = allKeys.reduce(
  (
    accumulator: Record<
      string,
      { type: string; default?: number | boolean | string }
    >,
    key: string,
  ) => {
    accumulator[key] = {
      type: EnvKeys[key].type,
      default: EnvKeys[key].default,
    };

    return accumulator;
  },
  {},
);

const schema = {
  type: "object",
  required,
  properties,
};

export const autoConfig = {
  schema,
  dotenv: { debug: false, quiet: true },
};

export default env;
