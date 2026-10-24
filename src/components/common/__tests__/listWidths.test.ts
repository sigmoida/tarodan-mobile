/**
 * Inventory: every `PageShell mode="list"` screen states its large-screen width (src/ui/CLAUDE.md ›
 * Large screens). A row list wraps its list's `contentContainerStyle` in `useReadableContentStyle`
 * (the shell defaults to `readable`); a card grid or media screen passes `contentWidth="full"`.
 * A list-mode file that does neither would draw a readable skeleton above a full-width list.
 */
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '../../../..');

/** List-mode files whose list lives in a child component that applies the width itself. */
const LIST_IN_CHILD: Record<string, string> = {
  // MessageList wraps its content style in useReadableContentStyle.
  'app/messages/[threadId]/index.tsx': 'app/messages/[threadId]/_components/MessageList.tsx',
};
/** Files the scan matches that render no list of their own. */
const NO_LIST = [
  // Empty state only.
  'src/components/product/ProductNotFound.tsx',
  // The grid itself; it names PageShell list mode in its docs. Its screens pass `full`.
  'src/components/product/ProductGrid.tsx',
];

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '__tests__') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) sourceFiles(full, out);
    else if (entry.name.endsWith('.tsx')) out.push(full);
  }
  return out;
}

const rel = (f: string) => path.relative(ROOT, f).split(path.sep).join('/');
const read = (f: string) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const listFiles = [...sourceFiles(path.join(ROOT, 'app')), ...sourceFiles(path.join(ROOT, 'src/components'))]
  .map(rel)
  .filter((f) => /mode="list"/.test(read(f)) && /<PageShell\b/.test(read(f)));

describe('list-mode screen widths', () => {
  it('finds the list-mode screens (the scan works)', () => {
    expect(listFiles.length).toBeGreaterThan(15);
  });

  it('each list-mode screen is readable (useReadableContentStyle) or explicitly full', () => {
    const undecided = listFiles.filter((f) => {
      if (NO_LIST.includes(f)) return false;
      const src = read(f) + (LIST_IN_CHILD[f] ? read(LIST_IN_CHILD[f]) : '');
      const full = /contentWidth="full"/.test(src);
      const readable = /useReadableContentStyle\(/.test(src);
      return full === readable;
    });
    expect(undecided).toEqual([]);
  });

  it('the card grid and media screens stay full width', () => {
    for (const f of [
      'app/search/index.tsx',
      'app/category/[slug]/index.tsx',
      'app/collections/index.tsx',
      'app/models/[slug]/index.tsx',
      'app/product/[id]/index.tsx',
      'src/components/catalog/EntityProductsScreen.tsx',
    ]) {
      expect([f, /contentWidth="full"/.test(read(f))]).toEqual([f, true]);
    }
  });
});
