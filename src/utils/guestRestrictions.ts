import { router } from 'expo-router';
import i18n from '@/i18n/config';
import type { MessageKey } from '@/i18n/lib/generated/keys';

// #82: bekleyen guest-yönlendirme timer'ı (modül-seviyesi — birikmeyi önler).
let pendingRedirect: ReturnType<typeof setTimeout> | null = null;

export type GuestAction =
  | 'favorites'
  | 'message'
  | 'trade'
  | 'collections'
  | 'rate'
  | 'comment'
  | 'sell'
  | 'wishlist'
  | 'follow';

interface RestrictionConfig {
  title: string;
  message: string;
  redirectTo: '/(auth)/login' | '/(auth)/register';
}

/**
 * Anahtarlar — DEĞER değil. Değerler `getRestrictionMessage` içinde ÇAĞRI
 * ANINDA `i18n.t()` ile çözülür (bkz. `paytrDirectForm.ts`); bu tablo modül
 * seviyesinde kursa da hiçbir METİN burada donmuş DEĞİL. `titleKey` mümkün
 * olduğunda başka ekranlardaki aynı başlığı REUSE eder (`product.trade`,
 * `message.sendMessage`, …) — ayrı bir kopya açmak yerine.
 */
const RESTRICTION_KEYS: Record<
  GuestAction,
  { titleKey: MessageKey; messageKey: MessageKey; redirectTo: '/(auth)/login' | '/(auth)/register' }
> = {
  favorites: {
    titleKey: 'product.addToFavorites',
    messageKey: 'product.signInToFavorite',
    redirectTo: '/(auth)/register',
  },
  message: {
    titleKey: 'message.sendMessage',
    messageKey: 'guestRestriction.messageMessage',
    redirectTo: '/(auth)/login',
  },
  trade: {
    titleKey: 'product.trade',
    messageKey: 'guestRestriction.tradeMessage',
    redirectTo: '/(auth)/register',
  },
  collections: {
    titleKey: 'collection.createCollection',
    messageKey: 'guestRestriction.collectionsMessage',
    redirectTo: '/(auth)/register',
  },
  rate: {
    titleKey: 'review.submit',
    messageKey: 'guestRestriction.rateMessage',
    redirectTo: '/(auth)/login',
  },
  comment: {
    titleKey: 'guestRestriction.commentTitle',
    messageKey: 'guestRestriction.commentMessage',
    redirectTo: '/(auth)/login',
  },
  sell: {
    titleKey: 'nav.newListing',
    messageKey: 'guestRestriction.sellMessage',
    redirectTo: '/(auth)/register',
  },
  wishlist: {
    titleKey: 'guestRestriction.wishlistTitle',
    messageKey: 'guestRestriction.wishlistMessage',
    redirectTo: '/(auth)/register',
  },
  follow: {
    titleKey: 'profile.follow',
    messageKey: 'guestRestriction.followMessage',
    redirectTo: '/(auth)/register',
  },
};

export function getRestrictionMessage(action: GuestAction): RestrictionConfig {
  const { titleKey, messageKey, redirectTo } = RESTRICTION_KEYS[action];
  return { title: i18n.t(titleKey), message: i18n.t(messageKey), redirectTo };
}

export function handleGuestAction(
  action: GuestAction,
  isAuthenticated: boolean,
  onShowSnackbar: (message: string) => void,
  onSuccess?: () => void
): boolean {
  if (isAuthenticated) {
    onSuccess?.();
    return true;
  }

  const config = getRestrictionMessage(action);
  onShowSnackbar(config.message);

  // #82: modül-seviyesi timer — art arda çağrılarda birikmesin; önceki bekleyen
  // yönlendirmeyi iptal et. Çağıran ekran unmount olursa cancelPendingGuestRedirect().
  if (pendingRedirect) clearTimeout(pendingRedirect);
  pendingRedirect = setTimeout(() => {
    pendingRedirect = null;
    router.push(config.redirectTo);
  }, 1500);

  return false;
}

/** Bekleyen guest yönlendirmesini iptal et (çağıran ekran unmount olduğunda). */
export function cancelPendingGuestRedirect(): void {
  if (pendingRedirect) {
    clearTimeout(pendingRedirect);
    pendingRedirect = null;
  }
}

export function checkGuestAccess(
  isAuthenticated: boolean,
  action: GuestAction
): { allowed: boolean; message?: string; redirectTo?: string } {
  if (isAuthenticated) {
    return { allowed: true };
  }

  const config = getRestrictionMessage(action);
  return {
    allowed: false,
    message: config.message,
    redirectTo: config.redirectTo,
  };
}
