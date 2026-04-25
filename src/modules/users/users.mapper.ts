import type { UserRow } from "../../db/schema/users";
import type { UserDto } from "./users.types";

export function toUserDto(user: UserRow): UserDto {
  const createdAt =
    user.createdAt instanceof Date
      ? user.createdAt.toISOString()
      : new Date(String(user.createdAt)).toISOString();
  const updatedAt =
    user.updatedAt instanceof Date
      ? user.updatedAt.toISOString()
      : new Date(String(user.updatedAt)).toISOString();

  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    createdAt,
    updatedAt,
  };
}
