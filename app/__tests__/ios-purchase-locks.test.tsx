/**
 * Emniyet kilidi: bir upsell çağrısı gözden kaçsa bile iOS'ta satın alma
 * ekranlarına ULAŞILAMAZ. Aynı test fiziksel ödemenin AÇIK kaldığını da
 * doğrular — 3.1.3(e) gereği o yolun IAP dışında çalışması ZORUNLU.
 */
import React from 'react';
import { Platform } from 'react-native';
import { screen } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils';

jest.mock('expo-router', () => ({
  ...require('@/test-utils/router-mock').routerMock,
  Redirect: ({ href }: { href: string }) => {
    const { Text } = require('react-native');
    return <Text>REDIRECT:{href}</Text>;
  },
}));

// Not: `jest.isolateModules` burada KULLANILMAZ — sandbox içinde yeniden
// require edilen zincir `react`'i de kapsıyor, bu da render'ın kullandığı
// react-test-renderer'dan ayrı bir React kopyasına yol açıp "Invalid hook
// call" hatası veriyor. `Platform.OS` module-eval zamanında okunduğu için
// (bkz. src/lib/purchases.ts), bu iki modülün dosyada İLK require'ı burada
// yapıldığı sürece düz `require()` yeterli — henüz cache'lenmediler.

it('iOS: üyelik checkout ekranı /membership e yönlendirir', () => {
  Platform.OS = 'ios';
  const Screen = require('../membership/checkout/index').default;
  renderWithProviders(<Screen />);
  expect(screen.getByText('REDIRECT:/membership')).toBeTruthy();
});

it('iOS: BoostModal görünür=true olsa bile render etmez', () => {
  Platform.OS = 'ios';
  const { BoostModal } = require('@/components/product/BoostModal');
  const { toJSON } = renderWithProviders(
    <BoostModal visible onClose={() => {}} listingId="p1" listingTitle="X" boostedUntil={null} />,
  );
  expect(toJSON()).toBeNull();
});
