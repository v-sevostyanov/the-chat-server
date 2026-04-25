import fp from "fastify-plugin";
import type { AppConfig } from "../../app/config";

type ConfigPluginOptions = {
  readonly config: AppConfig;
};

export const configPlugin = fp<ConfigPluginOptions>(
  async (fastify, options) => {
    fastify.decorate("config", options.config);
  },
  {
    name: "config-plugin",
  },
);
