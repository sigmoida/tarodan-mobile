#!/usr/bin/env node
// PostToolUse hook (Edit|Write|MultiEdit): after an edit to
// src/i18n/lib/catalog/*.json, regenerate src/i18n/lib/generated/keys.ts with
// `node scripts/gen-keys.mjs` in the repo that owns the edited file (main
// checkout or worktree). Reports the result to Claude as additional context.
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

let input = {};
try {
  input = JSON.parse(readFileSync(0, 'utf8') || '{}');
} catch {
  process.exit(0);
}
const file = String((input.tool_input || {}).file_path || '').replace(/\\/g, '/');
const m = file.match(/^(.*)\/src\/i18n\/lib\/catalog\/[^/]+\.json$/);
if (!m) process.exit(0);

const root = m[1];
const r = spawnSync(process.execPath, ['scripts/gen-keys.mjs'], { cwd: root, encoding: 'utf8' });
const out = `${r.stdout || ''}${r.stderr || ''}`.trim();

if (r.status === 0) {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PostToolUse',
        additionalContext: `i18n: regenerated src/i18n/lib/generated/keys.ts (node scripts/gen-keys.mjs). ${out}`.trim(),
      },
    }),
  );
} else {
  // Most likely the catalog is temporarily invalid JSON mid-edit: tell Claude.
  process.stdout.write(
    JSON.stringify({
      decision: 'block',
      reason: `node scripts/gen-keys.mjs failed after editing ${file}; fix the catalog (valid JSON, tr/en parity) and rerun it.\n${out}`,
    }),
  );
}
