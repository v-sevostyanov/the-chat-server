import type { FastifyReply, FastifyRequest } from "fastify";
import type { AuthService } from "./auth.service";

type RegisterRequest = FastifyRequest<{
  Body: {
    username: string;
    displayName: string;
    password: string;
  };
}>;

type LoginRequest = FastifyRequest<{
  Body: {
    username: string;
    password: string;
  };
}>;

type RefreshRequest = FastifyRequest<{
  Body: {
    refreshToken: string;
  };
}>;

type LogoutRequest = FastifyRequest<{
  Body: {
    refreshToken: string;
  };
}>;

export class AuthHandlers {
  readonly #service: AuthService;

  constructor(service: AuthService) {
    this.#service = service;
  }

  register = async (
    request: RegisterRequest,
    reply: FastifyReply,
  ): Promise<void> => {
    const result = await this.#service.register(request.body);
    reply.code(201).send({ data: result });
  };

  login = async (request: LoginRequest, reply: FastifyReply): Promise<void> => {
    const result = await this.#service.login(request.body);
    reply.code(200).send({ data: result });
  };

  me = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const user = await this.#service.getSessionUser(request.user.sub);
    reply.code(200).send({ data: user });
  };

  refresh = async (
    request: RefreshRequest,
    reply: FastifyReply,
  ): Promise<void> => {
    const result = await this.#service.refresh(request.body);
    reply.code(200).send({ data: result });
  };

  logout = async (
    request: LogoutRequest,
    reply: FastifyReply,
  ): Promise<void> => {
    await this.#service.logout(request.body);
    reply.code(204).send(null);
  };
}
