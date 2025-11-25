import { randomUUID } from "node:crypto";
import { EnvKeys } from "../plugins/external/env.js";

export async function setup() {
  setVariablesToRunWithoutEnvFile();
}

export async function teardown() {}

const customEnvValues: Record<string, string> = {
  HOST_URL: "http://localhost:1000",
  LOGTO_JWK_ENDPOINT: "http://localhost:3301/oidc/jwks",
  LOGTO_OIDC_ENDPOINT: "http://localhost:3301/oidc",
};

async function setVariablesToRunWithoutEnvFile() {
  for (const current of Object.entries(EnvKeys)) {
    const [key, value] = current;
    if (!value.required) {
      continue;
    }

    if (value.default) {
      process.env[key] = value.default as string;
      continue;
    }

    if (key in customEnvValues) {
      process.env[key] = customEnvValues[key];
      continue;
    }

    switch (value.type) {
      case "string":
        process.env[key] = randomUUID().substring(0, 5);
        break;
      case "number":
        process.env[key] = Math.floor(Math.random() * 1000).toString();
        break;
      case "boolean":
        process.env[key] = Math.random() > 0.5 ? "true" : "false";
        break;
      default:
        throw new Error(`Unsupported type ${value.type} for key ${key}`);
    }
  }
}
