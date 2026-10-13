/**
 * B4 inceleme 4 · Çerez politikası native: web'deki metin aynı katalog
 * anahtarlarıyla (`@/lib/legal/cookies`) `LegalDocument` içinde çizilir.
 * WebView yok (site menüsü/altbilgisi, tarayıcı tercih paneli, siteyi gezme
 * yok), çevrimdışı açılır, dil uygulama dilini izler. İletişimde web'deki
 * yer tutucu telefon değil künyedeki gerçek telefon.
 */
import React from 'react';
import { render } from '@testing-library/react-native';
import i18n from '@/i18n/config';
import { LEGAL_ENTITY } from '@/constants/legalFacts';
import { isLegalTextPath } from '@/lib/shared/legalConsent';

jest.mock('expo-router', () => ({ router: { back: jest.fn(), replace: jest.fn(), canGoBack: () => false } }));

const mockWebView = jest.fn((_props: unknown) => null);
jest.mock('react-native-webview', () => ({ WebView: (props: unknown) => mockWebView(props) }));

import CookiePolicyScreen from '../cookies';

afterAll(() => i18n.changeLanguage('tr'));

/** Liste maddesi "Etiket: metin" tek Text olarak çizilir; metni içerdiği yerden ara. */
const containing = (text: string) => new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

const SECTION_TITLES = [
  'legal.cookies.page.s1Title',
  'legal.cookies.page.s2Title',
  'legal.cookies.page.s3Title',
  'legal.cookies.page.s4Title',
  'legal.cookies.page.s5Title',
  'legal.cookies.page.s6Title',
  'legal.cookies.page.s7Title',
] as const;

describe('Çerez politikası (native)', () => {
  it.each(['tr', 'en'])('%s: web metninin yedi bölümü uygulama dilinde, WebView yok', async (lang) => {
    await i18n.changeLanguage(lang);
    const { getByText, getByTestId } = render(<CookiePolicyScreen />);

    expect(getByText(i18n.t('legal.cookiesTitle'))).toBeTruthy();
    expect(
      getByText(`${i18n.t('legal.lastUpdated')}: ${i18n.t('legal.cookies.page.lastUpdatedValue')}`),
    ).toBeTruthy();
    SECTION_TITLES.forEach((key) => expect(getByText(i18n.t(key))).toBeTruthy());
    expect(getByTestId('legal-cookies-notice')).toHaveTextContent(i18n.t('legal.cookiesAppNote'));
    expect(mockWebView).not.toHaveBeenCalled();
  });

  it('web metni birebir: vurgu etiketleri düşer, tablolar ve notlar korunur', async () => {
    await i18n.changeLanguage('tr');
    const { getByText, queryByText } = render(<CookiePolicyScreen />);
    expect(getByText(i18n.t('legal.cookies.page.s1p2').replace(/<\/?b>/g, ''))).toBeTruthy();
    expect(queryByText(/<b>/)).toBeNull();
    expect(getByText(i18n.t('legal.cookies.page.s5Note'))).toBeTruthy();
    expect(getByText(i18n.t('legal.cookies.page.retentionTrafficType'))).toBeTruthy();
    expect(getByText(i18n.t('legal.cookies.page.scopeKvkkCriterion'))).toBeTruthy();
    expect(getByText(/policies\.google\.com\/privacy/)).toBeTruthy();
  });

  it('iletişim künyeden: gerçek telefon ve e-posta, yer tutucu telefon yok', async () => {
    await i18n.changeLanguage('tr');
    const { getByText, queryByText } = render(<CookiePolicyScreen />);
    expect(getByText(containing(LEGAL_ENTITY.phone))).toBeTruthy();
    expect(getByText(containing(LEGAL_ENTITY.email))).toBeTruthy();
    expect(queryByText(/XXX/)).toBeNull();
  });

  it('tarayıcı tercih paneli yok (kaydet / tümünü kabul et düğmeleri çizilmez)', async () => {
    await i18n.changeLanguage('tr');
    const { queryByText, getByText } = render(<CookiePolicyScreen />);
    expect(queryByText(i18n.t('legal.savePreferences'))).toBeNull();
    expect(queryByText(i18n.t('legal.acceptAll'))).toBeNull();
    // Kategoriler bilgi olarak listelenir.
    expect(getByText(containing(i18n.t('legal.cookies.necessaryDesc')))).toBeTruthy();
  });

  it('en: başlık, not ve etiketler İngilizce; bağlayıcı belge gövdesi Türkçe (web gibi)', async () => {
    await i18n.changeLanguage('en');
    const { getByText } = render(<CookiePolicyScreen />);
    // Arayüz metni çevrilir.
    expect(getByText('1. What Is a Cookie?')).toBeTruthy();
    expect(getByText(`${i18n.t('legal.lastUpdated')}: August 2, 2026`)).toBeTruthy();
    expect(getByText(containing(`Email: ${LEGAL_ENTITY.email}`))).toBeTruthy();
    expect(getByText(containing(`Phone: ${LEGAL_ENTITY.phone}`))).toBeTruthy();
    expect(getByText(/^Stored Data: IP adresi/)).toBeTruthy();
    expect(getByText(/^Logs within the scope of Law No\. 5651/)).toBeTruthy();
    expect(getByText(/^Important: If you block strictly necessary cookies/)).toBeTruthy();
    // Gövde Türkçe kalır.
    expect(getByText(/^Çerezler, web siteleri tarafından/)).toBeTruthy();
  });

  it('rota yasal metin yolu olarak kalır (onay kapısı bu sayfada gizlenir)', () => {
    expect(isLegalTextPath('/cookies')).toBe(true);
  });
});
