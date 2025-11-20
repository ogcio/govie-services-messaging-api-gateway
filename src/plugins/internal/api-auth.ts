import apiAuthPlugin, {
  type CheckPermissionsPluginOpts,
} from "@ogcio/api-auth";
import type { FastifyInstance } from "fastify";
import type { JSONWebKeySet } from "jose";

const JWKS_CACHE_KEY = "logto_jwks_key";
const JWKS_CACHE_TTL = 60 * 5; // 5 minutes

export const autoConfig = (
  fastify: FastifyInstance,
): CheckPermissionsPluginOpts => {
  return {
    jwkEndpoint: fastify.config.LOGTO_JWK_ENDPOINT,
    oidcEndpoint: fastify.config.LOGTO_OIDC_ENDPOINT,
    storeLocalJwkSetFn: (jwkSet: JSONWebKeySet): Promise<void> => {
      fastify.nodeCache?.set(JWKS_CACHE_KEY, jwkSet, JWKS_CACHE_TTL);
      return Promise.resolve();
    },
    getLocalJwksFn: (): JSONWebKeySet | undefined => {
      const cachedJwks = fastify.nodeCache?.get(JWKS_CACHE_KEY) as
        | JSONWebKeySet
        | undefined;
      return cachedJwks;
    },
  };
};

export default apiAuthPlugin;
