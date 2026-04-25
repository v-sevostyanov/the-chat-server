import type { FastifyReply, FastifyRequest } from "fastify";
import type { PresenceService } from "./presence.service";

type PresenceUserParamsRequest = FastifyRequest<{
  Params: {
    userId: string;
  };
}>;

export class PresenceHandlers {
  readonly #service: PresenceService;

  constructor(service: PresenceService) {
    this.#service = service;
  }

  getMyPresence = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> => {
    const presence = await this.#service.getMyPresence(request.user.sub);
    reply.code(200).send({ data: presence });
  };

  getUserPresence = async (
    request: PresenceUserParamsRequest,
    reply: FastifyReply,
  ): Promise<void> => {
    const presence = await this.#service.getUserPresence(request.params.userId);
    reply.code(200).send({ data: presence });
  };
}
