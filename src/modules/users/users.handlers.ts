import type { FastifyReply, FastifyRequest } from "fastify";
import type { UsersService } from "./users.service";

type UpdateCurrentUserRequest = FastifyRequest<{
  Body: {
    username?: string;
    displayName?: string;
  };
}>;

type ListUsersRequest = FastifyRequest<{
  Querystring: {
    limit?: number;
    offset?: number;
    search?: string;
  };
}>;

type GetUserByIdRequest = FastifyRequest<{
  Params: {
    userId: string;
  };
}>;

export class UsersHandlers {
  readonly #service: UsersService;

  constructor(service: UsersService) {
    this.#service = service;
  }

  getCurrentUser = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> => {
    const user = await this.#service.getCurrentUser({
      currentUserId: request.user.sub,
    });
    reply.code(200).send({ data: user });
  };

  updateCurrentUser = async (
    request: UpdateCurrentUserRequest,
    reply: FastifyReply,
  ): Promise<void> => {
    const user = await this.#service.updateCurrentUser({
      currentUserId: request.user.sub,
      patch: request.body,
    });
    reply.code(200).send({ data: user });
  };

  getUserById = async (
    request: GetUserByIdRequest,
    reply: FastifyReply,
  ): Promise<void> => {
    const user = await this.#service.getUserById({
      userId: request.params.userId,
    });
    reply.code(200).send({ data: user });
  };

  listUsers = async (
    request: ListUsersRequest,
    reply: FastifyReply,
  ): Promise<void> => {
    const limit = request.query.limit ?? 20;
    const offset = request.query.offset ?? 0;
    const users = await this.#service.listUsers({
      limit,
      offset,
      search: request.query.search,
    });

    reply.code(200).send({ data: users });
  };
}
