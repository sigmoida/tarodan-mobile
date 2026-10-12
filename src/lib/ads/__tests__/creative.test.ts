jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

import { hasAdCreative, hasAdImage } from '../creative';
import { renderableHotspots } from '../hotspots';

describe('hasAdImage / hasAdCreative — tek predicate', () => {
  it('yalnız boşluk içeren imageUrl görsel reklam sayılmaz', () => {
    expect(hasAdImage({ imageUrl: '   ' })).toBe(false);
    expect(hasAdImage({ imageUrl: '' })).toBe(false);
    expect(hasAdImage({ imageUrl: null })).toBe(false);
    expect(hasAdImage({ imageUrl: ' https://x/a.png ' })).toBe(true);
  });

  it('çizilebilir: görsel ya da başlık', () => {
    expect(hasAdCreative({ imageUrl: '  ', title: '' })).toBe(false);
    expect(hasAdCreative({ imageUrl: '  ', title: 'Duyuru' })).toBe(true);
    expect(hasAdCreative({ imageUrl: 'https://x/a.png', title: '' })).toBe(true);
  });

  it('boşluk imageUrl’li reklamda hotspot da yok', () => {
    expect(
      renderableHotspots({
        imageUrl: '   ',
        hotspots: [{ id: 'h', x: 0, y: 0, width: 1, height: 1, label: '', linkUrl: '/faq', sortOrder: 0 }],
      }),
    ).toEqual([]);
  });
});
