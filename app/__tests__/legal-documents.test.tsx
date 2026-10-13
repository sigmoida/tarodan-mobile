/**
 * B3 · Yasal metinlerin güncelliği: mobil gizlilik/KVKK, kullanım koşulları ve
 * mesafeli satış sayfaları web'deki yürürlükteki metni (aynı katalog anahtarları,
 * `@/lib/legal/*` = web `_lib` kopyası) gösterir; eski "Ocak 2026" metni kalktı.
 */
import { render } from '@testing-library/react-native';
import { StyleSheet, Text } from 'react-native';
import { theme } from '@/ui';
import i18n from '@/i18n/config';

jest.mock('expo-router', () => ({ router: { back: jest.fn(), replace: jest.fn(), canGoBack: () => false } }));

import PrivacyScreen from '../privacy';
import TermsScreen from '../terms';
import DistanceSalesScreen from '../distance-sales';
import { LEGAL_ENTITY } from '@/constants/legalFacts';

afterAll(() => i18n.changeLanguage('tr'));

describe('yasal metinler web ile aynı', () => {
  it.each(['tr', 'en'])('%s: gizlilik = web KVKK aydınlatma metni (veri sorumlusu künyesiyle)', async (lang) => {
    await i18n.changeLanguage(lang);
    const { getByText, getAllByText, queryByText } = render(<PrivacyScreen />);
    expect(getByText(i18n.t('legal.privacy.kisiselVerilerinKorunmasinaIliskinAydinlatmaMetni'))).toBeTruthy();
    expect(getByText(i18n.t('legal.privacy.pageFooter'))).toBeTruthy();
    expect(getAllByText(LEGAL_ENTITY.legalName).length).toBeGreaterThan(0);
    expect(queryByText(i18n.t('legalContact.lastUpdatedJan2026'))).toBeNull();
  });

  it.each(['tr', 'en'])('%s: kullanım koşulları web sürümü (yürürlük notu) + Apple 1.2 eki', async (lang) => {
    await i18n.changeLanguage(lang);
    const { getByText } = render(<TermsScreen />);
    expect(getByText(i18n.t('legal.terms.tarodanPlatformKullanimKosullari'))).toBeTruthy();
    expect(getByText(i18n.t('legal.terms.pageFooter'))).toBeTruthy();
    expect(getByText(i18n.t('legal.appContentRulesTitle'))).toBeTruthy();
  });

  it('tr: koşulların yürürlük tarihi web ile aynı (5 Ağustos 2026)', async () => {
    await i18n.changeLanguage('tr');
    const { getByText } = render(<TermsScreen />);
    expect(getByText(/5 Ağustos 2026/)).toBeTruthy();
  });

  it.each(['tr', 'en'])('%s: mesafeli satış = web ön bilgilendirme + sözleşme metni', async (lang) => {
    await i18n.changeLanguage(lang);
    const { getByText, getAllByText } = render(<DistanceSalesScreen />);
    expect(getByText(i18n.t('legal.distanceSales.pageFooter'))).toBeTruthy();
    // Siparişe özel alanlar web'deki ifadeyle gösterilir.
    expect(getAllByText(i18n.t('legal.fieldStatedInOrder')).length).toBeGreaterThan(0);
  });

  it('paragraf tipografisi tasarım token\'larından (CLAUDE.md §2)', async () => {
    await i18n.changeLanguage('tr');
    const { UNSAFE_getAllByType } = render(<PrivacyScreen />);
    const { fontSize, lineHeight } = theme.typography;
    const styles = UNSAFE_getAllByType(Text).map((n) => StyleSheet.flatten(n.props.style) ?? {});
    const paragraphs = styles.filter((st) => st.fontSize === fontSize.sm && st.lineHeight !== undefined);
    expect(paragraphs.length).toBeGreaterThan(0);
    paragraphs.forEach((st) => expect(st.lineHeight).toBe(fontSize.sm * lineHeight.normal));
    expect(styles.some((st) => st.lineHeight === 22)).toBe(false);
  });
});
