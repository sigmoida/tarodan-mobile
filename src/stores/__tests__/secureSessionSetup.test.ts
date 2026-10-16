/**
 * Açılış güvenli depo hazırlığı:
 * - iOS yeniden kurulum: anahtar zinciri silinmez, AsyncStorage silinir → işaretsiz + boş
 *   AsyncStorage = yeni kurulum → bayat token'lar ve kullanıcı görüntüsü silinir;
 * - bu sürüme güncelleyen kurulum (işaret yok ama AsyncStorage dolu) oturumunu KORUR;
 * - iOS erişilebilirlik göçü: eski öğeler silinip `SECURE_STORE_OPTIONS` ile yeniden yazılır.
 */
import * as SecureStore from 'expo-secure-store';
import { SECURE_STORE_OPTIONS } from '@/lib/api/tokenStorage';
import {
  INSTALL_MARKER_KEY,
  KEYCHAIN_ACCESSIBILITY_MARKER_KEY,
  migrateKeychainAccessibility,
  wipeSessionIfReinstalled,
  type MarkerStorage,
} from '../secureSessionSetup';
import { USER_SNAPSHOT_KEY } from '../userSnapshot';

const secure = SecureStore as unknown as {
  getItemAsync: jest.Mock;
  setItemAsync: jest.Mock;
  deleteItemAsync: jest.Mock;
};

let vault: Map<string, string>;
let storage: Map<string, string>;

const markerStorage: MarkerStorage = {
  getItem: async (k) => storage.get(k) ?? null,
  setItem: async (k, v) => {
    storage.set(k, v);
  },
  getAllKeys: async () => [...storage.keys()],
};

const seedSession = () => {
  vault.set('accessToken', 'at');
  vault.set('refreshToken', 'rt');
  vault.set(USER_SNAPSHOT_KEY, '{"id":"u1"}');
};

beforeEach(() => {
  jest.clearAllMocks();
  vault = new Map();
  storage = new Map();
  secure.getItemAsync.mockImplementation((k: string) => Promise.resolve(vault.get(k) ?? null));
  secure.setItemAsync.mockImplementation((k: string, v: string) => {
    vault.set(k, v);
    return Promise.resolve();
  });
  secure.deleteItemAsync.mockImplementation((k: string) => {
    vault.delete(k);
    return Promise.resolve();
  });
});

afterAll(() => {
  secure.getItemAsync.mockImplementation(() => Promise.resolve(null));
  secure.setItemAsync.mockImplementation(() => Promise.resolve());
  secure.deleteItemAsync.mockImplementation(() => Promise.resolve());
});

describe('wipeSessionIfReinstalled', () => {
  it('yeniden kurulum (işaret yok, AsyncStorage boş): saklı oturum silinir, işaret konur', async () => {
    seedSession();
    await expect(wipeSessionIfReinstalled(markerStorage)).resolves.toBe('wiped');
    expect(vault.size).toBe(0);
    expect(storage.has(INSTALL_MARKER_KEY)).toBe(true);
  });

  it('güncellenen kurulum (işaret yok ama AsyncStorage dolu): oturum KORUNUR', async () => {
    seedSession();
    storage.set('tarodan-cart', '{}');
    await expect(wipeSessionIfReinstalled(markerStorage)).resolves.toBe('upgrade');
    expect(vault.get('accessToken')).toBe('at');
    expect(storage.has(INSTALL_MARKER_KEY)).toBe(true);
  });

  it('işaretli kurulum: hiçbir şeye dokunulmaz', async () => {
    seedSession();
    storage.set(INSTALL_MARKER_KEY, '1');
    await expect(wipeSessionIfReinstalled(markerStorage)).resolves.toBe('known-install');
    expect(vault.size).toBe(3);
    expect(secure.deleteItemAsync).not.toHaveBeenCalled();
  });

  it('silme düşerse işaret konmaz (sonraki açılış yeniden dener)', async () => {
    seedSession();
    secure.deleteItemAsync.mockImplementationOnce(() => Promise.reject(new Error('locked')));
    await expect(wipeSessionIfReinstalled(markerStorage)).resolves.toBe('unknown');
    expect(storage.has(INSTALL_MARKER_KEY)).toBe(false);
  });
});

describe('migrateKeychainAccessibility', () => {
  it('var olan öğeler silinip yeni erişilebilirlikle yeniden yazılır; işaret konur', async () => {
    seedSession();
    await expect(migrateKeychainAccessibility(markerStorage)).resolves.toBe(true);
    for (const [key, value] of [
      ['accessToken', 'at'],
      ['refreshToken', 'rt'],
      [USER_SNAPSHOT_KEY, '{"id":"u1"}'],
    ]) {
      expect(secure.deleteItemAsync).toHaveBeenCalledWith(key);
      expect(secure.setItemAsync).toHaveBeenCalledWith(key, value, SECURE_STORE_OPTIONS);
      expect(vault.get(key)).toBe(value);
    }
    expect(storage.has(KEYCHAIN_ACCESSIBILITY_MARKER_KEY)).toBe(true);
  });

  it('anahtar zinciri okunamazsa (kilitli) hiçbir şey silinmez, işaret konmaz', async () => {
    seedSession();
    secure.getItemAsync.mockImplementationOnce(() => Promise.reject(new Error('locked')));
    await expect(migrateKeychainAccessibility(markerStorage)).resolves.toBe(false);
    expect(vault.size).toBe(3);
    expect(storage.has(KEYCHAIN_ACCESSIBILITY_MARKER_KEY)).toBe(false);
  });

  it('yeni seçenekle yazılamazsa değer eski hâliyle geri konur (oturum kaybolmaz)', async () => {
    seedSession();
    secure.setItemAsync.mockImplementationOnce(() => Promise.reject(new Error('write failed')));
    await expect(migrateKeychainAccessibility(markerStorage)).resolves.toBe(false);
    expect(vault.get('accessToken')).toBe('at');
    expect(storage.has(KEYCHAIN_ACCESSIBILITY_MARKER_KEY)).toBe(false);
  });

  it('göç bir kez yapılır', async () => {
    storage.set(KEYCHAIN_ACCESSIBILITY_MARKER_KEY, '1');
    seedSession();
    await migrateKeychainAccessibility(markerStorage);
    expect(secure.setItemAsync).not.toHaveBeenCalled();
  });
});
