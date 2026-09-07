/**
 * iOS: misafir Profil sekmesi — hardcoded (çeviriye hiç girmeyen) "Premium
 * Üyelik" kartı, "Aylık sadece ₺99" fiyatı ve "Premium Ol" düğmesi Guideline
 * 3.1.1 ihlaliydi (CRITICAL 1, final code review). Reviewer'ın göreceği
 * İKİNCİ ekran (misafir Profil sekmesi).
 *
 * KRİTİK NOKTA: bu metin hiçbir zaman `t(...)`'den geçmedi — JSX'e SERT
 * KODLANMIŞTI. `react-i18next`'i anahtar yankılayan bir mock'a bağlayan
 * süitler (ör. ios-no-digital-sales.test.tsx) böyle bir sızıntıya karşı
 * KÖRDÜR: mock zaten metnin kaynağına bakmaz. Bu yüzden bu dosya
 * `react-i18next`'i MOCK'LAMIYOR — `jest.setup.ts`'teki gerçek tr kataloğu
 * devrede — ve regex iddiası component ağacının TAMAMINI tarıyor.
 *
 * Android eşi: android-guest-profile.test.tsx.
 */
import React from 'react';
import { render, screen } from '@testing-library/react-native';

jest.mock('@/lib/purchases', () => ({
  ...jest.requireActual('@/lib/purchases'),
  CAN_BUY_DIGITAL: false,
}));

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => false) },
}));

import { ProfileGuestView } from '../_components/ProfileGuestView';

const f: any = {
  snackbarVisible: false,
  setSnackbarVisible: jest.fn(),
  snackbarMessage: '',
  showPrompt: false,
  setShowPrompt: jest.fn(),
  promptType: 'favorites',
};

describe('iOS: misafir Profil sekmesi — Premium kartı kapalı', () => {
  it('hardcoded fiyat/tier metni HİÇBİR yerde render edilmiyor', () => {
    render(<ProfileGuestView f={f} />);
    // Kartın kendi testID'si yok; en güçlü iddia tüm ağaçta regex taraması.
    // ₺ işareti, "TL/ay" kalıbı veya "Premium" kelimesi ekranın hiçbir
    // yerinde geçmemeli.
    const tree = screen.toJSON();
    const serialized = JSON.stringify(tree);
    expect(serialized).not.toMatch(/₺|TL\s*\/\s*ay|Premium/i);
  });

  it('düğme ve promo metinleri açıkça yok', () => {
    render(<ProfileGuestView f={f} />);
    expect(screen.queryByText('Premium Üyelik')).toBeNull();
    expect(screen.queryByText('₺99')).toBeNull();
    expect(screen.queryByText('Aylık sadece')).toBeNull();
    expect(screen.queryByText('Premium Ol')).toBeNull();
  });

  it('geri kalan misafir içeriği hâlâ render ediliyor (ekran gerçekten çizildi)', () => {
    render(<ProfileGuestView f={f} />);
    expect(screen.getByText('Giriş Yap')).toBeTruthy();
    expect(screen.getByText('Ücretsiz Üye Ol')).toBeTruthy();
  });
});
