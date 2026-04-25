import type { FastifyReply, FastifyRequest } from "fastify";
import type { HealthService } from "./health.service";

export class HealthHandlers {
  readonly #service: HealthService;

  constructor(service: HealthService) {
    this.#service = service;
  }

  live = async (_request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    reply.code(200).send(this.#service.live());
  };

  ready = async (_request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const readiness = await this.#service.readiness();
    reply.code(readiness.status === "ready" ? 200 : 503).send(readiness);
  };
}
