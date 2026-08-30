import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '../../..');
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

/** Safe-area'yı elle sabitleyen dosyalar — hepsi insets'e taşındı. */
const MIGRATED = [
  'app/(tabs)/_lib/styles.ts',
  'app/(tabs)/_lib/searchStyles.ts',
  'app/(tabs)/_lib/profileStyles.ts',
  'app/product/[id]/_components/ProductTopBar.tsx',
  'app/messages/[threadId]/_lib/styles.ts',
  'src/components/listing/_lib/styles.ts',
  'app/collections/[id]/_lib/collectionStyles.ts',
  'app/product/[id]/_modals/ImageViewerModal.tsx',
];

describe('safe-area disiplini', () => {
  it.each(MIGRATED)('%s içinde sabit 50pt üst boşluk kalmadı', (rel) => {
    const src = read(rel);
    expect(src).not.toMatch(/paddingTop:\s*50\b/);
    expect(src).not.toMatch(/\btop:\s*50\b/);
  });
});
