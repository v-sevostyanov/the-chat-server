import fp from "fastify-plugin";
import { MessagesHandlers } from "./messages.handlers";
import { MessagesRepository } from "./messages.repository";
import { messagesRoutes } from "./messages.routes";
import { MessagesService } from "./messages.service";

export const messagesModule = fp(
  async (fastify) => {
    const repository = new MessagesRepository(fastify.db);
    const service = new MessagesService(repository);
    const handlers = new MessagesHandlers(service, fastify.realtime, fastify.log);

    await fastify.register(messagesRoutes, { handlers });
  },
  {
    name: "messages-module",
    encapsulate: true,
  },
);
