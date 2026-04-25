import { users } from "../../db/schema";
import type { AuthUserDto } from "./auth.types";

type AuthUserRow = Pick<
  typeof users.$inferSelect,
  "id" | "username" | "displayName"
>;

export function toAuthUserDto(user: AuthUserRow): AuthUserDto {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
  };
}
