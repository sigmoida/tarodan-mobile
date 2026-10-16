import { LEGAL_WEB_DOCS } from '@/lib/legal/webDocs';
import { ICON_PATHS } from '@/ui/icons/icon-paths.generated';
import { DEFAULT_DRAWER_ICON, drawerIconFor } from '../drawerIcons';

describe('drawerIconFor — Bilgi & Yasal', () => {
  const icons = LEGAL_WEB_DOCS.map((doc) => drawerIconFor(`legal-${doc}`));

  it('her yasal belgenin ikonu farklı (hepsi varsayılan ikona düşmüyor)', () => {
    expect(new Set(icons).size).toBe(LEGAL_WEB_DOCS.length);
  });

  it('her ikon ikon setinde var', () => {
    for (const name of [...icons, DEFAULT_DRAWER_ICON]) {
      expect(ICON_PATHS).toHaveProperty(name);
    }
  });
});
