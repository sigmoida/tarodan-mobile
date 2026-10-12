import { Platform } from 'react-native';
import i18n from '@/i18n/config';

// [GEÇİCİ — refactor runtime doğrulaması için] Native RNGoogleSignin bu dev-client
// build'inde bridgeless TurboModule olarak register olmuyor (iOS Google Sign-In
// TestFlight'ta doğrulanacaktı). Top-level import login ekranı mount olur olmaz
// getEnforcing ile patlıyordu → hiçbir ekran açılamıyordu. Lazy require ederek
// modülü yalnızca signInWithGoogle çağrılınca yüklüyoruz.
function getGoogleSignin(): any {
  return require('@react-native-google-signin/google-signin').GoogleSignin;
}

// EXPO_PUBLIC_* değerleri build sırasında inline'lanır.
const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
const IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;

let configured = false;
function ensureConfigured() {
  if (configured) return;
  const GoogleSignin = getGoogleSignin();
  // Yalnızca tanımlı anahtarları geç: iOS'ta iosClientId (veya GoogleService-Info.plist)
  // yoksa configure() throw eder ("failed to determine clientID") → kırmızı ekran.
  GoogleSignin.configure({
    ...(WEB_CLIENT_ID ? { webClientId: WEB_CLIENT_ID } : {}),
    ...(IOS_CLIENT_ID ? { iosClientId: IOS_CLIENT_ID } : {}),
  });
  configured = true;
}

/**
 * Android'de Google girişi AÇIK mı — build başına bayrak. Google Cloud'da
 * Android OAuth istemcisine imza SHA-1'i (Play App Signing + upload) kayıtlı
 * değilken giriş `DEVELOPER_ERROR` ile düşüyor (docs/RELEASE.md). Bayrak
 * yalnız SHA-1 kaydı doğrulanmış build profilinde `'true'` yapılır; yoksa
 * buton hiç görünmez. Doğrudan `process.env.EXPO_PUBLIC_*` erişimi: Expo
 * değeri derleme anında inline'lar.
 */
const ANDROID_ENABLED = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_ENABLED === 'true';

/**
 * Google girişi bu platformda gerçekten yapılabilir mi?
 * Buton yalnızca true ise gösterilmeli — aksi halde configure() patlar.
 * - iOS: iosClientId (veya GoogleService-Info.plist) şart.
 * - Android: webClientId + `EXPO_PUBLIC_GOOGLE_ANDROID_ENABLED==='true'`.
 */
export function isGoogleConfigured(): boolean {
  if (Platform.OS === 'ios') return !!IOS_CLIENT_ID;
  return !!WEB_CLIENT_ID && ANDROID_ENABLED;
}

/** Google ile giriş; backend'e gönderilecek idToken döner. */
export async function signInWithGoogle(): Promise<string> {
  if (!isGoogleConfigured()) {
    // React DIŞI modül — `useTranslation` çağıramaz; bu hata `useLogin`'in
    // catch bloğunda `e.message` olarak doğrudan kullanıcıya gösterilir
    // (appAlert), o yüzden global `i18n` örneğinden ÇAĞRI ANINDA okunur
    // (bkz. `paytrDirectForm.ts`).
    throw new Error(i18n.t('auth.googleNotConfigured'));
  }
  ensureConfigured();
  const GoogleSignin = getGoogleSignin();
  await GoogleSignin.hasPlayServices();
  const result: any = await GoogleSignin.signIn();
  const idToken = result?.idToken ?? result?.data?.idToken;
  if (!idToken) throw new Error(i18n.t('auth.googleIdTokenMissing'));
  return idToken;
}
