import { resolveTilePath } from '../path';
import type { CategoryTileData } from '../groups';

const leaf = (id: string): CategoryTileData => ({ id, label: id, href: `/${id}`, visual: 'logo' });
const tree: CategoryTileData[] = [
  {
    id: 'a',
    label: 'a',
    visual: 'logo',
    children: [leaf('a1'), { id: 'a2', label: 'a2', visual: 'logo', children: [leaf('a2x')] }],
  },
  leaf('b'),
];

describe('resolveTilePath', () => {
  it('id yolunu güncel ağaçtaki kutulara çözer', () => {
    expect(resolveTilePath(tree, []).map((x) => x.id)).toEqual([]);
    expect(resolveTilePath(tree, ['a']).map((x) => x.id)).toEqual(['a']);
    expect(resolveTilePath(tree, ['a', 'a2']).map((x) => x.id)).toEqual(['a', 'a2']);
  });

  it('herhangi bir id bulunamazsa ya da yaprağa iniyorsa tüm yol sıfırlanır (köke dön)', () => {
    expect(resolveTilePath(tree, ['zzz'])).toEqual([]);
    expect(resolveTilePath(tree, ['a', 'yok'])).toEqual([]);
    expect(resolveTilePath(tree, ['b'])).toEqual([]);
  });
});
