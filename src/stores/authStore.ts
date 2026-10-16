import { create } from "zustand";
import { SERVER_MAX_ADDRESSES } from "@/lib/addressLimit";
import * as SecureStore from "expo-secure-store";
import { advanceSessionEpoch, authApi, userApi } from "@/lib/api";
import {
  bindPaymentCapabilitiesToAccount,
  clearAllPaymentCapabilities,
  sweepExpiredPaymentCapabilities,
} from "@/lib/payment/paymentCapability";
import type { LogoutReason } from "./resetUserStores";
import { usePendingAuthEmailStore } from "./pendingAuthEmailStore";
import { readUserSnapshot, writeUserSnapshot } from "./userSnapshot";
import { logger, safeError } from "../services/logger";
import { withTimeout } from "../utils/withTimeout";
import { AppState } from "react-native";
import { subscribeOnline } from "@/lib/network/networkStatus";
import { createForegroundTracker } from "@/lib/query/focusManager";
import { IS_MAESTRO_NO_AUTOLOGIN, getMaestroAutoLoginCredentials } from "@/config/maestro";

/** Çıkıştaki ağ çağrıları için üst sınır — kullanıcı bekletilmez. */
const LOGOUT_NETWORK_TIMEOUT_MS = 5000;

export interface LogoutOptions {
  /**
   * `user` (varsayılan) kullanıcının kendi çıkışı; `forced` 401 sonrası zorunlu çıkış
   * (`client.ts`); `accountDeleted` hesap silme başarılı olduktan sonra.
   */
  reason?: LogoutReason;
  /**
   * Sunucuya HİÇ istek atma (push token iptali, `POST /auth/logout`); yalnız yerel temizlik.
   * `accountDeleted`'da varsayılan `true`: sunucu silmede refresh/push token'larını zaten
   * sildi; silinmiş hesabın token'ıyla atılan istek 401 → refresh 401 → `handleAuthFailure`
   * → yeniden `logout` döngüsüne girerdi.
   */
  skipServer?: boolean;
}

/**
 * Uçuştaki çıkış. Eşzamanlı `logout()` çağrıları (ör. çıkışın kendi ağ isteğinin 401'i →
 * `handleAuthFailure`) yeni bir çıkış başlatmaz, bu sözü paylaşır.
 */
let inFlightLogout: Promise<void> | null = null;
/**
 * Uçuştaki çıkışın nedeni. Zorunlu (`forced`) çıkış sürerken kullanıcı çıkışı ya da hesap
 * silme katılırsa güçlü nedene yükseltilir (temizlik henüz yapılmadıysa onunla yapılır).
 */
let inFlightReason: LogoutReason = "user";
/** Son çıkışta `resetUserStores`'a gerçekten verilen neden (katılan çağrının ek temizliği için). */
let appliedReason: LogoutReason | null = null;

/**
 * Store tarafı oturum kuşağı: her giriş ve çıkışta artar. Açılıştaki arka plan
 * profil doğrulaması başladığı kuşak değiştiyse (bu arada çıkış ya da başka
 * hesapla giriş) sonucunu YAZMAZ — yoksa kapanmış oturumu ya da önceki hesabın
 * profilini yeni oturumun üstüne yazardı.
 */
let authGeneration = 0;

/** HTTP durum kodu (axios hatası); yanıtsız (ağ) hatada `undefined`. */
const httpStatusOf = (error: unknown): number | undefined =>
  (error as { response?: { status?: number } } | null)?.response?.status;

/** Bir çıkış sürüyor mu? `client.ts` `handleAuthFailure` bu sırada hiçbir şey yapmaz. */
export function isLogoutInProgress(): boolean {
  return inFlightLogout !== null;
}

/** Yerel temizlik adımı çıkışı yarıda bırakmasın (SecureStore hatası vb.). */
async function bestEffort(step: string, fn: () => Promise<unknown>): Promise<void> {
  try {
    await fn();
  } catch (error) {
    logger.error("Logout local cleanup failed", { step, err: safeError(error) });
  }
}

// Membership tier types
export type MembershipTier = "free" | "basic" | "premium" | "business";
export type VerificationStatus = "unverified" | "verified";
export type SellerType = "individual" | "corporate";

// Extended User interface with all member fields
export interface User {
  id: string;
  email: string;
  displayName: string;
  phone?: string;
  avatar?: string;
  avatarUrl?: string;
  bio?: string;
  /** `YYYY-MM-DD`. Profil düzenleme formu bunu ön-doldurur. */
  birthDate?: string;

  // Membership
  membershipTier: MembershipTier;

  // Verification
  isVerified: boolean;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  verificationStatus: VerificationStatus;

  // Seller info
  isSeller: boolean;
  sellerType?: SellerType;

