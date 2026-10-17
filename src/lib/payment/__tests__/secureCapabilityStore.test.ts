/**
 * Ödeme yetki belirteci SecureStore'da (`secureCapabilityStore.ts`): dizin kaydıyla
 * listeleme, AsyncStorage'daki eski kayıtların taşınıp SİLİNMESİ, ve `paymentCapability`
 * ile uçtan uca kalıcılık (yeniden başlatmada belirteç SecureStore'dan gelir).
 */
const mockSecure = new Map<string, string>();
jest.mock('expo-secure-store', () => ({
  AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY: 'AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY',
  getItemAsync: jest.fn(async (k: string) => (mockSecure.has(k) ? mockSecure.get(k)! : null)),
  setItemAsync: jest.fn(async (k: string, v: string) => {
    mockSecure.set(k, v);
  }),
  deleteItemAsync: jest.fn(async (k: string) => {
    mockSecure.delete(k);
  }),
}));
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import {
  CAPABILITY_INDEX_KEY,
  createSecureCapabilityStore,
} from '../secureCapabilityStore';
import {
  __resetPaymentCapabilities,
  __setPaymentCapabilityStoreFactory,
  paymentCapabilityHeaders,
  rememberPaymentCapability,
  sweepExpiredPaymentCapabilities,
} from '../paymentCapability';

const live = (token: string) => JSON.stringify({ token, expiresAt: Date.now() + 60_000, storedAt: Date.now(), owner: null });

beforeEach(async () => {
  mockSecure.clear();
  await AsyncStorage.clear();
  jest.clearAllMocks();
  __setPaymentCapabilityStoreFactory(null); // üretimdeki gibi: SecureStore deposu
  __resetPaymentCapabilities();
});

describe('createSecureCapabilityStore', () => {
  it('yazım SecureStore\'a (yalnız bu cihaz erişimiyle) gider, dizine girer; silme dizinden çıkarır', async () => {
    const store = createSecureCapabilityStore()!;
    await store.setItem('payment-capability.p1', 'v1');
    await store.setItem('payment-capability.p2', 'v2');
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('payment-capability.p1', 'v1', {
      keychainAccessible: 'AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY',
    });
    expect(await store.getAllKeys()).toEqual(['payment-capability.p1', 'payment-capability.p2']);
    expect(await store.multiGet(['payment-capability.p1'])).toEqual([['payment-capability.p1', 'v1']]);

    await store.removeItem('payment-capability.p1');
    expect(await store.getAllKeys()).toEqual(['payment-capability.p2']);
    await store.multiRemove(['payment-capability.p2']);
    expect(await store.getAllKeys()).toEqual([]);
    expect(mockSecure.has(CAPABILITY_INDEX_KEY)).toBe(false);
  });

  it('eşzamanlı yazımlar dizini ezmez', async () => {
    const store = createSecureCapabilityStore()!;
    await Promise.all(['a', 'b', 'c'].map((id) => store.setItem(`payment-capability.${id}`, id)));
    expect([...(await store.getAllKeys())].sort()).toEqual([
      'payment-capability.a',
      'payment-capability.b',
      'payment-capability.c',
    ]);
  });

  it('geçiş: AsyncStorage\'daki eski kayıtlar SecureStore\'a taşınır ve AsyncStorage\'dan SİLİNİR', async () => {
    await AsyncStorage.setItem('payment-capability.old', live('cap-old'));
    await AsyncStorage.setItem('tarodan-cart', '{"items":[]}');
    const store = createSecureCapabilityStore()!;

    const migrated = await store.getItem('payment-capability.old');
    expect(JSON.parse(migrated!).token).toBe('cap-old');
    expect(await store.getAllKeys()).toEqual(['payment-capability.old']);
    expect(await AsyncStorage.getItem('payment-capability.old')).toBeNull();
    // Başka kayıtlara dokunulmaz.
    expect(await AsyncStorage.getItem('tarodan-cart')).toBe('{"items":[]}');
  });

  it('geçiş: SecureStore\'daki daha yeni kayıt ezilmez; eski düz metin yine silinir', async () => {
    mockSecure.set('payment-capability.p', 'new');
    await AsyncStorage.setItem('payment-capability.p', 'old');
    const store = createSecureCapabilityStore()!;
    expect(await store.getItem('payment-capability.p')).toBe('new');
    expect(await AsyncStorage.getItem('payment-capability.p')).toBeNull();
  });

  it('geçiş: SecureStore yazımı başarısız olsa da düz metin kopya bırakılmaz', async () => {
    await AsyncStorage.setItem('payment-capability.p', 'old');
    (SecureStore.setItemAsync as jest.Mock).mockRejectedValueOnce(new Error('keychain'));
    const store = createSecureCapabilityStore()!;
    await store.getAllKeys();
    expect(await AsyncStorage.getItem('payment-capability.p')).toBeNull();
  });
});

describe('paymentCapability + SecureStore (üretim bağlantısı)', () => {
  it('belirteç SecureStore\'da kalıcı: yeniden başlatmada başlık gelir; AsyncStorage\'a yazılmaz', async () => {
    await rememberPaymentCapability({ data: { paymentId: 'pay-1', paymentAccessToken: 'cap-token' } });
    expect(mockSecure.has('payment-capability.pay-1')).toBe(true);
    expect(await AsyncStorage.getAllKeys()).toEqual([]);

    __resetPaymentCapabilities(); // uygulama yeniden başladı
    expect(await paymentCapabilityHeaders('pay-1', { guest: true })).toEqual({ 'X-Payment-Capability': 'cap-token' });
  });

  it('eski sürümden kalan AsyncStorage belirteci geçişle kullanılabilir kalır, düz metni silinir', async () => {
    await AsyncStorage.setItem('payment-capability.pay-2', live('cap-2'));
    expect(await paymentCapabilityHeaders('pay-2', { guest: true })).toEqual({ 'X-Payment-Capability': 'cap-2' });
    expect(await AsyncStorage.getItem('payment-capability.pay-2')).toBeNull();
  });

  it('açılış süpürmesi süresi dolmuş SecureStore kaydını ve dizin girdisini siler', async () => {
    mockSecure.set('payment-capability.exp', JSON.stringify({ token: 't', expiresAt: Date.now() - 1, owner: null }));
    mockSecure.set(CAPABILITY_INDEX_KEY, JSON.stringify(['payment-capability.exp']));
    await sweepExpiredPaymentCapabilities();
    expect(mockSecure.has('payment-capability.exp')).toBe(false);
    expect(mockSecure.has(CAPABILITY_INDEX_KEY)).toBe(false);
  });
});
