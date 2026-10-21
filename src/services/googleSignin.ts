import { Platform } from 'react-native';
import i18n from '@/i18n/config';
import { GOOGLE_SIGN_IN_CANCELLED } from './googleSigninErrors';

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
 * Is Google sign-in ON for Android? A per-build flag, on purpose: without an Android OAuth
 * client (package name + signing SHA-1) in Google Cloud, sign-in dies with `DEVELOPER_ERROR`
 * (docs/ANDROID_RELEASE.md, section 9). The flag is `'true'` only in the `eas.json` profiles
 * whose client exists (`easProfiles.test.ts` pins them); elsewhere the button stays hidden.
 * Read `process.env.EXPO_PUBLIC_*` directly: Expo inlines the value at build time.
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

export interface GoogleSignInOptions {
  /**
   * Step-up (`POST /auth/reauth`) needs an `idToken` minted now: the API refuses one whose
   * `iat` is more than 300 s old, and the SDK may hand back the account it already holds.
   * `fresh` signs that account out of the SDK first, so the chooser shows and Google issues
   * a new token. It never touches the Tarodan session.
   */
  fresh?: boolean;
}

/** Google ile giriş; backend'e gönderilecek idToken döner. */
export async function signInWithGoogle({ fresh = false }: GoogleSignInOptions = {}): Promise<string> {
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
  if (fresh) {
    try {
      await GoogleSignin.signOut();
    } catch {
      /* nothing cached to clear: the sign-in below still runs */
    }
  }
  const result: any = await GoogleSignin.signIn();
  // Since v13 the SDK resolves `{ type: 'cancelled' }` instead of throwing: surface it as the
  // cancel code, so callers stay silent instead of reporting a missing token.
  if (result?.type === 'cancelled') {
    throw Object.assign(new Error('Google sign-in cancelled'), { code: GOOGLE_SIGN_IN_CANCELLED });
  }
  const idToken = result?.idToken ?? result?.data?.idToken;
  if (!idToken) throw new Error(i18n.t('auth.googleIdTokenMissing'));
  return idToken;
}
