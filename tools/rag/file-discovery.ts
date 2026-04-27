import { execFile } from "node:child_process";
import { constants } from "node:fs";
import { access, lstat, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import type { RagDiscoveryResult, RagSkippedFile, RagSourceFile } from "./types";

const execFileAsync = promisify(execFile);

const ALLOWED_EXTENSIONS = new Set([
  ".md",
  ".ts",
  ".tsx",
  ".js",
  ".cjs",
  ".mjs",
  ".json",
  ".sql",
  ".yml",
  ".yaml",
  ".toml",
]);

const DENIED_FILE_NAMES = new Set([
  "package-lock.json",
  "npm-shrinkwrap.json",
  "pnpm-lock.yaml",
  "yarn.lock",
  "bun.lockb",
  "bun.lock",
]);

const DENIED_EXTENSIONS = new Set([
  ".pem",
  ".key",
  ".p12",
  ".pfx",
  ".crt",
  ".cer",
  ".der",
]);

export type GitFileLister = (rootDir: string) => Promise<readonly string[]>;

export async function listGitVisibleFiles(rootDir: string): Promise<readonly string[]> {
  const { stdout } = await execFileAsync(
    "git",
    ["ls-files", "--cached", "--others", "--exclude-standard"],
    {
      cwd: rootDir,
      windowsHide: true,
      maxBuffer: 20 * 1024 * 1024,
    },
  );

  return stdout
    .split(/\r?\n/)
    .map((filePath) => filePath.trim())
    .filter((filePath) => filePath.length > 0);
}

export function shouldIndexPath(relativePath: string): string | null {
  const normalizedPath = normalizeRelativePath(relativePath);
  const baseName = path.posix.basename(normalizedPath);
  const extension = path.posix.extname(baseName).toLowerCase();

  if (baseName === ".env.example") {
    return null;
  }

  if (baseName === ".env" || baseName.startsWith(".env.")) {
    return "env file";
  }

  if (DENIED_FILE_NAMES.has(baseName)) {
    return "lockfile";
  }

  if (DENIED_EXTENSIONS.has(extension)) {
    return "secret or certificate file";
  }

  if (!ALLOWED_EXTENSIONS.has(extension)) {
    return "unsupported extension";
  }

  return null;
}

export function isProbablyBinary(buffer: Buffer): boolean {
  if (buffer.includes(0)) {
    return true;
  }

  const sampleSize = Math.min(buffer.length, 4096);
  let suspiciousBytes = 0;

  for (let index = 0; index < sampleSize; index += 1) {
    const byte = buffer[index];
    const isAllowedControl =
      byte === 9 || byte === 10 || byte === 13 || byte === 27;

    if (byte < 32 && !isAllowedControl) {
      suspiciousBytes += 1;
    }
  }

  return sampleSize > 0 && suspiciousBytes / sampleSize > 0.05;
}

export async function discoverRagFiles(options: {
  readonly rootDir: string;
  readonly maxFileBytes: number;
  readonly listFiles?: GitFileLister;
}): Promise<RagDiscoveryResult> {
  const listFiles = options.listFiles ?? listGitVisibleFiles;
  const candidates = await listFiles(options.rootDir);
  const files: RagSourceFile[] = [];
  const skipped: RagSkippedFile[] = [];

  for (const candidatePath of candidates) {
    const normalizedPath = normalizeRelativePath(candidatePath);
    const pathReason = shouldIndexPath(normalizedPath);
    if (pathReason) {
      skipped.push({ path: normalizedPath, reason: pathReason });
      continue;
    }

    const absolutePath = path.resolve(options.rootDir, normalizedPath);
    if (!isPathInsideRoot(options.rootDir, absolutePath)) {
      skipped.push({ path: normalizedPath, reason: "outside repository root" });
      continue;
    }

    try {
      await access(absolutePath, constants.R_OK);
      const linkStat = await lstat(absolutePath);
      if (linkStat.isSymbolicLink()) {
        skipped.push({ path: normalizedPath, reason: "symbolic link" });
        continue;
      }

      const fileStat = await stat(absolutePath);
      if (!fileStat.isFile()) {
        skipped.push({ path: normalizedPath, reason: "not a regular file" });
        continue;
      }

      if (fileStat.size > options.maxFileBytes) {
        skipped.push({ path: normalizedPath, reason: "file is too large" });
        continue;
      }

      const buffer = await readFile(absolutePath);
      if (isProbablyBinary(buffer)) {
        skipped.push({ path: normalizedPath, reason: "binary file" });
        continue;
      }

      files.push({
        path: normalizedPath,
        absolutePath,
        sizeBytes: fileStat.size,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      skipped.push({ path: normalizedPath, reason: `unreadable file: ${message}` });
    }
  }

  return {
    files,
    skipped,
  };
}

function normalizeRelativePath(relativePath: string): string {
  return relativePath.replaceAll("\\", "/").replace(/^\/+/, "");
}

function isPathInsideRoot(rootDir: string, absolutePath: string): boolean {
  const relative = path.relative(rootDir, absolutePath);
  return relative.length === 0 || (!relative.startsWith("..") && !path.isAbsolute(relative));
}
