import fp from "fastify-plugin";
import type { AppDb } from "../../db/client";
import { checkDatabaseReadiness, createDbClient } from "../../db/client";

type DbPluginOptions = {
  readonly db?: AppDb;
};

export const dbPlugin = fp<DbPluginOptions>(
  async (fastify, options) => {
    if (options.db) {
      fastify.decorate("db", options.db);
      fastify.decorate("checkDatabaseReadiness", async () => {
        await checkDatabaseReadiness(options.db as AppDb);
      });
      return;
    }

    const client = createDbClient(fastify.config.databaseUrl);
    fastify.decorate("db", client.db);
    fastify.decorate("checkDatabaseReadiness", async () => {
      await checkDatabaseReadiness(client.db);
    });

    fastify.addHook("onClose", async () => {
      await client.pool.end();
    });
  },
  {
    name: "db-plugin",
  },
);
