import "./env";
import { buildApp } from "./app";

async function startServer(): Promise<void> {
  const app = await buildApp();

  const shutdown = async (signal: NodeJS.Signals): Promise<void> => {
    app.log.info({ signal }, "Shutdown signal received.");
    await app.close();
  };

  process.once("SIGINT", () => {
    void shutdown("SIGINT");
  });

  process.once("SIGTERM", () => {
    void shutdown("SIGTERM");
  });

  try {
    await app.listen({
      host: app.config.host,
      port: app.config.port,
    });
  } catch (error) {
    app.log.error({ err: error }, "Failed to start server.");
    process.exitCode = 1;
    await app.close();
  }
}

void startServer();
