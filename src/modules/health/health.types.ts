export type LiveResponse = {
  status: "ok";
  timestamp: string;
};

export type DependencyCheck = {
  name: "database" | "redis";
  status: "up" | "down";
  latencyMs: number;
  error?: string;
};

export type ReadinessResponse = {
  status: "ready" | "degraded";
  timestamp: string;
  checks: DependencyCheck[];
};