  // Business account info (companyName + taxId = kurumsal/işletme hesabı, web ile aynı)
  companyName?: string;
  taxId?: string;
  taxOffice?: string;
  businessStatus?: "pending" | "approved" | "rejected";

  // Stats for verification criteria
  totalSales: number;
  totalPurchases: number;
  accountAge: number; // days since registration
  profileCompletion: number; // percentage 0-100
  disputeCount: number;

  // Listing limits
  listingCount: number;
  maxFreeListings: number;

  // Additional
  createdAt: string;

  // Rating
  rating?: number;
  totalRatings?: number;

  // Premium Profile Fields
  websiteUrl?: string;
  twitterHandle?: string;
  instagramHandle?: string;
  facebookUrl?: string;
  youtubeUrl?: string;
  customProfileSlug?: string;

  // Privacy Settings
  showEmail?: boolean;
  showPhone?: boolean;
  allowMessages?: boolean;

  // Reputation
  reputationLevel?:
    "rising_star" | "trusted_seller" | "elite_collector" | "hall_of_fame";
  specialRecognitions?: string[];

  // Kullanıcı adı (bir kez belirlenir, değiştirilemez)
  username?: string;
  usernameClaimed?: boolean;
}

// Membership limits per tier
export interface MembershipLimits {
  maxListings: number;
  maxImagesPerListing: number;
  maxAddresses: number;
  maxSavedSearches: number;
  maxMessagesPerDay: number;
  listingExpireDays: number;
  maxReviewChars: number;
  maxValuePerListing: number; // TRY
  canTrade: boolean;
  canCreateCollections: boolean;
  canFeatureListings: boolean;
  canBulkUpload: boolean;
  canScheduleListings: boolean;
  priorityInSearch: boolean;
  isAdFree: boolean;
}

/** Sunucunun sağladığı hak alanları. Sağlanmayan alan için anahtar HİÇ
 *  konmaz; `{ ...TIER_LIMITS[tier], ...override }` bindirmesinde o alan
 *  sabit tablodan gelmeye devam eder. */
export type ServerLimitsOverride = Partial<
  Pick<
    MembershipLimits,
    'maxListings' | 'maxImagesPerListing' | 'canCreateCollections' | 'canTrade' | 'isAdFree'
  >
>;

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  token: string | null;
  limits: MembershipLimits | null;
  /** Sunucudan gelen hak bindirmesi (GET /membership/me/limits).
   *  Fetch'i useMembershipLimits yapar; store yalnız tutar. */
  serverLimits: ServerLimitsOverride | null;
  setServerLimits: (v: ServerLimitsOverride) => void;

  // Actions
  login: (token: string, user: User, refreshToken?: string) => Promise<void>;
  /**
   * `reason: "forced"` yalnız 401 sonrası zorunlu çıkışta (`client.ts`); `accountDeleted` hesap
   * silindikten sonra (sunucu çağrısız, yalnız yerel); varsayılan kullanıcının kendi çıkışı.
   * Eşzamanlı çağrılar tek çıkışı paylaşır (ilk çağrının seçenekleri geçerli).
   */
  logout: (options?: LogoutOptions) => Promise<void>;
  loadToken: () => Promise<void>;
  updateUser: (user: Partial<User>) => void;
  /**
   * GET /users/me ile store'daki kullanıcıyı tazeler. Tazelenen kullanıcıyı
   * döndürür; istek başarısızsa `null` (store dokunulmadan kalır) — çağıran,
   * kaydın sonucunu bayat veriyle doğrulamasın diye bunu ayırt edebilir.
   */
  refreshUserData: () => Promise<User | null>;

  // Helpers
  canCreateListing: () => boolean;
  getRemainingListings: () => number;
  isVerifiedMember: () => boolean;
  getMembershipLimits: () => MembershipLimits;
}

