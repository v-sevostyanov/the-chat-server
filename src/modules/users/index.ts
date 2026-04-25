import fp from "fastify-plugin";
import { UsersHandlers } from "./users.handlers";
import { UsersRepository } from "./users.repository";
import { usersRoutes } from "./users.routes";
import { UsersService } from "./users.service";

export const usersModule = fp(
  async (fastify) => {
    const repository = new UsersRepository(fastify.db);
    const service = new UsersService(repository);
    const handlers = new UsersHandlers(service);

    await fastify.register(usersRoutes, { handlers });
  },
  {
    name: "users-module",
    encapsulate: true,
  },
);
