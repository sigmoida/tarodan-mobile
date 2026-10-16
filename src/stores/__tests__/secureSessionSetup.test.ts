/**
 * Açılış güvenli depo hazırlığı:
 * - iOS yeniden kurulum: anahtar zinciri silinmez, AsyncStorage silinir → işaretsiz + boş
 *   AsyncStorage = yeni kurulum → bayat token'lar ve kullanıcı görüntüsü silinir;
 * - bu sürüme güncelleyen kurulum (işaret yok ama AsyncStorage dolu) oturumunu KORUR;
 * - iOS erişilebilirlik göçü: eski öğeler silinip `SECURE_STORE_OPTIONS` ile yeniden yazılır.
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import * as SecureStore from 'expo-secure-store';
import { getSessionEpoch } from '@/lib/api/sessionState';
import {
  SECURE_STORE_OPTIONS,
  readAccessToken,
  readRefreshToken,
  resetTokenStorageForTests,
  writeTokenPair,
} from '@/lib/api/tokenStorage';
import {
  INSTALL_MARKER_KEY,
  INSTALL_PENDING_KEY,
  KEYCHAIN_ACCESSIBILITY_MARKER_KEY,
  migrateKeychainAccessibility,
  prepareSecureSession,
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
  removeItem: async (k) => {
    storage.delete(k);
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
  it('yeniden kurulum (işaret yok, AsyncStorage boş): saklı oturum silinir, işaret konur, kuşak ilerler', async () => {
    seedSession();
    const epoch = getSessionEpoch();
    await expect(wipeSessionIfReinstalled(markerStorage)).resolves.toBe('wiped');
    expect(vault.size).toBe(0);
    expect(storage.has(INSTALL_MARKER_KEY)).toBe(true);
    expect(storage.has(INSTALL_PENDING_KEY)).toBe(false);
    // Eski oturumun kuyruktaki yazımları (kuşak korumalı) düşer.
    expect(getSessionEpoch()).toBe(epoch + 1);
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

  it('silme düşerse çözülmedi: işaret konmaz, "bekliyor" kalır', async () => {
    seedSession();
    secure.deleteItemAsync.mockImplementationOnce(() => Promise.reject(new Error('locked')));
    await expect(wipeSessionIfReinstalled(markerStorage)).resolves.toBe('unresolved');
    expect(storage.has(INSTALL_MARKER_KEY)).toBe(false);
    expect(storage.has(INSTALL_PENDING_KEY)).toBe(true);
  });

  it('"bekliyor" kaydı varsa AsyncStorage dolmuş olsa da sonraki açılış yine aday sayar (upgrade değil)', async () => {
    seedSession();
    storage.set(INSTALL_PENDING_KEY, '1');
    storage.set('tarodan-cart', '{}');
    await expect(wipeSessionIfReinstalled(markerStorage)).resolves.toBe('wiped');
    expect(vault.size).toBe(0);
    expect(storage.has(INSTALL_PENDING_KEY)).toBe(false);
  });
});

describe('prepareSecureSession', () => {
  beforeEach(() => resetTokenStorageForTests());
  afterAll(() => resetTokenStorageForTests());

  it('kontrol çözülmezse bu açılışta saklı oturum YOK sayılır; giriş yeni çift yazınca çözülür', async () => {
    const asyncStorageModule = require('@react-native-async-storage/async-storage');
    const asyncStorage = asyncStorageModule.default ?? asyncStorageModule;
    await asyncStorage.clear();
    seedSession();
    secure.deleteItemAsync.mockImplementationOnce(() => Promise.reject(new Error('locked')));

    await prepareSecureSession();

    // Okumalar bayat oturumu görmez.
    await expect(readAccessToken()).resolves.toBeNull();
    await expect(readRefreshToken()).resolves.toBeNull();
    expect(await asyncStorage.getItem(INSTALL_PENDING_KEY)).toBe('1');

    // Bu kurulumun kullanıcısı giriş yaptı: yeni çift yazıldı → kontrol çözüldü.
    await writeTokenPair({ accessToken: 'new-at', refreshToken: 'new-rt' });
    await new Promise((r) => setTimeout(r, 0));
    await expect(readAccessToken()).resolves.toBe('new-at');
    expect(await asyncStorage.getItem(INSTALL_MARKER_KEY)).not.toBeNull();
    expect(await asyncStorage.getItem(INSTALL_PENDING_KEY)).toBeNull();
  });

  it('okumalar hazırlık bitene kadar bekler (yeniden kurulumda bayat token hiç görülmez)', async () => {
    const asyncStorageModule = require('@react-native-async-storage/async-storage');
    const asyncStorage = asyncStorageModule.default ?? asyncStorageModule;
    await asyncStorage.clear();
    seedSession();
    let releaseDelete!: () => void;
    secure.deleteItemAsync.mockImplementationOnce(
      (k: string) =>
        new Promise<void>((resolve) => {
          releaseDelete = () => {
            vault.delete(k);
            resolve();
          };
        }),
    );

    const prep = prepareSecureSession();
    const read = readAccessToken();
    await new Promise((r) => setTimeout(r, 0));
    releaseDelete();
    await prep;

    await expect(read).resolves.toBeNull();
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