// Default limits for each tier
const TIER_LIMITS: Record<MembershipTier, MembershipLimits> = {
  free: {
    maxListings: 10,
    maxImagesPerListing: 5,
    maxAddresses: SERVER_MAX_ADDRESSES,
    maxSavedSearches: 5,
    maxMessagesPerDay: 50,
    listingExpireDays: 60,
    maxReviewChars: 500,
    maxValuePerListing: 5000, // Unverified: 5000 TRY
    canTrade: false,
    canCreateCollections: false,
    canFeatureListings: false,
    canBulkUpload: false,
    canScheduleListings: false,
    priorityInSearch: false,
    isAdFree: false,
  },
  basic: {
    maxListings: 25,
    maxImagesPerListing: 10,
    maxAddresses: SERVER_MAX_ADDRESSES,
    maxSavedSearches: 10,
    maxMessagesPerDay: 100,
    listingExpireDays: 90,
    maxReviewChars: 1000,
    maxValuePerListing: 10000,
    canTrade: false,
    canCreateCollections: false,
    canFeatureListings: false,
    canBulkUpload: false,
    canScheduleListings: false,
    priorityInSearch: false,
    isAdFree: false,
  },
  premium: {
    maxListings: -1, // Unlimited
    maxImagesPerListing: 15,
    maxAddresses: SERVER_MAX_ADDRESSES,
    maxSavedSearches: -1, // Unlimited
    maxMessagesPerDay: -1, // Unlimited
    listingExpireDays: -1, // Never expire
    maxReviewChars: 2000,
    maxValuePerListing: 50000, // Verified: 50000 TRY
    canTrade: true,
    canCreateCollections: true,
    canFeatureListings: true,
    canBulkUpload: true,
    canScheduleListings: true,
    priorityInSearch: true,
    isAdFree: true,
  },
  business: {
    maxListings: -1,
    maxImagesPerListing: 20,
    maxAddresses: SERVER_MAX_ADDRESSES,
    maxSavedSearches: -1,
    maxMessagesPerDay: -1,
    listingExpireDays: -1,
    maxReviewChars: 5000,
    maxValuePerListing: -1, // No limit
    canTrade: true,
    canCreateCollections: true,
    canFeatureListings: true,
    canBulkUpload: true,
    canScheduleListings: true,
    priorityInSearch: true,
    isAdFree: true,
  },
};

/** Sabit tier tablosu + sunucu bindirmesi. Sunucu bir alanı vermiyorsa
 *  o alan TIER_LIMITS'ten gelir (ör. maxAddresses, maxSavedSearches). */
const mergeLimits = (
  tier: MembershipTier,
  override: ServerLimitsOverride | null,
): MembershipLimits => ({ ...TIER_LIMITS[tier], ...(override ?? {}) });

// Helper to extract membership tier from various API formats
const extractMembershipTier = (apiUser: any): MembershipTier => {
  // Check various possible paths for membership tier
  const tier =
    apiUser.membership?.tier?.type ||
    apiUser.membership?.tier?.name ||
    apiUser.membership?.tier ||
    apiUser.membership?.name ||
    apiUser.membershipTier ||
    apiUser.membership_tier ||
    "free";

  // Normalize the tier name
  const normalizedTier = String(tier).toLowerCase();

  if (normalizedTier.includes("premium") || normalizedTier === "premium")
    return "premium";
  if (normalizedTier.includes("business") || normalizedTier === "business")
    return "business";
  if (normalizedTier.includes("basic") || normalizedTier === "basic")
    return "basic";
  return "free";
};

// Default user values for mapping API response
export const mapApiUserToUser = (apiUser: any): User => {
  const membershipTier = extractMembershipTier(apiUser);

  return {
    id: apiUser.id,
    email: apiUser.email,
    displayName: apiUser.displayName || apiUser.display_name || "",
    phone: apiUser.phone,
    avatar: apiUser.avatar || apiUser.avatarUrl || apiUser.avatar_url,
    avatarUrl: apiUser.avatarUrl || apiUser.avatar_url,
    bio: apiUser.bio,
    birthDate: apiUser.birthDate ?? undefined,

    // Membership - properly extracted
    membershipTier,

    // Verification
    isVerified: apiUser.isVerified || apiUser.is_verified || false,
    isEmailVerified:
      apiUser.isEmailVerified || apiUser.is_email_verified || false,
    isPhoneVerified:
      apiUser.isPhoneVerified || apiUser.is_phone_verified || false,
    verificationStatus:
      apiUser.isVerified || apiUser.is_verified ? "verified" : "unverified",

    // Seller
    isSeller: apiUser.isSeller || apiUser.is_seller || false,
    sellerType: apiUser.sellerType || apiUser.seller_type,

    // Business account info (web ile aynı: companyName + taxId varsa kurumsal hesap)
    companyName: apiUser.companyName ?? apiUser.company_name ?? undefined,
    taxId: apiUser.taxId ?? apiUser.tax_id ?? undefined,
    taxOffice: apiUser.taxOffice ?? apiUser.tax_office ?? undefined,
    businessStatus:
      apiUser.businessStatus ?? apiUser.business_status ?? undefined,

    // Stats
    totalSales: apiUser.totalSales || apiUser.total_sales || 0,
    totalPurchases: apiUser.totalPurchases || apiUser.total_purchases || 0,
    accountAge:
      apiUser.accountAge ||
      calculateAccountAge(apiUser.createdAt || apiUser.created_at),
    profileCompletion:
      apiUser.profileCompletion || calculateProfileCompletion(apiUser),
    disputeCount: apiUser.disputeCount || apiUser.dispute_count || 0,

    // Listing limits
    listingCount: apiUser.listingCount || apiUser.listing_count || 0,
    maxFreeListings: apiUser.maxFreeListings || apiUser.max_free_listings || 10,

    createdAt:
      apiUser.createdAt || apiUser.created_at || new Date().toISOString(),

    // Rating
    rating: apiUser.rating,
    totalRatings: apiUser.totalRatings || apiUser.total_ratings,

    // Premium Profile Fields
    websiteUrl: apiUser.websiteUrl || apiUser.website_url,
    twitterHandle: apiUser.twitterHandle || apiUser.twitter_handle,
    instagramHandle: apiUser.instagramHandle || apiUser.instagram_handle,
    facebookUrl: apiUser.facebookUrl || apiUser.facebook_url,
    youtubeUrl: apiUser.youtubeUrl || apiUser.youtube_url,
    customProfileSlug: apiUser.customProfileSlug || apiUser.custom_profile_slug,

    // Privacy Settings
    showEmail: apiUser.showEmail ?? apiUser.show_email ?? false,
    showPhone: apiUser.showPhone ?? apiUser.show_phone ?? false,
    allowMessages: apiUser.allowMessages ?? apiUser.allow_messages ?? true,

    // Reputation
    reputationLevel: apiUser.reputationLevel || apiUser.reputation_level,
    specialRecognitions:
      apiUser.specialRecognitions || apiUser.special_recognitions || [],

    // Kullanıcı adı (bir kez belirlenir, değiştirilemez)
    username: apiUser.username,
    // Giriş/kayıt yanıtı `usernameClaimed` bool'u verir; `GET /users/me` ise ham
    // `usernameClaimedAt` (tarih|null) döner. İkisini de karşıla — aksi halde
    // `refreshUserData` sonrası bayrak sessizce `undefined` olur ve belirlenmiş
    // kullanıcı adı "belirlenebilir" görünürdü.
    usernameClaimed:
      apiUser.usernameClaimed ??
      apiUser.username_claimed ??
      (apiUser.usernameClaimedAt !== undefined
        ? apiUser.usernameClaimedAt != null
        : undefined),
  };
};

