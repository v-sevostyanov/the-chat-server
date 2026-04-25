import fp from "fastify-plugin";
import { ChatsHandlers } from "./chats.handlers";
import { ChatsRepository } from "./chats.repository";
import { chatsRoutes } from "./chats.routes";
import { ChatsService } from "./chats.service";

export const chatsModule = fp(
  async (fastify) => {
    const repository = new ChatsRepository(fastify.db);
    const service = new ChatsService(repository);
    const handlers = new ChatsHandlers(service, fastify.realtime, fastify.log);
    fastify.realtime.bindChatsAdapter(service);

    await fastify.register(chatsRoutes, { handlers });
  },
  {
    name: "chats-module",
    encapsulate: true,
  },
);
