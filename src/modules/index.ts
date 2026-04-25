import fp from "fastify-plugin";
import { authModule } from "./auth";
import { chatsModule } from "./chats";
import { healthModule } from "./health";
import { messagesModule } from "./messages";
import { presenceModule } from "./presence";
import { usersModule } from "./users";

export const modulesPlugin = fp(
  async (fastify) => {
    await fastify.register(healthModule);
    await fastify.register(authModule, { prefix: "/api/v1/auth" });
    await fastify.register(usersModule, { prefix: "/api/v1/users" });
    await fastify.register(chatsModule, { prefix: "/api/v1/chats" });
    await fastify.register(messagesModule, { prefix: "/api/v1/messages" });
    await fastify.register(presenceModule, { prefix: "/api/v1/presence" });
  },
  {
    name: "modules-plugin",
  },
);