// Helper to calculate account age in days
const calculateAccountAge = (createdAt?: string): number => {
  if (!createdAt) return 0;
  const created = new Date(createdAt);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - created.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

// Helper to calculate profile completion percentage
const calculateProfileCompletion = (user: any): number => {
  const fields = ["displayName", "email", "phone", "avatarUrl", "bio"];

  let completed = 0;
  fields.forEach((field) => {
    const value =
      user[field] ||
      user[field.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)];
    if (value && value.toString().trim() !== "") {
      completed++;
    }
  });

  return Math.round((completed / fields.length) * 100);
};

/**
 * Görüntüyü yalnız store'daki AKTİF oturumun kullanıcısıysa yazar: çıkıştan sonra
 * dönen geç bir profil yanıtı silinmiş görüntüyü geri yazmasın.
 */
function persistSnapshot(user: User): void {
  const state = useAuthStore.getState();
  if (state.isAuthenticated && state.user?.id === user.id) void writeUserSnapshot(user);
}

/**
 * `GET /users/me` yanıtını store'a uygular (açılış doğrulaması — arka plan ya da
 * görüntüsüz eski yol). İstek 401 alıp sessiz refresh tetiklemiş olabilir (soğuk
 * açılışta süresi dolmuş access token tipik): SecureStore'daki token yenilendi ve
 * açılışta okunan `token` BAYAT — store'a taze olanı yaz, yoksa store'dan okuyan
 * tüketiciler (bearer'lı görseller, socket) ölü token'la kalır.
 */
async function applyProfile(apiUser: unknown, token: string, generation: number): Promise<void> {
  const freshToken = (await SecureStore.getItemAsync("accessToken")) || token;
  // Yanıt beklenirken çıkış / başka hesapla giriş oldu: bu profil artık geçersiz.
  if (generation !== authGeneration || inFlightLogout) return;
  const { user: previous, serverLimits } = useAuthStore.getState();
  const mappedUser = mapApiUserToUser(apiUser);
  useAuthStore.setState({
    isAuthenticated: true,
    token: freshToken,
    user: mappedUser,
    limits: mergeLimits(mappedUser.membershipTier, serverLimits),
    isLoading: false,
  });
  persistSnapshot(mappedUser);
  // Ödeme yetki belirteci kimliği bu hesap (açılışta yüklenen oturum).
  if (previous?.id !== mappedUser.id) void bindPaymentCapabilitiesToAccount(mappedUser.id);
}

/**
 * Açılışın arka plan profil doğrulaması (saklı görüntüyle oturum zaten açık).
 * - Başarı: taze profil + taze token store'a ve görüntüye yazılır; profile bağlı
 *   yönlendirmeler (`BusinessMembershipGuard`) `user` değişince yeniden çalışır.
 * - 401: interceptor refresh'i denedi; refresh düştüyse `handleAuthFailure` zorunlu
 *   çıkışı ZATEN yaptı (kuşak değişti → burada iş yok). Refresh başarılı olup istek
 *   yine 401 dönerse eski açılış yolunun karşılığı: oturum kapanır (zorunlu çıkış).
 * - Ağ hatası / 5xx / 403 (ban → interceptor `/banned`'a yönlendirir): saklı
 *   kullanıcıyla devam; profil sonraki `refreshUserData`'da tazelenir.
 */
