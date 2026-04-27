import { mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  discoverRagFiles,
  isProbablyBinary,
  shouldIndexPath,
} from "../../tools/rag/file-discovery";

const tempDirs: string[] = [];

describe("RAG file discovery", () => {
  afterEach(async () => {
    for (const tempDir of tempDirs.splice(0)) {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("filters noisy and secret paths before indexing", () => {
    expect(shouldIndexPath("src/app/app.ts")).toBeNull();
    expect(shouldIndexPath("docs/rag.md")).toBeNull();
    expect(shouldIndexPath(".env.example")).toBeNull();
    expect(shouldIndexPath(".env")).toBe("env file");
    expect(shouldIndexPath(".env.local")).toBe("env file");
    expect(shouldIndexPath("package-lock.json")).toBe("lockfile");
    expect(shouldIndexPath("certs/local.key")).toBe("secret or certificate file");
    expect(shouldIndexPath("image.png")).toBe("unsupported extension");
  });

  it("skips ignored-style candidates, binary files and large files", async () => {
    const rootDir = await mkdtemp(path.join(os.tmpdir(), "rag-discovery-"));
    tempDirs.push(rootDir);

    await writeFile(path.join(rootDir, "kept.ts"), "const x=1\n");
    await writeFile(path.join(rootDir, "binary.ts"), Buffer.from([0, 1, 2, 3]));
    await writeFile(path.join(rootDir, "large.md"), "x".repeat(32));
    await writeFile(path.join(rootDir, ".env"), "SECRET=value\n");

    const result = await discoverRagFiles({
      rootDir,
      maxFileBytes: 16,
      listFiles: async () => ["kept.ts", "binary.ts", "large.md", ".env"],
    });

    expect(result.files.map((file) => file.path)).toEqual(["kept.ts"]);
    expect(result.skipped).toEqual(
      expect.arrayContaining([
        { path: "binary.ts", reason: "binary file" },
        { path: "large.md", reason: "file is too large" },
        { path: ".env", reason: "env file" },
      ]),
    );
  });

  it("rejects symbolic links before reading file contents", async () => {
    const rootDir = await mkdtemp(path.join(os.tmpdir(), "rag-discovery-"));
    const externalDir = await mkdtemp(path.join(os.tmpdir(), "rag-external-"));
    tempDirs.push(rootDir, externalDir);

    const externalPath = path.join(externalDir, "leak.md");
    const linkedPath = path.join(rootDir, "linked.md");
    await writeFile(externalPath, "external content\n");

    try {
      await symlink(externalPath, linkedPath);
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code === "EPERM" || code === "EACCES") {
        return;
      }

      throw error;
    }

    const result = await discoverRagFiles({
      rootDir,
      maxFileBytes: 1024,
      listFiles: async () => ["linked.md"],
    });

    expect(result.files).toEqual([]);
    expect(result.skipped).toContainEqual({
      path: "linked.md",
      reason: "symbolic link",
    });
  });

  it("detects binary buffers", () => {
    expect(isProbablyBinary(Buffer.from("plain text\n"))).toBe(false);
    expect(isProbablyBinary(Buffer.from([65, 0, 66]))).toBe(true);
  });
});
