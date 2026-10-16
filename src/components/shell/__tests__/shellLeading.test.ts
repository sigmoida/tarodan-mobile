import { isProfileTabRoot, shellLeadingAction } from '../shellLeading';

describe('shellLeadingAction — sekme kökünün sol düğmesi', () => {
  it('Profil sekme kökü → yan menü (☰)', () => {
    expect(shellLeadingAction(['(tabs)', 'profile'])).toBe('menu');
    expect(isProfileTabRoot(['(tabs)', 'profile'])).toBe(true);
  });

  it.each([
    ['Ana Sayfa', ['(tabs)']],
    ['Favoriler', ['(tabs)', 'favorites']],
    ['Sepet', ['(tabs)', 'cart']],
    ['İlan Ver', ['(tabs)', 'sell']],
  ])('%s → kategoriler', (_name, segments) => {
    expect(shellLeadingAction(segments)).toBe('categories');
    expect(isProfileTabRoot(segments)).toBe(false);
  });

  it('sekme dışı / bilinmeyen segment → kategoriler (varsayılan)', () => {
    expect(shellLeadingAction(['profile'])).toBe('categories');
    expect(shellLeadingAction(['settings', 'profile'])).toBe('categories');
    expect(shellLeadingAction([])).toBe('categories');
    expect(shellLeadingAction(undefined)).toBe('categories');
    expect(shellLeadingAction(null)).toBe('categories');
  });
});