async function validateSessionInBackground(token: string, generation: number): Promise<void> {
  try {
    const response = await userApi.getProfile();
    await applyProfile(response.data, token, generation);
  } catch (error) {
    if (generation !== authGeneration || inFlightLogout) return;
    const unauthorized = httpStatusOf(error) === 401;
    logger.captureException(error, {
      level: "warning",
      tags: { flow: unauthorized ? "auth.loadToken" : "auth.validateSession" },
    });
    if (!unauthorized || !useAuthStore.getState().isAuthenticated) return;
    // Token sunucuda geçersiz: sunucu çağrıları (push iptali / logout) yine 401 alırdı.
    await useAuthStore.getState().logout({ reason: "forced", skipServer: true });
  }
}

/** Anahtar zinciri okuma hatasında ikinci denemeden önceki bekleme. */
const KEYCHAIN_RETRY_MS = 250;

/**
 * Access token'ı okur; anahtar zinciri hatasında bir kez daha dener. İkinci hata da
 * FIRLATILIR — çağıran bunu "oturum yok" saymamalı (token'lar silinmez).
 */
async function readAccessTokenWithRetry(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync("accessToken");
  } catch (error) {
    logger.warn("Access token read failed, retrying", { err: safeError(error) });
    await new Promise((resolve) => setTimeout(resolve, KEYCHAIN_RETRY_MS));
    return SecureStore.getItemAsync("accessToken");
  }
}

/** Ertelenmiş oturum denemesinin aralığı: 30 sn'den başlar, her geçici hatada ikiye katlanır (≤ 5 dk). */
const DEFERRED_RETRY_BASE_MS = 30_000;
const DEFERRED_RETRY_MAX_MS = 5 * 60_000;

let deferredRetry: { cancel: () => void } | null = null;
let deferredAttempt = 0;

/** Ertelenmiş oturum denemesini iptal eder (giriş / çıkış / başarılı yükleme). */
function cancelDeferredSessionRetry(): void {
  deferredRetry?.cancel();
  deferredRetry = null;
}

/**
 * Açılışta oturum GEÇİCİ bir hatayla doğrulanamadı (çevrimdışı, 5xx, anahtar zinciri
 * okunamadı): token'lar saklı, uygulama misafir açıldı. `loadToken` şu anların İLKİNDE
 * yeniden çalışır: bağlantı geri gelince (`subscribeOnline` — çevrimdışı diyaloğu ve
 * TanStack `onlineManager` ile aynı karar), gerçek ön plana dönüşte (`focusManager` ile
 * aynı kural) ya da geri çekilen süre dolunca (bağlantı hiç kopmadan 5xx alındıysa).
 * Bu arada giriş/çıkış olduysa (kuşak değişti) deneme yapılmaz.
 */
function scheduleDeferredSessionRetry(): void {
  cancelDeferredSessionRetry();
  const generation = authGeneration;
  const delay = Math.min(DEFERRED_RETRY_BASE_MS * 2 ** deferredAttempt, DEFERRED_RETRY_MAX_MS);
  deferredAttempt += 1;
  const fire = () => {
    cancelDeferredSessionRetry();
    if (generation !== authGeneration || inFlightLogout) return;
    if (useAuthStore.getState().isAuthenticated) return;
    void retryDeferredSession();
  };
  const timer = setTimeout(fire, delay);
  const stopOnline = subscribeOnline((online) => {
    if (online) fire();
  });
  const track = createForegroundTracker();
  const appState = AppState.addEventListener("change", (next) => {
    if (track(next) === "foreground") fire();
  });
  deferredRetry = {
    cancel: () => {
      clearTimeout(timer);
      stopOnline();
      appState.remove();
    },
  };
}

async function retryDeferredSession(): Promise<void> {
  await useAuthStore.getState().loadToken();
  if (!useAuthStore.getState().isAuthenticated) return;
  deferredAttempt = 0;
  // Misafirken çekilmiş listeler (sepet, favoriler, rozetler…) token'la yeniden çekilsin.
  refetchServerStateForNewSession();
}

/**
 * Misafir/önceki oturumdan kalan listeler yeni token'la yeniden çekilir. Beklenmez:
 * oturum açılışı ağ çağrısına takılmasın. Lazy require: döngüsel import (logout ile aynı).
 */
function refetchServerStateForNewSession(): void {
  const { resetServerStateForNewSession } = require("./resetUserStores");
  void resetServerStateForNewSession();
}

