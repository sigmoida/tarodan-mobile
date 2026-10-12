import { isHeroInView } from '../heroVisibility';

const base = { viewportHeight: 800, top: 100, height: 400 };

describe('isHeroInView', () => {
  it('ölçüm yoksa görünür sayılır (ilk boyama)', () => {
    expect(isHeroInView({ scrollY: 0, viewportHeight: 0, top: 0, height: 0 })).toBe(true);
    expect(isHeroInView({ scrollY: 500, viewportHeight: 800, top: 0, height: 0 })).toBe(true);
  });
  it('tepede: tamamen görünür', () => {
    expect(isHeroInView({ ...base, scrollY: 0 })).toBe(true);
  });
  it('yarısından azı kalınca görünmez; yarısı kalırken hâlâ görünür', () => {
    // hero [100,500]; scrollY=300 → görünen [300,500] = 200 = tam %50
    expect(isHeroInView({ ...base, scrollY: 300 })).toBe(true);
    expect(isHeroInView({ ...base, scrollY: 301 })).toBe(false);
  });
  it('aşağı kaydırılmış: hero tamamen üstte kaldı', () => {
    expect(isHeroInView({ ...base, scrollY: 2000 })).toBe(false);
  });
  it('hero görünür alanın altında kaldıysa görünmez', () => {
    expect(isHeroInView({ viewportHeight: 300, top: 1000, height: 400, scrollY: 0 })).toBe(false);
  });
});
