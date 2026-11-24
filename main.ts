// worst-advice-entry1 — Worst AI Advice: The 48-Hour Tight Line Open.
//
// The program writes exactly one line of deliberately terrible AI advice to
// /output/entry.txt. The line is baked into this file as a constant, so every
// run produces byte-identical output: no clock, no randomness, no network, no
// environment input. A small validation layer checks the line against the
// competition gate (UTF-8 text, 1 to 140 characters, not only white space,
// exactly one line) before writing, and re-reads the file after writing to
// prove the bytes on disk are the bytes intended. A second check caps the
// whole payload, terminator included, at the same 140 characters, so the
// file the scorer reads can never drift past the gate by one byte.
//
// Determinism note: the only input to the output file is the constant below.
// Two runs on any machine, at any time, write the same 89 bytes, and the
// program exits non-zero rather than writing a line that fails the gate.
//
// The advice itself: a confident, tidy, plausibly-AI suggestion that is
// specific enough to follow and disastrous enough to regret. Deleting the
// operating system to save battery is concrete, immediately actionable, and
// obviously catastrophic — the joke lands in the first read, in one line,
// with no second line to explain it.

import * as fs from "node:fs";
import * as path from "node:path";

// ---------------------------------------------------------------------------
// The entry line. Keep it a single line, 1-140 characters, no trailing
// whitespace, no control characters. Counted by code points, as the gate
// counts characters.
// ---------------------------------------------------------------------------
const WORST_ADVICE_LINE =
  "To save battery, delete your operating system — your phone runs much lighter without it.";

// Gate limits from the competition rules.
const GATE_MIN_CHARS = 1;
const GATE_MAX_CHARS = 140;

// Output location mandated by the harness.
const OUTPUT_DIR = "/output";
const OUTPUT_FILE = "entry.txt";

// Distinctive run marker used in diagnostics only (never written to output).
const WORST_ADVICE_RUN_TAG = "worst-advice-entry1/v1";

// ---------------------------------------------------------------------------
// Character helpers. Code points, not UTF-16 units, so an em dash or an
// accented letter counts the way a human reader counts it.
// ---------------------------------------------------------------------------
function countCodePoints(worstAdviceText: string): number {
  const codePoints = Array.from(worstAdviceText);
  const counted = codePoints.length;
  return counted;
}

function hasVisibleGlyph(worstAdviceText: string): boolean {
  const visibleGlyphs = Array.from(worstAdviceText).filter(
    (worstAdviceGlyph) => worstAdviceGlyph.trim().length > 0,
  );
  const foundVisible = visibleGlyphs.length > 0;
  return foundVisible;
}

function containsLineBreak(worstAdviceText: string): boolean {
  const lineBreakPattern = /[\r\n\u2028\u2029]/;
  const foundBreak = lineBreakPattern.test(worstAdviceText);
  return foundBreak;
}

function containsControlGlyph(worstAdviceText: string): boolean {
  const controlPattern = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;
  const foundControl = controlPattern.test(worstAdviceText);
  return foundControl;
}

function hasEdgeWhiteSpace(worstAdviceText: string): boolean {
  const edgePattern = /^[ \t]|[ \t]$/;
  const foundEdge = edgePattern.test(worstAdviceText);
  return foundEdge;
}

// ---------------------------------------------------------------------------
// Gate result. A plain record carried in a named variable, never a bare
// null, so callers always inspect the same shape.
// ---------------------------------------------------------------------------
interface WorstAdviceGateReport {
  ok: boolean;
  charCount: number;
  payloadChars: number;
  singleLine: boolean;
  visible: boolean;
  freeOfControls: boolean;
  tidyEdges: boolean;
  failures: string[];
}

function emptyGateReport(charCount: number): WorstAdviceGateReport {
  const freshReport: WorstAdviceGateReport = {
    ok: false,
    charCount,
    payloadChars: 0,
    singleLine: true,
    visible: false,
    freeOfControls: true,
    tidyEdges: true,
    failures: [],
  };
  return freshReport;
}

