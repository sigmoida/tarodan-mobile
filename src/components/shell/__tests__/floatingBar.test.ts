/**
 * Ana sayfa yüzen üst bar yardımcıları: liste üst boşluğu (iOS contentInset / Android padding).
 */
import { floatingBarScrollProps } from '../floatingBar';

describe('floatingBarScrollProps', () => {
  it('iOS: contentInset.top + başlangıç ofseti -inset + gösterge inset (padding yok)', () => {
    expect(floatingBarScrollProps(111, 'ios')).toMatchObject({
      contentInset: { top: 111 },
      contentOffset: { x: 0, y: -111 },
      scrollIndicatorInsets: { top: 111 },
      automaticallyAdjustContentInsets: false,
    });
    expect(floatingBarScrollProps(111, 'ios').contentContainerStyle).toBeUndefined();
  });

  it('Android: içerik paddingTop, inset yok', () => {
    const p = floatingBarScrollProps(111, 'android');
    expect(p.contentContainerStyle).toEqual({ paddingTop: 111 });
    expect(p.contentInset).toBeUndefined();
  });
});
