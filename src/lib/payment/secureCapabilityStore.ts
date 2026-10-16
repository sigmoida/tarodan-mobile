/**
 * Ödeme yetki belirteçlerinin KALICI deposu — `expo-secure-store` (iOS Keychain / Android
 * Keystore ile şifreli SharedPreferences). `paymentCapability.ts` bunu `KeyValueStore`
 * arayüzüyle kullanır.
 *
 * Neden: belirteç misafirin ödemesine (durum, direct-form, verify, confirm-failed) yetki
 * veren bir JWT. Eskiden AsyncStorage'da (şifresiz SQLite / dosya) duruyordu; root'lu /
 * yedeği alınmış cihazda okunabilirdi. SecureStore değerleri cihaza bağlı anahtarla
 * şifrelenir; Android'de yedekten de hariç (`expo-secure-store` config eklentisinin yedek
 * kuralları), iOS'ta `*_THIS_DEVICE_ONLY` ile başka cihaza/yedeğe taşınmaz.
 *
 * SecureStore anahtar listelemez: kayıtlı ödeme anahtarları ayrı bir dizin kaydında
 * (`payment-capability-index`) tutulur. Dizini değiştiren işlemler sıraya alınır (aynı anda
 * iki yazım birbirinin güncellemesini ezmesin).
 *
 * Geçiş: ilk kullanımda AsyncStorage'daki eski `payment-capability.*` kayıtları SecureStore'a
 * taşınır (SecureStore'da daha yeni kayıt varsa ezilmez) ve AsyncStorage'dan SİLİNİR —
 * taşınamasa bile (belirteç kısa ömürlü; düz metin kopyası bırakılmaz).
 */

export type KeyValueStore = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<unknown>;
  removeItem(key: string): Promise<unknown>;
  getAllKeys(): Promise<readonly string[]>;
  multiGet(keys: readonly string[]): Promise<readonly (readonly [string, string | null])[]>;
  multiRemove(keys: readonly string[]): Promise<unknown>;
};

/** Eski AsyncStorage anahtar öneki (ve SecureStore'daki anahtarlar — aynı ad). */
export const LEGACY_CAPABILITY_PREFIX = 'payment-capability.';
/** SecureStore'daki kayıtlı anahtarların dizini (ön ekle başlamaz: kendisi listelenmez). */
export const CAPABILITY_INDEX_KEY = 'payment-capability-index';

type SecureStoreModule = typeof import('expo-secure-store');
type LegacyStore = Pick<KeyValueStore, 'getAllKeys' | 'multiGet' | 'multiRemove'>;

function loadSecureStore(): SecureStoreModule | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('expo-secure-store') as SecureStoreModule;
    return typeof mod?.getItemAsync === 'function' ? mod : null;
  } catch {
    return null;
  }
}

function loadLegacyStore(): LegacyStore | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('@react-native-async-storage/async-storage');
    return (mod?.default ?? mod ?? null) as LegacyStore | null;
  } catch {
    return null;
  }
}

/**
 * SecureStore destekli depo; native modül yoksa `null` (çağıran yalnız bellekle sürer).
 * `legacy`: yalnız testler için (varsayılan AsyncStorage).
 */
export function createSecureCapabilityStore(
  legacy: LegacyStore | null | undefined = undefined,
): KeyValueStore | null {
  const secure = loadSecureStore();
  if (!secure) return null;
  // Yalnız bu cihazda, ilk kilit açılışından sonra okunabilir (3DS için banka uygulamasına
  // geçip dönerken de); yedeğe / başka cihaza taşınmaz.
  const writeOptions = { keychainAccessible: secure.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY };

  let queue: Promise<unknown> = Promise.resolve();
  const serial = <T>(fn: () => Promise<T>): Promise<T> => {
    const run = queue.then(fn, fn);
    queue = run.catch(() => undefined);
    return run;
  };

  const readIndex = async (): Promise<string[]> => {
    const raw = await secure.getItemAsync(CAPABILITY_INDEX_KEY);
    try {
      const parsed = JSON.parse(raw ?? '[]') as unknown;
      return Array.isArray(parsed) ? parsed.filter((k): k is string => typeof k === 'string') : [];
    } catch {
      return [];
    }
  };
  const writeIndex = (keys: readonly string[]) =>
    keys.length > 0
      ? secure.setItemAsync(CAPABILITY_INDEX_KEY, JSON.stringify(keys), writeOptions)
      : secure.deleteItemAsync(CAPABILITY_INDEX_KEY);

  /** Eski AsyncStorage kayıtlarını taşı ve sil — süreç başına bir kez, ilk işlemden önce. */
  const migrate = async (): Promise<void> => {
    const old = legacy === undefined ? loadLegacyStore() : legacy;
    if (!old) return;
    let keys: string[];
    try {
      keys = (await old.getAllKeys()).filter((k) => k.startsWith(LEGACY_CAPABILITY_PREFIX));
    } catch {
      return;
    }
    if (keys.length === 0) return;
    try {
      const moved: string[] = [];
      for (const [key, value] of await old.multiGet(keys)) {
        if (!value) continue;
        try {
          if ((await secure.getItemAsync(key)) === null) await secure.setItemAsync(key, value, writeOptions);
          moved.push(key);
        } catch {
          /* taşınamadı: yine de aşağıda silinir */
        }
      }
      if (moved.length > 0) {
        const index = await readIndex();
        await writeIndex([...new Set([...index, ...moved])]);
      }
    } catch {
      /* okunamadı: silmeye geç */
    }
    try {
      await old.multiRemove(keys);
    } catch {
      /* silinemedi: sonraki açılışta yeniden denenir */
    }
  };
  const ready = serial(() => migrate().catch(() => undefined));

  return {
    getItem: async (key) => {
      await ready;
      return secure.getItemAsync(key);
    },
    setItem: (key, value) =>
      serial(async () => {
        await secure.setItemAsync(key, value, writeOptions);
        const index = await readIndex();
        if (!index.includes(key)) await writeIndex([...index, key]);
      }),
    removeItem: (key) =>
      serial(async () => {
        await secure.deleteItemAsync(key);
        const index = await readIndex();
        if (index.includes(key)) await writeIndex(index.filter((k) => k !== key));
      }),
    getAllKeys: () => serial(readIndex),
    multiGet: async (keys) => {
      await ready;
      return Promise.all(keys.map(async (key) => [key, await secure.getItemAsync(key)] as const));
    },
    multiRemove: (keys) =>
      serial(async () => {
        await Promise.all(keys.map((key) => secure.deleteItemAsync(key)));
        const index = await readIndex();
        const remaining = index.filter((k) => !keys.includes(k));
        if (remaining.length !== index.length) await writeIndex(remaining);
      }),
  };
}
