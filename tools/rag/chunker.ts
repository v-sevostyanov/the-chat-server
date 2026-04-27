import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import type { RagChunk, RagSourceFile } from "./types";

const MAX_CHUNK_CHARS = 1_500;
const CHUNK_OVERLAP_LINES = 8;

export async function chunkSourceFile(file: RagSourceFile): Promise<readonly RagChunk[]> {
  const content = await readFile(file.absolutePath, "utf8");
  return chunkText({
    path: file.path,
    text: content,
  });
}

export function chunkText(input: {
  readonly path: string;
  readonly text: string;
  readonly maxChunkChars?: number;
  readonly overlapLines?: number;
}): readonly RagChunk[] {
  const maxChunkChars = input.maxChunkChars ?? MAX_CHUNK_CHARS;
  const overlapLines = input.overlapLines ?? CHUNK_OVERLAP_LINES;
  const normalizedText = input.text.replace(/\r\n/g, "\n");
  const lines = normalizedText.split("\n");
  const chunks: RagChunk[] = [];

  let startIndex = 0;
  while (startIndex < lines.length) {
    let endIndex = startIndex;
    let currentLength = 0;

    while (endIndex < lines.length) {
      const nextLineLength = lines[endIndex].length + 1;
      if (endIndex > startIndex && currentLength + nextLineLength > maxChunkChars) {
        break;
      }

      currentLength += nextLineLength;
      endIndex += 1;
    }

    const chunkLines = trimEmptyEdges(lines.slice(startIndex, endIndex));
    if (chunkLines.lines.length > 0) {
      const startLine = startIndex + chunkLines.leadingTrim + 1;
      const endLine = endIndex - chunkLines.trailingTrim;
      const chunkTextValue = chunkLines.lines.join("\n");
      const contentHash = hashContent(chunkTextValue);

      chunks.push({
        id: createChunkId(input.path, startLine, endLine, contentHash),
        path: input.path,
        startLine,
        endLine,
        chunkText: chunkTextValue,
        contentHash,
      });
    }

    if (endIndex >= lines.length) {
      break;
    }

    startIndex = Math.max(endIndex - overlapLines, startIndex + 1);
  }

  return chunks;
}

function trimEmptyEdges(lines: readonly string[]): {
  readonly lines: readonly string[];
  readonly leadingTrim: number;
  readonly trailingTrim: number;
} {
  let start = 0;
  let end = lines.length;

  while (start < end && lines[start].trim().length === 0) {
    start += 1;
  }

  while (end > start && lines[end - 1].trim().length === 0) {
    end -= 1;
  }

  return {
    lines: lines.slice(start, end),
    leadingTrim: start,
    trailingTrim: lines.length - end,
  };
}

function hashContent(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

function createChunkId(
  relativePath: string,
  startLine: number,
  endLine: number,
  contentHash: string,
): string {
  return deterministicUuid(`${relativePath}:${startLine}:${endLine}:${contentHash}`);
}

function deterministicUuid(value: string): string {
  const hash = createHash("sha256").update(value).digest("hex");
  return [
    hash.slice(0, 8),
    hash.slice(8, 12),
    `4${hash.slice(13, 16)}`,
    ((Number.parseInt(hash.slice(16, 18), 16) & 0x3f) | 0x80)
      .toString(16)
      .padStart(2, "0") + hash.slice(18, 20),
    hash.slice(20, 32),
  ].join("-");
}
