import fastify, { type FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import type { JSONWebKeySet } from "jose";
import { exportJWK, generateKeyPair, SignJWT } from "jose";
import buildServer from "../server.js";

declare module "fastify" {
  interface FastifyInstance {}
}

// Cache the key pair globally to avoid regenerating for each test
let cachedKeyPair: { publicKey: CryptoKey; privateKey: CryptoKey } | null =
  null;
let cachedJwks: JSONWebKeySet | null = null;

async function getOrCreateKeyPair() {
  if (!cachedKeyPair) {
    cachedKeyPair = await generateKeyPair("RS256", { extractable: true });
    const publicJwk = await exportJWK(cachedKeyPair.publicKey);
    cachedJwks = {
      keys: [
        {
          ...publicJwk,
          kid: "test-key-id",
          alg: "RS256",
          use: "sig",
        },
      ],
    };
  }
  if (!cachedJwks) {
    throw new Error("JWKS not initialized");
  }
  return { keyPair: cachedKeyPair, jwks: cachedJwks };
}

// automatically build and tear down our instance
export async function buildTestServer(
  params: { organizationId?: string; setToken?: boolean } = {
    organizationId: "testing-org",
    setToken: true,
  },
) {
  const { jwks } = await getOrCreateKeyPair();

  const app = fastify({
    ajv: {
      customOptions: {
        coerceTypes: false,
        removeAdditional: "all",
      },
    },
  });

  // Inject test JWKS before server registration (for api-auth plugin)

  (app as FastifyInstance & { testJwks?: JSONWebKeySet }).testJwks = jwks;

  app.register(fp(buildServer));

  const token = await getValidToken(params.organizationId);

  // Add hook to inject authorization header
  app.addHook("onRequest", (req, _reply, done) => {
    if (params.setToken || params.setToken === undefined) {
      req.headers.authorization = `Bearer ${token.token}`;
    }
    done();
  });

  return app;
}

async function getValidToken(organizationId: string | undefined): Promise<{
  token: string;
  decoded: {
    jti: string;
    sub: string;
    scope: string;
    client_id: string;
    aud: string;
    orgId: string | undefined;
    iss: string;
  };
}> {
  const { keyPair } = await getOrCreateKeyPair();

  const toJwtData = {
    jti: "test-jwt-id-12345",
    sub: "user-123",
    scope:
      "profile:user.admin:* upload:file:* messaging:message:* messaging:event:read",
    client_id: "client-456",
    iss: "http://localhost:3301/oidc",
    aud: organizationId
      ? `urn:logto:organization:${organizationId}`
      : "audience-placeholder",
  };

  const token = await new SignJWT({
    jti: toJwtData.jti,
    sub: toJwtData.sub,
    scope: toJwtData.scope,
    client_id: toJwtData.client_id,
  })
    .setProtectedHeader({ alg: "RS256", kid: "test-key-id" })
    .setIssuedAt()
    .setIssuer(toJwtData.iss)
    .setAudience(toJwtData.aud)
    .setExpirationTime("1h")
    .sign(keyPair.privateKey);

  return {
    token,
    decoded: { ...toJwtData, orgId: organizationId },
  };
}

// Export the JWKS for mock server setup if needed
export async function getTestJwks(): Promise<JSONWebKeySet> {
  const { jwks } = await getOrCreateKeyPair();
  return jwks;
}
