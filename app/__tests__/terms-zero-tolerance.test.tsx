/**
 * Apple 1.2: kullanım koşulları, uygunsuz içeriğe ve kötü niyetli kullanıcılara
 * SIFIR TOLERANS olduğunu açıkça söylemeli. Giriş/kayıt ekranları ve profil
 * menüsü bu statik ekranı açıyor.
 */
import { render } from '@testing-library/react-native';
import i18n from '@/i18n/config';

jest.mock('expo-router', () => ({ router: { back: jest.fn(), replace: jest.fn(), canGoBack: () => false } }));

import TermsOfServiceScreen from '../terms';

describe('Kullanım Koşulları — sıfır tolerans', () => {
  it.each(['tr', 'en'])('%s: sıfır tolerans, şikayet, engelleme ve 24 saat maddesini gösterir', async (lang) => {
    await i18n.changeLanguage(lang);
    const { getByText } = render(<TermsOfServiceScreen />);
    const text = getByText(i18n.t('termsPage.s10ZeroTolerance')).props.children as string;
    const needles =
      lang === 'tr'
        ? ['sıfır tolerans', 'Şikayet Et', 'Engelle', '24 saat']
        : ['zero tolerance', 'Report', 'Block', '24 hours'];
    for (const n of needles) expect(text).toContain(n);
  });
});
