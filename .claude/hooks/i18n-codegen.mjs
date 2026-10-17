#!/usr/bin/env node
// PostToolUse hook (Edit|Write|MultiEdit): after an edit to
// src/i18n/lib/catalog/*.json, in the repo that owns the edited file (main
// checkout or worktree):
//   1. regenerate src/i18n/lib/generated/keys.ts (`node scripts/gen-keys.mjs`);
//   2. compare the flattened tr.json and en.json key sets and report keys missing
//      on either side (expected briefly while editing one catalog, then the other).
// The result goes to Claude as additional context; a failing codegen blocks.
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

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
const emit = (obj) => process.stdout.write(JSON.stringify(obj));

const gen = spawnSync(process.execPath, ['scripts/gen-keys.mjs'], { cwd: root, encoding: 'utf8' });
const genOut = `${gen.stdout || ''}${gen.stderr || ''}`.trim();
if (gen.status !== 0) {
  // Most likely the catalog is temporarily invalid JSON mid-edit: tell Claude.
  emit({
    decision: 'block',
    reason: `node scripts/gen-keys.mjs failed after editing ${file}; fix the catalog (valid JSON) and rerun it.\n${genOut}`,
  });
  process.exit(0);
}

function flatten(obj, prefix = '', out = new Set()) {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) flatten(v, key, out);
    else out.add(key);
  }
  return out;
}

let parity = '';
try {
  const dir = join(root, 'src/i18n/lib/catalog');
  const tr = flatten(JSON.parse(readFileSync(join(dir, 'tr.json'), 'utf8')));
  const en = flatten(JSON.parse(readFileSync(join(dir, 'en.json'), 'utf8')));
  const onlyTr = [...tr].filter((k) => !en.has(k));
  const onlyEn = [...en].filter((k) => !tr.has(k));
  const list = (keys) => keys.slice(0, 20).join(', ') + (keys.length > 20 ? ` (+${keys.length - 20} more)` : '');
  if (onlyTr.length || onlyEn.length) {
    parity =
      'tr/en key parity: MISMATCH.' +
      (onlyTr.length ? ` Missing in en.json (${onlyTr.length}): ${list(onlyTr)}.` : '') +
      (onlyEn.length ? ` Missing in tr.json (${onlyEn.length}): ${list(onlyEn)}.` : '') +
      ' Add the missing keys before committing (catalog-integrity test fails otherwise).';
  } else {
    parity = `tr/en key parity: OK (${tr.size} keys).`;
  }
} catch (e) {
  parity = `tr/en key parity: not checked (${e.message}).`;
}

emit({
  hookSpecificOutput: {
    hookEventName: 'PostToolUse',
    additionalContext: `i18n: regenerated src/i18n/lib/generated/keys.ts (node scripts/gen-keys.mjs). ${parity}`,
  },
});