export const useAuthStore = create<AuthState>((set, get) => ({
  isAuthenticated: false,
  isLoading: true,
  user: null,
  token: null,
  limits: null,
  serverLimits: null,

  setServerLimits: (v: ServerLimitsOverride) => {
    const tier = get().user?.membershipTier || "free";
    set({ serverLimits: v, limits: mergeLimits(tier, v) });
  },

  login: async (token: string, user: User, refreshToken?: string) => {
    // Yeni oturum: açılışın uçuştaki arka plan doğrulaması bu oturuma yazmasın.
    authGeneration += 1;
    // İstemci kuşağı da: önceki oturumdan uçuşta kalan bir refresh bu oturumun token'ını
    // ezmesin, sonucu (ör. kesin red) bu oturumu zorunlu çıkışa sokmasın.
    advanceSessionEpoch();
    // Açılışta ertelenmiş oturum denemesi artık gereksiz (kullanıcı kendisi giriş yaptı).
    cancelDeferredSessionRetry();
    deferredAttempt = 0;
    await SecureStore.setItemAsync("accessToken", token);
    if (refreshToken) {
      await SecureStore.setItemAsync("refreshToken", refreshToken);
    }
    const mappedUser = mapApiUserToUser(user);
    const limits = mergeLimits(mappedUser.membershipTier, get().serverLimits);
    logger.debug("Auth stored", { tier: mappedUser.membershipTier });
    set({ isAuthenticated: true, token, user: mappedUser, limits });
    // Sonraki soğuk açılış ağı beklemeden bu kullanıcıyla açılsın.
    persistSnapshot(mappedUser);
    // Doğrulama/giriş akışının bellek içi e-postası işini bitirdi (her giriş yolu: parola, Google, Apple).
    usePendingAuthEmailStore.getState().setEmail(null);
    // Ödeme yetki belirteci kimliği bu hesap; başka hesabın belirteçleri (zorunlu
    // çıkıştan kalmış) silinir.
    void bindPaymentCapabilitiesToAccount(mappedUser.id);
    // Misafir/önceki oturumdan kalan listeler yeni token'la yeniden çekilsin.
    // Token set'ten SONRA — yeniden çekim yeni token'ı taşımalı.
    refetchServerStateForNewSession();
    // Tag every subsequent Sentry event with the active user.
    logger.setUser({
      id: mappedUser.id,
      email: mappedUser.email,
      username: mappedUser.displayName,
    });
  },

  // Web ile aynı endpoint: POST /auth/logout
  logout: (options: LogoutOptions = {}) => {
    // Yeniden giriş koruması: süren çıkış varsa aynı sözü döndür — ikinci bir
    // push iptali / POST /auth/logout / store sıfırlaması başlamaz.
    const wanted: LogoutReason = options.reason ?? "user";
    if (inFlightLogout) {
      // Zorunlu çıkış sürerken kullanıcı çıkışı / hesap silme katıldı: nedeni yükselt.
      // Temizlik zaten `forced` ile yapıldıysa (yarış), kendi çıkışın ek temizliği —
      // ödeme yetki belirteçleri — katılan çağrıda yapılır.
      if (wanted === "forced" || inFlightReason !== "forced") return inFlightLogout;
      inFlightReason = wanted;
      return inFlightLogout.then(async () => {
        if (appliedReason === "forced") await clearAllPaymentCapabilities();
      });
    }
    inFlightReason = wanted;
    appliedReason = null;
    inFlightLogout = (async () => {
      const skipServer = options.skipServer ?? wanted === "accountDeleted";

      // İLK İŞ: oturum kuşağını ilerlet. Bu noktadan sonra tamamlanan her
      // uçuştaki refresh kendini geçersiz sayar ve SecureStore'a yazmaz —
      // yoksa bu arada giriş yapan kullanıcının token'ını ezerdi.
      advanceSessionEpoch();
      // Store kuşağı da: açılışın arka plan profil doğrulaması kapanan oturuma yazmasın.
      authGeneration += 1;
      cancelDeferredSessionRetry();

      if (!skipServer) {
        // Bu cihazın push token'ını sunucuda deaktive et (çıkış sonrası bu cihaza
        // bildirim gitmesin). Token hâlâ geçerliyken, logout çağrısından önce yap.
        // Lazy require: push → api → authStore import zinciriyle döngü oluşmasın.
        try {
          const { unregisterPushNotifications } = require("../services/push");
          // Süre sınırlı: çıkış hiçbir ağ çağrısına takılıp kalmamalı. Bu await
          // response interceptor'ın içinden de çalışıyor; asılırsa axios'un
          // reject'ini bloklar ve arayüz sonsuz "yükleniyor"da kalır.
          await withTimeout(unregisterPushNotifications(), LOGOUT_NETWORK_TIMEOUT_MS);
        } catch {
          /* best-effort — Expo Go'da no-op, hata oturumu engellemesin */
        }
        try {
          await withTimeout(authApi.logout(), LOGOUT_NETWORK_TIMEOUT_MS);
        } catch (error) {
          // Best-effort: report logout failures so we don't lose them silently
          // (no-op in dev/Expo Go).
          logger.captureException(error, {
            level: "warning",
            tags: { flow: "logout" },
          });
        }
      }
      await bestEffort("accessToken", () => SecureStore.deleteItemAsync("accessToken"));
      await bestEffort("refreshToken", () => SecureStore.deleteItemAsync("refreshToken"));
      set({ isAuthenticated: false, token: null, user: null, limits: null, serverLimits: null });
      // Kullanıcıya özel yerel state (sepet/favori/mesaj rozetleri, query cache).
      // Lazy require: messagesStore → authStore import zinciriyle döngü oluşmasın.
      // Zorunlu çıkışta ödeme yetki belirteçleri kalır (süren 3DS ödemesi için).
      const { resetUserStores } = require("./resetUserStores");
      // Uçuş sırasında katılan çağrı nedeni yükseltmiş olabilir (`inFlightReason`).
      appliedReason = inFlightReason;
      resetUserStores(appliedReason);
      logger.setUser(null);
    })().finally(() => {
      inFlightLogout = null;
    });
    return inFlightLogout;
  },

  loadToken: async () => {
    // Açılış: süresi dolmuş ödeme yetki belirteci kayıtlarını süpür (beklenmez, fırlatmaz).
    void sweepExpiredPaymentCapabilities();
    // Maestro register/guest journey: keychain (SecureStore) clearState'i atlatıp
    // önceki oturumun token'ını taşıyabiliyor. NO_AUTOLOGIN modunda token'ı temizle
    // ki gerçekten çıkışlı (misafir) başlansın. Yalnız test gate'i — prod'da unset.
    if (IS_MAESTRO_NO_AUTOLOGIN) {
      await bestEffort("accessToken", () => SecureStore.deleteItemAsync("accessToken"));
      await bestEffort("refreshToken", () => SecureStore.deleteItemAsync("refreshToken"));
      set({
        isAuthenticated: false,
        token: null,
        user: null,
        limits: null,
        serverLimits: null,
        isLoading: false,
      });
      return;
    }
    let token: string | null;
    try {
      token = await readAccessTokenWithRetry();
    } catch (error) {
      // Anahtar zinciri iki kez okunamadı: bu "oturum yok" DEĞİL (iOS'ta kilit açılmadan
      // arka planda açılış tipik). Token'lar silinmez; misafir başlanır, oturum bir sonraki
      // ön plana dönüşte / bağlantı gelince yeniden yüklenir.
      logger.captureException(error, { level: "warning", tags: { flow: "auth.loadToken.keychain" } });
      set({ isLoading: false });
      scheduleDeferredSessionRetry();
      return;
    }
    // Token yoksa Maestro kimliğine bir kez bak (kapı kapalıysa null).
    const maestroCredentials = token ? null : getMaestroAutoLoginCredentials();
    const generation = authGeneration;
    try {
      if (token) {
        const snapshot = await readUserSnapshot();
        if (snapshot) {
          // Açılış AĞI BEKLEMEZ: token + saklı kullanıcı görüntüsüyle oturum hemen
          // açılır, splash kapanır; profil (`GET /users/me`, 401→refresh dahil) arka
          // planda doğrulanır ve dönünce store'u günceller.
          const cachedUser = mapApiUserToUser(snapshot);
          set({
            isAuthenticated: true,
            token,
            user: cachedUser,
            limits: mergeLimits(cachedUser.membershipTier, get().serverLimits),
            isLoading: false,
          });
          // Ödeme yetki belirteci kimliği bu hesap (açılışta yüklenen oturum).
          void bindPaymentCapabilitiesToAccount(cachedUser.id);
          void validateSessionInBackground(token, generation);
          return;
        }
        // Görüntü yok (bu sürüme ilk geçiş ya da yazım hatası): eski yol — profil
        // beklenir; hata aşağıdaki catch'e düşer (yalnız kesin 401'de oturum kapanır).
        // Sonraki açılış görüntüyle ağsız açılır. Web ile aynı endpoint: GET /users/me
        const response = await userApi.getProfile();
        await applyProfile(response.data, token, generation);
        // Yanıt beklenirken çıkış olduysa `applyProfile` yazmaz; yükleme yine biter.
        if (get().isLoading) set({ isLoading: false });
      } else if (maestroCredentials) {
        // Maestro test bypass: auto-login with seeded credentials so that
        // e2e flows skip the login UI entirely. Yalnız EXPO_PUBLIC_MAESTRO=1
        // build'i + env'deki kimlik (bkz. src/config/maestro.ts).
        try {
          const { email, password } = maestroCredentials;
          logger.debug("Maestro auto-login", { email });
          const response = await authApi.login(email, password);
          const data: any = response.data;
          const accessToken = data.tokens?.accessToken || data.accessToken;
          const refreshToken = data.tokens?.refreshToken || data.refreshToken;
          const user = data.user;
          if (accessToken && user) {
            await get().login(accessToken, user, refreshToken);
            set({ isLoading: false });
          } else {
            set({ isLoading: false });
          }
        } catch (autoLoginError) {
          logger.captureException(autoLoginError, {
            level: "warning",
            tags: { flow: "auth.maestroAutoLogin" },
          });
          set({
            isAuthenticated: false,
            token: null,
            user: null,
            limits: null,
            serverLimits: null,
            isLoading: false,
          });
        }
      } else {
        set({ isLoading: false });
      }
    } catch (error) {
      // Profil beklenirken oturum değişti: interceptor zorunlu çıkışı (refresh kesin
      // reddedildi) ZATEN yaptı ya da kullanıcı bu arada giriş yaptı — burada iş yok.
      if (generation !== authGeneration || inFlightLogout) {
        if (get().isLoading) set({ isLoading: false });
        return;
      }
      const unauthorized = httpStatusOf(error) === 401;
      // Tag'li rapor: panolar beklenen (401) ile beklenmeyeni ayırabilsin.
      logger.captureException(error, {
        level: "warning",
        tags: { flow: unauthorized ? "auth.loadToken" : "auth.loadToken.transient" },
      });
      if (unauthorized) {
        // Kesin: refresh başarılı olduğu halde istek yine 401 → token sunucuda geçersiz.
        await bestEffort("accessToken", () => SecureStore.deleteItemAsync("accessToken"));
        await bestEffort("refreshToken", () => SecureStore.deleteItemAsync("refreshToken"));
        set({
          isAuthenticated: false,
          token: null,
          user: null,
          limits: null,
          serverLimits: null,
          isLoading: false,
        });
        return;
      }
      // Geçici (ağ / zaman aşımı / 5xx / refresh'in geçici hatası / 403): token'lar KALIR.
      // Bu sürüme geçen kullanıcı ilk açılışta çevrimdışıysa çıkış yapılmış olmasın —
      // misafir başlanır, doğrulama bağlantı gelince / ön plana dönüşte yeniden denenir.
      set({ isLoading: false });
      scheduleDeferredSessionRetry();
    }
  },

  updateUser: (userData: Partial<User>) => {
    const currentUser = get().user;
    if (currentUser) {
      const updatedUser = { ...currentUser, ...userData };
      const limits = mergeLimits(updatedUser.membershipTier, get().serverLimits);
      set({ user: updatedUser, limits });
      persistSnapshot(updatedUser);
    }
  },

  // Web ile aynı endpoint: GET /users/me
  refreshUserData: async () => {
    // `applyProfile` ile aynı kuşak koruması: yanıt beklenirken çıkış / başka hesapla
    // giriş olduysa önceki oturumun profili yeni oturuma (ya da çıkış yapmış store'a) yazılmaz.
    const generation = authGeneration;
    try {
      const response = await userApi.getProfile();
      if (generation !== authGeneration || inFlightLogout) return null;
      const mappedUser = mapApiUserToUser(response.data);
      const limits = mergeLimits(mappedUser.membershipTier, get().serverLimits);
      set({ user: mappedUser, limits });
      persistSnapshot(mappedUser);
      return mappedUser;
    } catch (error) {
      logger.error("Failed to refresh user data", { err: safeError(error) });
      logger.captureException(error, {
        level: "warning",
        tags: { flow: "auth.refreshUserData" },
      });
      return null;
    }
  },

  // Helper methods
  canCreateListing: () => {
    const { user, limits } = get();
    if (!user || !limits) return false;
    if (limits.maxListings === -1) return true; // Unlimited
    return user.listingCount < limits.maxListings;
  },

  getRemainingListings: () => {
    const { user, limits } = get();
    if (!user || !limits) return 0;
    if (limits.maxListings === -1) return -1; // Unlimited
    return Math.max(0, limits.maxListings - user.listingCount);
  },

  isVerifiedMember: () => {
    const { user } = get();
    if (!user) return false;

    // Verification criteria for Free members
    const hasCompletedTransaction =
      user.totalSales > 0 || user.totalPurchases > 0;
    const accountOldEnough = user.accountAge >= 30;
    const noDisputes = user.disputeCount === 0;
    const profileComplete = user.profileCompletion >= 80;

    return (
      user.isEmailVerified &&
      user.isPhoneVerified &&
      hasCompletedTransaction &&
      accountOldEnough &&
      noDisputes &&
      profileComplete
    );
  },

  getMembershipLimits: () => {
    const { user, serverLimits } = get();
    return mergeLimits(user?.membershipTier || "free", serverLimits);
  },
}));

export default useAuthStore;
