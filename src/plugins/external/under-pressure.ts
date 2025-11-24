import fastifyUnderPressure from "@fastify/under-pressure";
import type { FastifyReply, FastifyRequest } from "fastify";
import v8 from "v8";

export const autoConfig = {
  maxEventLoopDelay: 1000,
  maxHeapUsedBytes: v8.getHeapStatistics().heap_size_limit,
  maxRssBytes: v8.getHeapStatistics().total_available_size,
  maxEventLoopUtilization: 0.98,
  pressureHandler: (
    req: FastifyRequest,
    rep: FastifyReply,
    type: string,
    value: number | string | undefined | null,
  ) => {
    if (process.env.NODE_ENV === "test") {
      return;
    }

    req.log.warn({ type, value }, "SYSTEM_UNDER_PRESSURE");

    rep
      .status(503)
      .send({ message: "System under pressure, please retry later" });
  },
};

export default fastifyUnderPressure;