function checkGate(worstAdviceText: string): WorstAdviceGateReport {
  const charCount = countCodePoints(worstAdviceText);
  const report = emptyGateReport(charCount);

  report.singleLine = containsLineBreak(worstAdviceText) === false;
  report.visible = hasVisibleGlyph(worstAdviceText);
  report.freeOfControls = containsControlGlyph(worstAdviceText) === false;
  report.tidyEdges = hasEdgeWhiteSpace(worstAdviceText) === false;
  report.payloadChars = countCodePoints(buildPayload(worstAdviceText));

  const failures: string[] = [];
  if (charCount < GATE_MIN_CHARS) {
    failures.push(
      `line is ${charCount} characters, below the minimum of ${GATE_MIN_CHARS}`,
    );
  }
  if (charCount > GATE_MAX_CHARS) {
    failures.push(
      `line is ${charCount} characters, above the maximum of ${GATE_MAX_CHARS}`,
    );
  }
  if (report.payloadChars > GATE_MAX_CHARS) {
    failures.push(
      `whole file is ${report.payloadChars} characters, above the maximum of ${GATE_MAX_CHARS}`,
    );
  }
  if (report.singleLine === false) {
    failures.push("line contains a line break, the gate requires one line");
  }
  if (report.visible === false) {
    failures.push("line is only white space, the gate requires visible text");
  }
  if (report.freeOfControls === false) {
    failures.push("line contains a control character");
  }
  if (report.tidyEdges === false) {
    failures.push("line starts or ends with white space");
  }

  report.failures = failures;
  report.ok = failures.length === 0;
  return report;
}

// ---------------------------------------------------------------------------
// Deterministic payload construction. The file holds the line plus exactly
// one trailing newline, which keeps the text a single line while ending the
// file cleanly. The gate counts characters of the text; the newline is the
// file terminator, not part of the advice.
// ---------------------------------------------------------------------------
function buildPayload(worstAdviceText: string): string {
  const payload = `${worstAdviceText}\n`;
  return payload;
}

function resolveOutputPath(): string {
  const joined = path.join(OUTPUT_DIR, OUTPUT_FILE);
  return joined;
}

function ensureOutputDir(outputDir: string): void {
  const dirExists = fs.existsSync(outputDir);
  if (dirExists === false) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
}

function writePayload(outputPath: string, payload: string): void {
  try { fs.writeFileSync(outputPath, payload, { encoding: "utf8" }); } catch (caughtWriteErr) {
    const writeErr = caughtWriteErr as Error;
    throw new Error(`failed to write ${outputPath}: ${writeErr.message}`);
  }
}

function readBackPayload(outputPath: string): string {
  try { const readBack = fs.readFileSync(outputPath, { encoding: "utf8" }); return readBack; } catch (caughtReadErr) {
    const readErr = caughtReadErr as Error;
    throw new Error(`failed to read back ${outputPath}: ${readErr.message}`);
  }
}

function verifyWrittenBytes(outputPath: string, expectedPayload: string): boolean {
  const onDisk = readBackPayload(outputPath);
  const matches = onDisk === expectedPayload;
  return matches;
}

// ---------------------------------------------------------------------------
// Diagnostics. Everything goes to stdout for the operator; the entry file
// itself carries only the advice line.
// ---------------------------------------------------------------------------
function describeGateReport(report: WorstAdviceGateReport): string {
  const lines: string[] = [];
  lines.push(`[${WORST_ADVICE_RUN_TAG}] gate check`);
  lines.push(`  characters : ${report.charCount}`);
  lines.push(`  payload    : ${report.payloadChars} chars incl. terminator`);
  lines.push(`  single line: ${report.singleLine}`);
  lines.push(`  visible    : ${report.visible}`);
  lines.push(`  no controls: ${report.freeOfControls}`);
  lines.push(`  tidy edges : ${report.tidyEdges}`);
  lines.push(`  verdict    : ${report.ok ? "PASS" : "FAIL"}`);
  for (const failure of report.failures) {
    lines.push(`  failure    : ${failure}`);
  }
  const description = lines.join("\n");
  return description;
}

// ---------------------------------------------------------------------------
// Main flow. Validate first, write second, verify third. Any failure aborts
// with a non-zero exit and a named reason; nothing half-written is left
// standing as a valid entry.
// ---------------------------------------------------------------------------
function runWorstAdviceEntry(): number {
  const gateReport = checkGate(WORST_ADVICE_LINE);
  console.log(describeGateReport(gateReport));
  console.log(`[${WORST_ADVICE_RUN_TAG}] line: ${WORST_ADVICE_LINE}`);

  if (gateReport.ok === false) {
    console.error(
      `[${WORST_ADVICE_RUN_TAG}] refusing to write: gate failed`,
    );
    return 1;
  }

  const payload = buildPayload(WORST_ADVICE_LINE);
  const outputPath = resolveOutputPath();

  ensureOutputDir(OUTPUT_DIR);
  writePayload(outputPath, payload);

  const verified = verifyWrittenBytes(outputPath, payload);
  if (verified === false) {
    console.error(
      `[${WORST_ADVICE_RUN_TAG}] read-back mismatch on ${outputPath}`,
    );
    return 2;
  }

  console.log(
    `[${WORST_ADVICE_RUN_TAG}] wrote ${outputPath} ` +
      `(${gateReport.charCount} chars, 1 line, verified)`,
  );
  return 0;
}

const exitCode = runWorstAdviceEntry();
process.exit(exitCode);
