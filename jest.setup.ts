/**
 * Jest setup — mobil komponent/birim testleri.
 * RNTL 12.4+ built-in Jest matcher'ları (toBeDisabled, toBeOnTheScreen, ...) otomatik kayıtlı.
 * Native modül mock'ları gerektikçe buraya eklenir (SecureStore, AsyncStorage, image-picker).
 */

// i18n: gerçek katalogla (tr) senkron init. Ekranlar `useTranslation` kullanmaya
// başladıkça, i18n kurulmamış bir testte `t('cart.empty')` ANAHTARI döndürüyor ve
// Türkçe metne bakan mevcut testler sebepsiz kırılıyordu. Gerçek katalogla
// kurunca testler kullanıcının GÖRDÜĞÜ metni doğrulamaya devam ediyor.
// (Anahtar kullanımını kanıtlamak isteyen testler `react-i18next`'i kendi
// dosyasında mock'lamaya devam edebilir — o mock bunu ezer.)
import i18n, { ensureLocaleLoaded } from '@/i18n/config';

// Cihaz dili jest ortamında `en-US` çözülüyor; testler Türkçe metne bakıyor.
// Testler iki dili de kullanıyor (changeLanguage('en')) — lazy yüklemeyi baştan tamamla.
ensureLocaleLoaded('tr');
ensureLocaleLoaded('en');
i18n.changeLanguage('tr');

// Test modu: register birthDate öndolu (1990-01-01), şifre alanları maskesiz.
// Uygulama EXPO_PUBLIC_MAESTRO==='1' ile bu davranışları açar.
process.env.EXPO_PUBLIC_MAESTRO = '1';

// expo-secure-store: testte gerçek keychain yok — no-op mock.
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(() => Promise.resolve(null)),
  setItemAsync: jest.fn(() => Promise.resolve()),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
}));

// react-native-safe-area-context: testte SafeAreaProvider yok → sabit inset mock.
jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  const inset = { top: 0, right: 0, bottom: 0, left: 0 };
  return {
    SafeAreaProvider: ({ children }: any) => children,
    SafeAreaView: ({ children }: any) => children,
    SafeAreaInsetsContext: React.createContext(inset),
    useSafeAreaInsets: () => inset,
    useSafeAreaFrame: () => ({ x: 0, y: 0, width: 390, height: 844 }),
  };
});

// @expo/vector-icons: async font yüklemesi act() uyarısı üretiyor → basit metin mock.
jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  const makeIcon = (name: string) => (props: any) =>
    React.createElement(Text, props, props?.name ? `${name}:${props.name}` : name);
  return {
    Ionicons: makeIcon('Ionicons'),
    MaterialIcons: makeIcon('MaterialIcons'),
    MaterialCommunityIcons: makeIcon('MaterialCommunityIcons'),
    FontAwesome: makeIcon('FontAwesome'),
    Feather: makeIcon('Feather'),
  };
});

// @react-native-google-signin: native TurboModule (RNGoogleSignin) testte kayıtlı
// değil → import anında "could not be found" ile suite load'u patlıyordu. No-op mock.
jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {
    configure: jest.fn(),
    hasPlayServices: jest.fn(() => Promise.resolve(true)),
    signIn: jest.fn(() => Promise.resolve({ idToken: 'test-id-token' })),
    signOut: jest.fn(() => Promise.resolve()),
  },
  statusCodes: {},
  GoogleSigninButton: () => null,
}));

// appAlert: native Alert.alert yerine geçen temalı dialog (AlertDialogHost testte
// mount edilmez) → global jest.fn mock. Testler `appAlert as jest.Mock` ile erişir.
// `confirm()` aynı mock üstünden çalışır: testler onu da `appAlert` çağrısı olarak görür ve
// düğmelerin `onPress`'iyle (iptal → false, onay → true) çözer.
// usePreventRemove (taslak koruması): gerçeği navigator dışında atar → kayıt tutan eş
// (`emitBeforeRemove()` ile çıkış taklit edilir; bkz. src/test-utils/router-mock.ts).
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  usePreventRemove: (...args: [boolean, (o: { data: { action: unknown } }) => void]) =>
    // eslint-disable-next-line @typescript-eslint/no-var-requires -- jest.mock fabrikası içi
    require('@/test-utils/router-mock').usePreventRemoveMock(...args),
}));

