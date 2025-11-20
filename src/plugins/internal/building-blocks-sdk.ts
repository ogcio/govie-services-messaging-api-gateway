import type {
  Messaging,
  Profile,
  Upload,
} from "@ogcio/building-blocks-sdk/dist/types/index.js";
import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
import {
  getMessagingSdk,
  getProfileSdk,
  getUploadSdk,
} from "../../services/building-blocks-sdk.js";

declare module "fastify" {
  export interface FastifyInstance {
    getProfileSdk: (token: string) => Profile;
    getMessagingSdk: (token: string) => Messaging;
    getUploadSdk: (token: string) => Upload;
  }
}

export default fp((fastify: FastifyInstance, _opts: FastifyPluginAsync) => {
  fastify.decorate("getProfileSdk", (token: string) =>
    getProfileSdk({
      token,
      config: fastify.config,
      logger: fastify.log,
    }),
  );

  fastify.decorate("getMessagingSdk", (token: string) =>
    getMessagingSdk({
      token,
      config: fastify.config,
      logger: fastify.log,
    }),
  );

  fastify.decorate("getUploadSdk", (token: string) =>
    getUploadSdk({
      token,
      config: fastify.config,
      logger: fastify.log,
    }),
  );
});
