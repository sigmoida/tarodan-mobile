import {
  TAB_BAR_INITIAL_STATE,
  TAB_BAR_SCROLL_THRESHOLD,
  TAB_BAR_TOP_ZONE,
  TAB_BAR_MIN_SCROLL_RANGE,
  reduceTabBarScroll,
  shouldExpandOnMeasure,
  type TabBarScrollState,
} from '../tabBarScroll';

const MAX = 2000;

/** Ofset dizisini sırayla uygular, her adımdaki `collapsed` değerlerini döner. */
function run(ys: number[], start: TabBarScrollState = TAB_BAR_INITIAL_STATE, maxY = MAX) {
  let s = start;
  return ys.map((y) => {
    s = reduceTabBarScroll(s, y, maxY);
    return s.collapsed;
  });
}

describe('reduceTabBarScroll — daralma durum makinesi', () => {
  it('liste başında hep açık', () => {
    expect(run([0, 5, TAB_BAR_TOP_ZONE])).toEqual([false, false, false]);
  });

  it('eşikten küçük aşağı kaydırma daraltmaz', () => {
    // Liste başından (anchor 0) 20pt, sonra 23pt'ye: eşik (24) altında.
    expect(run([TAB_BAR_TOP_ZONE + 1, 20, TAB_BAR_SCROLL_THRESHOLD - 1])).toEqual([false, false, false]);
  });

  it('eşik kadar aşağı kaydırınca daraltır', () => {
    const out = run([20, 30, TAB_BAR_SCROLL_THRESHOLD]);
    expect(out[out.length - 1]).toBe(true);
  });

  it('daralmışken küçük yukarı kaydırma (< eşik) açmaz; eşik kadar yukarı açar', () => {
    const collapsed = reduceTabBarScroll(TAB_BAR_INITIAL_STATE, 100, MAX);
    const down = reduceTabBarScroll(collapsed, 200, MAX);
    expect(down.collapsed).toBe(true);
    const small = reduceTabBarScroll(down, 200 - (TAB_BAR_SCROLL_THRESHOLD - 1), MAX);
    expect(small.collapsed).toBe(true);
    const big = reduceTabBarScroll(small, 200 - TAB_BAR_SCROLL_THRESHOLD, MAX);
    expect(big.collapsed).toBe(false);
  });

  it('titreme yok: küçük yön salınımları durumu çevirmez', () => {
    // Aşağı kaydırıp daralt, sonra +-10pt zikzak.
    const states = run([100, 130, 140, 130, 140, 130, 142, 132, 144]);
    expect(states[1]).toBe(true);
    expect(states.slice(1).every(Boolean)).toBe(true);
  });

  it('liste başına dönünce (<= TOP_ZONE) eşik beklemeden açar', () => {
    const s = run([300, 400, 10]);
    expect(s).toEqual([true, true, false]);
  });

  it('üst bounce (negatif ofset / pull-to-refresh) açık kalır', () => {
    expect(run([-30, -80, -10, 0])).toEqual([false, false, false, false]);
  });

  it('alt bounce: sınırı aşan ofset ve geri dönüş yanlış açma/daraltma üretmez', () => {
    const s0 = reduceTabBarScroll(TAB_BAR_INITIAL_STATE, MAX - 100, MAX);
    const down = reduceTabBarScroll(s0, MAX, MAX);
    // zaten daralmamış: bottom'a kadar eşik aşıldı => daralır
    expect(down.collapsed).toBe(true);
    const over = reduceTabBarScroll(down, MAX + 60, MAX);
    const back = reduceTabBarScroll(over, MAX + 10, MAX);
    const settle = reduceTabBarScroll(back, MAX, MAX);
    expect([over.collapsed, back.collapsed, settle.collapsed]).toEqual([true, true, true]);
  });

  it('kısa içerikte (kaydırma payı yok) hep açık', () => {
    expect(run([0, 10, 30, 50], TAB_BAR_INITIAL_STATE, 30)).toEqual([false, false, false, false]);
  });

  it('dışarıdan sıfırlanan (sekme değişimi) collapsed=false ile yeni kaydırma eşikten başlar', () => {
    const stale: TabBarScrollState = { collapsed: false, anchor: 500, lastY: 800 };
    // Aşağı devam: anchor 500'den >= eşik uzak => hemen daraltır (kullanıcı zaten aşağı gidiyor).
    expect(reduceTabBarScroll(stale, 810, MAX).collapsed).toBe(true);
    // Yukarı: yön değişir, anchor = 800; eşik içinde açık kalır.
    expect(reduceTabBarScroll(stale, 790, MAX).collapsed).toBe(false);
  });

  it('programatik yukarı sıçrama (scrollToTop) açar', () => {
    const down = run([100, 400, 900]);
    expect(down[2]).toBe(true);
    const s = reduceTabBarScroll({ collapsed: true, anchor: 900, lastY: 900 }, 0, MAX);
    expect(s.collapsed).toBe(false);
  });
});

describe('shouldExpandOnMeasure — kaydırma olayı gelmeyen içerik değişimleri', () => {
  it('kısa içerik (kaydırma payı < MIN) => açılır', () => {
    expect(shouldExpandOnMeasure(700, 800, 300)).toBe(true);
    expect(shouldExpandOnMeasure(800 + TAB_BAR_MIN_SCROLL_RANGE - 1, 800, 300)).toBe(true);
  });

  it('içerik küçülüp ekrana sığınca (öğe silme) açılır', () => {
    // Önce uzun liste, aşağıda daraltılmış...
    expect(shouldExpandOnMeasure(3000, 800, 900)).toBe(false);
    // ...sonra silinince içerik 760'a düştü.
    expect(shouldExpandOnMeasure(760, 800, 900)).toBe(true);
  });

  it('liste başındaysa (yeni ScrollView 0\'dan başlar) uzun içerikte de açılır', () => {
    expect(shouldExpandOnMeasure(3000, 800, 0)).toBe(true);
    expect(shouldExpandOnMeasure(3000, 800, TAB_BAR_TOP_ZONE)).toBe(true);
  });

  it('uzun içerik + aşağıda => açılmaz (daralma korunur)', () => {
    expect(shouldExpandOnMeasure(3000, 800, TAB_BAR_TOP_ZONE + 1)).toBe(false);
  });
});
