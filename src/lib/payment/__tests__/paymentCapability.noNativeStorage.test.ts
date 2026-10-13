/**
 * AsyncStorage native modülü yokken yalnız bellek (`paymentCapability.ts`).
 *
 * Bu dosyada AsyncStorage BİLEREK mock'lanmıyor: Jest'te gerçek paket import
 * anında "NativeModule: AsyncStorage is null" fırlatır — bozuk kurulumdaki
 * cihazla aynı durum. Belirteç deposu bunu yakalayıp bellekle devam etmeli;
 * `@/lib/api` barrel'ı da yüklenmeye devam etmeli.
 */
import {
  __resetPaymentCapabilities,
  paymentCapabilityHeaders,
  rememberPaymentCapability,
} from '../paymentCapability';

const PAY = 'pay-1';

it('paket import anında fırlatıyor (ön koşul)', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  expect(() => require('@react-native-async-storage/async-storage')).toThrow(/AsyncStorage is null/);
});

it('belirteç bellekte tutulur; süreç yeniden başlayınca (depo yok) kaybolur, hiçbir çağrı fırlatmaz', async () => {
  __resetPaymentCapabilities();
  await rememberPaymentCapability({ data: { paymentId: PAY, paymentAccessToken: 'cap-token' } });
  expect(await paymentCapabilityHeaders(PAY)).toEqual({ 'X-Payment-Capability': 'cap-token' });

  __resetPaymentCapabilities();
  expect(await paymentCapabilityHeaders(PAY)).toEqual({});
});