jest.mock('@/ui', () => {
  const actual = jest.requireActual('@/ui');
  const { confirmWith } = jest.requireActual('@/ui/components/AlertDialog');
  const appAlert = jest.fn();
  return {
    ...actual,
    appAlert,
    confirm: (options: unknown) => confirmWith(appAlert, options),
  };
});

// NetInfo: native modül (RNCNetInfo) testte yok → paketin kendi jest mock'u (bağlantı var).
jest.mock('@react-native-community/netinfo', () =>
  jest.requireActual('@react-native-community/netinfo/jest/netinfo-mock.js'),
);

// FlashList v2: jest'te yerel ölçüm yok → ebeveyn/hücre ölçümlerini sabitle (liste hücreleri render olsun).
// NOT: paketin kendi `jestSetup.js`'i 2.0.2'de çalışmıyor (var olmayan `RecyclerView` export'unu
// FlashList yerine koyuyor) — yalnız ölçüm modülünü mock'luyoruz, gerçek FlashList kullanılır.
jest.mock('@shopify/flash-list/dist/recyclerview/utils/measureLayout', () => ({
  ...jest.requireActual('@shopify/flash-list/dist/recyclerview/utils/measureLayout'),
  measureParentSize: jest.fn(() => ({ x: 0, y: 0, width: 400, height: 900 })),
  measureFirstChildLayout: jest.fn(() => ({ x: 0, y: 0, width: 400, height: 900 })),
  measureItemLayout: jest.fn(() => ({ x: 0, y: 0, width: 100, height: 100 })),
}));

// react-native-gesture-handler: `GestureHandlerRootView` (BottomSheet'in Modal içi kökü) bağlanırken
// native modülün `install`ünü çağırıyor; jest'te TurboModule yok → paketin kendi jest mock'u
// (yalnız native modül; GestureDetector/jest-utils davranışı aynı kalır).
jest.mock('react-native-gesture-handler/lib/commonjs/RNGestureHandlerModule', () =>
  jest.requireActual('react-native-gesture-handler/lib/commonjs/mocks/mocks'),
);

// Her testte appAlert çağrı geçmişini sıfırla (testler arası sızıntı olmasın).
beforeEach(() => {
  const { appAlert } = jest.requireMock('@/ui');
  (appAlert as jest.Mock).mockReset();
});

/**
 * `waitFor`/`findBy*` için AÇIK süre sınırı.
 *
 * RNTL varsayılanı 1000 ms ve bu sınır testlerin İDDİASIYLA ilgisiz: hiçbiri
 * "şu kadar sürede render olsun" demiyor, hepsi "sonunda görünsün" diyor.
 * Soğuk transform + eşzamanlı yük altındaki ilk koşumlarda marjinal testler bu
 * sınırı aşıp yanlış alarm veriyordu (2026-08-11'de `J30.5` ve `J75.2` böyle
 * düştü; ikisi de izole ve tekrar koşumda geçiyordu).
 *
 * Ölçüm: sınır 150 ms'ye çekilince 8 test düşüyor — yani suite'te sınıra yakın
 * bir küme var ve varsayılan onlara yeterli pay bırakmıyor.
 *
 * Sınır KALDIRILMIYOR, yükseltiliyor: hiç render olmayan bir bileşen yine
 * düşer, yalnız daha geç. Zayıflayan bir iddia yok.
 */
require('@testing-library/react-native').configure({ asyncUtilTimeout: 5000 });
