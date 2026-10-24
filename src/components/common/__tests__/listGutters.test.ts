/**
 * Inventory: every `PageShell mode="list"` screen gives its own list the tablet gutter
 * (src/ui/CLAUDE.md › Large screens). The shell cannot pad a child's list, so the list wraps its
 * `contentContainerStyle` in `usePageContentStyle` (or reads `usePageGutter` / `pageGutter`) itself,
 * or renders a shared list that does (`ProductGrid`). A list-mode file that does none of these would
 * hug the screen edge on tablets while every other screen keeps the wider gutter.
 */
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '../../../..');

/** List-mode files whose list lives in a child component that applies the gutter itself. */
const LIST_IN_CHILD: Record<string, string> = {
  'app/messages/[threadId]/_components/MessageThreadView.tsx': 'app/messages/[threadId]/_components/MessageList.tsx',
  'app/product/[id]/index.tsx': 'app/product/[id]/_components/ProductBodyLayout.tsx',
};
/** Files the scan matches that render no list of their own. */
const NO_LIST = [
  // Empty state only.
  'src/components/product/ProductNotFound.tsx',
];

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '__tests__') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) sourceFiles(full, out);
    else if (/\.tsx?$/.test(entry.name)) out.push(full);
  }
  return out;
}

const rel = (f: string) => path.relative(ROOT, f).split(path.sep).join('/');
const read = (f: string) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const listFiles = [...sourceFiles(path.join(ROOT, 'app')), ...sourceFiles(path.join(ROOT, 'src/components'))]
  .map(rel)
  .filter((f) => /mode="list"/.test(read(f)) && /<PageShell\b/.test(read(f)));

const GUTTER = /usePageContentStyle\(|usePageGutter\(|pageGutter\(|<ProductGrid\b/;

describe('list-mode screen gutters', () => {
  it('finds the list-mode screens (the scan works)', () => {
    expect(listFiles.length).toBeGreaterThan(15);
  });

  it('each list-mode screen gives its list the tablet gutter', () => {
    const missing = listFiles.filter((f) => {
      if (NO_LIST.includes(f)) return false;
      const src = read(f) + (LIST_IN_CHILD[f] ? read(LIST_IN_CHILD[f]) : '');
      return !GUTTER.test(src);
    });
    expect(missing).toEqual([]);
  });
});
