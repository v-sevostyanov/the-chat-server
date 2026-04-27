import { createRagService } from "./runtime";

type CliCommand = "index" | "search" | "status";

async function main(): Promise<void> {
  const [command, ...args] = process.argv.slice(2);
  if (!isCommand(command)) {
    printUsage();
    process.exitCode = 1;
    return;
  }

  const service = createRagService();

  if (command === "index") {
    const result = await service.indexRepository();
    console.info(JSON.stringify(result, null, 2));
    return;
  }

  if (command === "status") {
    const result = await service.status();
    console.info(JSON.stringify(result, null, 2));
    return;
  }

  const query = args.filter((arg) => !arg.startsWith("--")).join(" ").trim();
  const limit = parseLimit(args);
  const result = await service.search({ query, limit });
  console.info(JSON.stringify({ data: result }, null, 2));
}

function isCommand(value: string | undefined): value is CliCommand {
  return value === "index" || value === "search" || value === "status";
}

function parseLimit(args: readonly string[]): number | undefined {
  const limitArg = args.find((arg) => arg.startsWith("--limit="));
  if (!limitArg) {
    return undefined;
  }

  const rawLimit = limitArg.slice("--limit=".length);
  const limit = Number(rawLimit);
  return Number.isNaN(limit) ? undefined : limit;
}

function printUsage(): void {
  console.info(
    [
      "Usage:",
      "  npm run rag:index",
      "  npm run rag:status",
      "  npm run rag:search -- \"query text\" --limit=8",
    ].join("\n"),
  );
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
