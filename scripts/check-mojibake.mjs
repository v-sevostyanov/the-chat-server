import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();

const ignoredDirectories = new Set([
  ".git",
  ".idea",
  "dist",
  "node_modules",
]);

const checkedExtensions = new Set([
  ".cjs",
  ".js",
  ".json",
  ".md",
  ".mjs",
  ".sql",
  ".svg",
  ".ts",
  ".yaml",
  ".yml",
]);

const suspiciousPatterns = [
  {
    name: "replacement-character",
    regex: /\uFFFD/u,
  },
  {
    name: "latin-cyrillic-mojibake",
    regex: /[\u00D0\u00D1]/u,
  },
  {
    name: "windows-1251-quote-mojibake",
    regex: /\u0432\u0402/u,
  },
  {
    name: "cyrillic-mojibake",
    regex: /\u0420[\u0402\u040F\u0452\u00B5]/u,
  },
];

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (ignoredDirectories.has(entry.name)) {
        continue;
      }

      files.push(...(await collectFiles(path.join(directory, entry.name))));
      continue;
    }

    if (entry.isFile() && checkedExtensions.has(path.extname(entry.name))) {
      files.push(path.join(directory, entry.name));
    }
  }

  return files;
}

function findMojibake(content) {
  const findings = [];
  const lines = content.split(/\r?\n/u);

  lines.forEach((line, index) => {
    for (const pattern of suspiciousPatterns) {
      if (pattern.regex.test(line)) {
        findings.push({
          line,
          lineNumber: index + 1,
          pattern: pattern.name,
        });
        break;
      }
    }
  });

  return findings;
}

const files = await collectFiles(root);
const allFindings = [];

for (const file of files) {
  const content = await readFile(file, "utf8");
  const findings = findMojibake(content);

  for (const finding of findings) {
    allFindings.push({
      ...finding,
      file: path.relative(root, file),
    });
  }
}

if (allFindings.length > 0) {
  console.error("Potential mojibake markers found:");

  for (const finding of allFindings) {
    console.error(
      `${finding.file}:${finding.lineNumber} [${finding.pattern}] ${finding.line}`,
    );
  }

  process.exitCode = 1;
}
