#!/usr/bin/env node
/**
 * Extract every ```python and ```typescript fenced block from every cookbook
 * MDX file. All blocks from the same file are concatenated into one module,
 * so cross-block references (e.g. a constant declared in block 1 reused in
 * block 2) keep working without per-block scaffolding.
 *
 * Output layout under `<out>/`:
 *   python/<file-stem>.py
 *   typescript/<file-stem>.ts
 *
 * Files with zero blocks of a language are skipped.
 *
 * Usage: node scripts/check-examples/extract.mjs <cookbook_dir> <out_dir>
 */

import { readdirSync, readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join, basename, extname, resolve } from "node:path";

const [cookbookDir, outDir] = process.argv.slice(2);
if (!cookbookDir || !outDir) {
  console.error("Usage: extract.mjs <cookbook_dir> <out_dir>");
  process.exit(2);
}

rmSync(outDir, { recursive: true, force: true });
mkdirSync(join(outDir, "python"), { recursive: true });
mkdirSync(join(outDir, "typescript"), { recursive: true });

const FENCE_RE = /^(\s*)```(python|typescript|ts|py)\s*$/i;
const END_RE = /^\s*```\s*$/;
const SKIP_MARKER = "# docs-examples-ci: skip";
const SKIP_MARKER_TS = "// docs-examples-ci: skip";

function langKey(label) {
  const l = label.toLowerCase();
  if (l === "python" || l === "py") return "python";
  return "typescript";
}

/**
 * Cookbook blocks frequently repeat imports at the top of each section for
 * readability. Concatenating verbatim produces duplicate identifiers and
 * "Cannot redeclare" errors. This helper:
 *
 *   1. Removes import statements from each block.
 *   2. Aggregates {A, B} + {B, C} from the same source into {A, B, C}.
 *   3. Emits the merged imports at the top of the joined file.
 *
 * Handles common patterns only — TS `import { ... } from "..."` named imports
 * and bare `import "..."` side-effect imports; Python `from X import A, B`
 * and `import X as Y`. Anything more exotic (default imports, namespace
 * imports, conditional imports) passes through unchanged.
 */
function joinBlocks(blocks, lang) {
  const sep = lang === "python"
    ? "\n\n# --- next block ---\n\n"
    : "\n\n// --- next block ---\n\n";

  const namedTsRe = /^\s*import\s*\{([^}]+)\}\s*from\s*["']([^"']+)["'];?\s*$/;
  const bareTsRe = /^\s*import\s+["']([^"']+)["'];?\s*$/;
  const defaultOrNsTsRe = /^\s*import\s+\S.*from\s*["']([^"']+)["'];?\s*$/;

  const namedPyRe = /^\s*from\s+([\w.]+)\s+import\s+(.+?)\s*$/;
  const aliasPyRe = /^\s*import\s+(\S.+?)\s*$/;

  const namedImports = new Map(); // source → Set of symbols
  const bareImports = new Set(); // source paths only
  const otherImports = []; // verbatim lines that we couldn't merge

  function processImportLine(line) {
    const trimmed = line.trimEnd();
    if (lang === "typescript") {
      const named = trimmed.match(namedTsRe);
      if (named) {
        const symbols = named[1].split(",").map((s) => s.trim()).filter(Boolean);
        const src = named[2];
        if (!namedImports.has(src)) namedImports.set(src, new Set());
        for (const s of symbols) namedImports.get(src).add(s);
        return true;
      }
      if (bareTsRe.test(trimmed)) {
        bareImports.add(trimmed);
        return true;
      }
      if (defaultOrNsTsRe.test(trimmed)) {
        otherImports.push(trimmed);
        return true;
      }
    } else {
      const named = trimmed.match(namedPyRe);
      if (named) {
        const src = named[1];
        const symbols = named[2].split(",").map((s) => s.trim()).filter(Boolean);
        if (!namedImports.has(src)) namedImports.set(src, new Set());
        for (const s of symbols) namedImports.get(src).add(s);
        return true;
      }
      if (aliasPyRe.test(trimmed)) {
        otherImports.push(trimmed);
        return true;
      }
    }
    return false;
  }

  function isImportStart(line) {
    return /^\s*(?:import|from)\s/.test(line);
  }

  const cleanedBlocks = blocks.map((block) =>
    block
      .split("\n")
      .filter((line) => (isImportStart(line) ? !processImportLine(line) : true))
      .join("\n")
      .replace(/^\n+/, ""),
  );

  const importLines = [];
  for (const src of bareImports) importLines.push(src);
  for (const line of dedupe(otherImports)) importLines.push(line);
  for (const [src, symbols] of namedImports) {
    if (lang === "typescript") {
      importLines.push(`import { ${[...symbols].join(", ")} } from "${src}";`);
    } else {
      importLines.push(`from ${src} import ${[...symbols].join(", ")}`);
    }
  }

  const header = importLines.length > 0 ? importLines.join("\n") + "\n\n" : "";
  return header + cleanedBlocks.join(sep);
}

function dedupe(arr) {
  return [...new Set(arr)];
}

function extractFromFile(filePath) {
  const text = readFileSync(filePath, "utf8");
  const lines = text.split("\n");
  const collected = { python: [], typescript: [] };
  let current = null;
  let indent = "";
  let buffer = [];
  for (const line of lines) {
    if (!current) {
      const m = line.match(FENCE_RE);
      if (m) {
        indent = m[1] ?? "";
        current = langKey(m[2]);
        buffer = [];
      }
      continue;
    }
    if (END_RE.test(line)) {
      // Strip the leading indent that wraps the whole block (e.g. JSX <Tab> children).
      const block = buffer
        .map((l) => (indent && l.startsWith(indent) ? l.slice(indent.length) : l))
        .join("\n");
      const isSkipped =
        (current === "python" && block.includes(SKIP_MARKER)) ||
        (current === "typescript" && block.includes(SKIP_MARKER_TS));
      if (!isSkipped) collected[current].push(block);
      current = null;
      buffer = [];
      continue;
    }
    buffer.push(line);
  }
  return collected;
}

let pythonWritten = 0;
let typescriptWritten = 0;
const files = readdirSync(cookbookDir)
  .filter((f) => f.endsWith(".mdx"))
  .sort();

for (const f of files) {
  const stem = basename(f, extname(f));
  if (stem === "index") continue;
  const blocks = extractFromFile(join(cookbookDir, f));
  if (blocks.python.length > 0) {
    writeFileSync(
      join(outDir, "python", `${stem}.py`),
      `# Extracted from ${f} by extract.mjs — do not edit.\n${joinBlocks(blocks.python, "python")}\n`,
    );
    pythonWritten += 1;
  }
  if (blocks.typescript.length > 0) {
    writeFileSync(
      join(outDir, "typescript", `${stem}.ts`),
      `// Extracted from ${f} by extract.mjs — do not edit.\n${joinBlocks(blocks.typescript, "typescript")}\n`,
    );
    typescriptWritten += 1;
  }
}

console.log(
  `extracted: python=${pythonWritten} typescript=${typescriptWritten} ` +
    `(out=${resolve(outDir)})`,
);
