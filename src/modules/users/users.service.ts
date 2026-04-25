import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from "../../shared/errors/app-error";
import { isPgUniqueViolationError } from "../../shared/db/errors";
import { toUserDto } from "./users.mapper";
import type {
  GetCurrentUserInput,
  GetUserByIdInput,
  ListUsersInput,
  UpdateCurrentUserServiceInput,
  UpdateUserRecord,
} from "./users.types";
import { UsersRepository } from "./users.repository";

export class UsersService {
  readonly #repository: UsersRepository;

  constructor(repository: UsersRepository) {
    this.#repository = repository;
  }

  async getCurrentUser(input: GetCurrentUserInput) {
    const user = await this.#repository.findById(input.currentUserId);
    if (!user) {
      throw new NotFoundError("User was not found.");
    }

    return toUserDto(user);
  }

  async updateCurrentUser(input: UpdateCurrentUserServiceInput) {
    const normalizedPatch: UpdateUserRecord = {};

    if (input.patch.username !== undefined) {
      const username = input.patch.username.trim().toLowerCase();
      if (username.length === 0) {
        throw new BadRequestError("Username cannot be empty.");
      }
      normalizedPatch.username = username;
    }

    if (input.patch.displayName !== undefined) {
      const displayName = input.patch.displayName.trim();
      if (displayName.length === 0) {
        throw new BadRequestError("Display name cannot be empty.");
      }
      normalizedPatch.displayName = displayName;
    }

    if (
      normalizedPatch.username === undefined &&
      normalizedPatch.displayName === undefined
    ) {
      throw new BadRequestError(
        "At least one profile field must be provided for update.",
      );
    }

    if (normalizedPatch.username !== undefined) {
      const existing = await this.#repository.findByUsername(normalizedPatch.username);
      if (existing && existing.id !== input.currentUserId) {
        throw new ConflictError("Username already exists.", {
          username: normalizedPatch.username,
        });
      }
    }

    let updatedUser;
    try {
      updatedUser = await this.#repository.updateById(
        input.currentUserId,
        normalizedPatch,
        new Date(),
      );
    } catch (error) {
      if (isPgUniqueViolationError(error)) {
        throw new ConflictError("Username already exists.", {
          username: normalizedPatch.username,
        });
      }

      throw error;
    }

    if (!updatedUser) {
      throw new NotFoundError("User was not found.");
    }

    return toUserDto(updatedUser);
  }

  async getUserById(input: GetUserByIdInput) {
    const user = await this.#repository.findById(input.userId);
    if (!user) {
      throw new NotFoundError("User was not found.");
    }

    return toUserDto(user);
  }

  async listUsers(input: ListUsersInput) {
    const normalizedSearch = input.search?.trim().toLowerCase();

    const users = await this.#repository.list({
      limit: input.limit,
      offset: input.offset,
      search:
        normalizedSearch && normalizedSearch.length > 0
          ? normalizedSearch
          : undefined,
    });

    return users.map(toUserDto);
  }
}
