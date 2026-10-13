import { SUGGESTIONS_MAX_HEIGHT, suggestionsMaxHeight } from '../_components/SearchSuggestions';

describe('suggestionsMaxHeight', () => {
  it('klavye kapalıyken büyük ekranda üst sınırı aşmaz', () => {
    expect(suggestionsMaxHeight(932, 0, 100)).toBe(SUGGESTIONS_MAX_HEIGHT);
  });

  it('klavye açıkken (SE 667pt, ~260pt klavye) panel klavyenin üstünde kalır', () => {
    const h = suggestionsMaxHeight(667, 260, 72);
    expect(h).toBeLessThan(SUGGESTIONS_MAX_HEIGHT);
    // bar + arama kutusu + boşluklar + panel + klavye ekrana sığar
    expect(72 + 48 + 32 + h + 260).toBeLessThanOrEqual(667);
  });

  it('çok kısa alanda bile en az ~2 satır kalır', () => {
    expect(suggestionsMaxHeight(480, 300, 100)).toBeGreaterThanOrEqual(120);
  });
});
