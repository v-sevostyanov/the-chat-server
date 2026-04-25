export type AuthUserDto = {
  id: string;
  username: string;
  displayName: string;
};

export type AuthTokensDto = {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresIn: number;
  refreshTokenExpiresIn: number;
};

export type AuthResponseDto = {
  user: AuthUserDto;
  tokens: AuthTokensDto;
};

export type RegisterInput = {
  username: string;
  displayName: string;
  password: string;
};

export type LoginInput = {
  username: string;
  password: string;
};

export type RefreshInput = {
  refreshToken: string;
};

export type LogoutInput = {
  refreshToken: string;
};

export type TokenPayload = {
  sub: string;
  sid?: string;
  jti?: string;
  tokenType: "access" | "refresh";
};
