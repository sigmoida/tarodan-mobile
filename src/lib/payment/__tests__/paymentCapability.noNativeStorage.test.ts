/**
 * SecureStore native modülü yokken yalnız bellek (`paymentCapability.ts`).
 *
 * `expo-secure-store` bu dosyada import anında fırlatır — bozuk kurulumdaki cihazla aynı
 * durum. Belirteç deposu bunu yakalayıp bellekle devam etmeli; `@/lib/api` barrel'ı da
 * yüklenmeye devam etmeli. Belirteç düz metin AsyncStorage'a DÜŞMEMELİ.
 */
jest.mock('expo-secure-store', () => {
  throw new Error("Cannot find native module 'ExpoSecureStore'");
});
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  __resetPaymentCapabilities,
  paymentCapabilityHeaders,
  rememberPaymentCapability,
} from '../paymentCapability';

const PAY = 'pay-1';

it('paket import anında fırlatıyor (ön koşul)', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  expect(() => require('expo-secure-store')).toThrow(/ExpoSecureStore/);
});

it('belirteç bellekte tutulur; süreç yeniden başlayınca (depo yok) kaybolur, hiçbir çağrı fırlatmaz', async () => {
  __resetPaymentCapabilities();
  await rememberPaymentCapability({ data: { paymentId: PAY, paymentAccessToken: 'cap-token' } });
  expect(await paymentCapabilityHeaders(PAY)).toEqual({ 'X-Payment-Capability': 'cap-token' });

  __resetPaymentCapabilities();
  expect(await paymentCapabilityHeaders(PAY)).toEqual({});
  // SecureStore yok diye düz metin depoya yazılmadı.
  expect(await AsyncStorage.getAllKeys()).toEqual([]);
});
