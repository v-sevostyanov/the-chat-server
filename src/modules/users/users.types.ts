export type UserDto = {
  id: string;
  username: string;
  displayName: string;
  createdAt: string;
  updatedAt: string;
};

export type UpdateCurrentUserInput = {
  username?: string;
  displayName?: string;
};

export type ListUsersInput = {
  limit: number;
  offset: number;
  search?: string;
};

export type GetUserByIdInput = {
  userId: string;
};

export type GetCurrentUserInput = {
  currentUserId: string;
};

export type UpdateCurrentUserServiceInput = {
  currentUserId: string;
  patch: UpdateCurrentUserInput;
};

export type UpdateUserRecord = {
  username?: string;
  displayName?: string;
};
