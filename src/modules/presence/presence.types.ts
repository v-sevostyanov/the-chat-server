export type PresenceDto = {
  userId: string;
  isOnline: boolean;
  lastSeenAt: string | null;
};

export type PresenceSnapshot = {
  userId: string;
  lastSeenAt: Date | null;
  activeConnections: number;
};

export type SocketConnectionInput = {
  userId: string;
  connectionId: string;
};
