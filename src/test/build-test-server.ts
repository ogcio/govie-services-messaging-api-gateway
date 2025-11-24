import { createSecretKey } from "node:crypto";
import fastify, { type FastifyReply, type FastifyRequest } from "fastify";
import fp from "fastify-plugin";
import { SignJWT } from "jose";
import buildServer from "../server.js";

declare module "fastify" {
  interface FastifyInstance {}
}

// automatically build and tear down our instance
export async function buildTestServer(setOnRequest: boolean = true) {
  const app = fastify({
    ajv: {
      customOptions: {
        coerceTypes: false,
        removeAdditional: "all",
      },
    },
  });

  // if (setOnRequest) {
  //   const token = await getValidToken();
  //   app.checkPermissions = async (req: FastifyRequest, _rep: FastifyReply) => {
  //     req.userData = {
  //       userId: token.decoded.aud,
  //       organizationId: token.decoded.orgId,
  //       accessToken: token.token,
  //       isM2MApplication: true,
  //       signInMethod: "mock",
  //     };
  //   };
  // }

  app.register(fp(buildServer));

  if (setOnRequest) {
    const token = await getValidToken();
    app.addHook("onRequest", (req: FastifyRequest, _reply, done) => {
      req.userData = {
        accessToken: "test-token",
        organizationId: "org-123",
        userId: "user-123",
        isM2MApplication: false,
      };
      req.headers.authorization = `Bearer ${token.token}`;
      done();
    });
  }

  return app;
}

async function getValidToken(): Promise<{
  token: string;
  decoded: {
    jti: string;
    sub: string;
    scope: string;
    client_id: string;
    aud: string;
    orgId: string;
  };
}> {
  const toJwtData = {
    jti: "1234554fdwjkdbjfvdebi",
    sub: "r58qdwh2da6qtsqb12345",
    iat: 1763894620,
    exp: 1763898220,
    scope:
      "profile:user.admin:* upload:file:* messaging:message:* messaging:event:read",
    client_id: "r58qdwh2da6qtsqb12345",
    iss: "http://localhost:3301/oidc",
    aud: "urn:logto:organization:testing-org",
  };

  const key = createSecretKey("my-secret-key-my-secret-key-1234", "utf-8");
  const sign = new SignJWT(toJwtData)
    .setProtectedHeader({ alg: "RSA256" }) // algorithm
    .setIssuedAt()
    .setIssuer(toJwtData.iss) // issuer
    .setAudience(toJwtData.aud) // audience
    .setExpirationTime("5 minutes") // token expiration time, e.g., "1 day"
    .sign(key); // secretKey generated from previous step

  return {
    token: await sign,
    decoded: { ...toJwtData, orgId: "testing-org" },
  };
}
