import type { DependencyCheck, LiveResponse, ReadinessResponse } from "./health.types";

type DependencyProbe = {
  readonly name: DependencyCheck["name"];
  readonly check: () => Promise<void>;
};

export class HealthService {
  readonly #probes: readonly DependencyProbe[];

  constructor(probes: readonly DependencyProbe[]) {
    this.#probes = probes;
  }

  live(): LiveResponse {
    return {
      status: "ok",
      timestamp: new Date().toISOString(),
    };
  }

  async readiness(): Promise<ReadinessResponse> {
    const checks = await Promise.all(
      this.#probes.map(async (probe) => {
        const startedAt = Date.now();
        try {
          await probe.check();
          return {
            name: probe.name,
            status: "up" as const,
            latencyMs: Date.now() - startedAt,
          };
        } catch (error) {
          void error;
          return {
            name: probe.name,
            status: "down" as const,
            latencyMs: Date.now() - startedAt,
            error: "Dependency check failed.",
          };
        }
      }),
    );

    return {
      status: checks.every((check) => check.status === "up")
        ? "ready"
        : "degraded",
      timestamp: new Date().toISOString(),
      checks,
    };
  }
}
