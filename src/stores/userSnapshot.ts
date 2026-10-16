import * as SecureStore from "expo-secure-store";
import { SECURE_STORE_OPTIONS } from "@/lib/api/tokenStorage";
import { logger, safeError } from "../services/logger";
import type { User } from "./authStore";

/**
 * Soğuk açılışın ağ beklemeden oturum açabilmesi için kullanıcının KÜÇÜK bir
 * anlık görüntüsü (SecureStore — e-posta / vergi no gibi PII taşır, şifreli depo).
 *
 * Neden: açılış eskiden `GET /users/me`'yi (30 sn zaman aşımı + 401→refresh)
 * splash açıkken bekliyordu; yavaş/çevrimdışı ağda uygulama splash'te kalıyordu.
 * Artık token + bu görüntü okunur, oturum hemen açılır, profil arka planda
 * doğrulanır (`authStore.loadToken`).
 *
 * Yalnız açılışta ihtiyaç duyulan alanlar: kimlik, üyelik kademesi, doğrulama
 * bayrakları, kurumsal başvuru durumu (`BusinessMembershipGuard`), kullanıcı adı.
 * Uzun / nadir alanlar (bio, sosyal bağlantılar, doğum tarihi, telefon) yok —
 * SecureStore değer sınırı 2048 bayt; arka plan doğrulaması tam profili getirir.
 * Bu alanlar BİLİNÇLİ olarak eklenmez (PII + boyut): formunu kullanıcıdan tohumlayan ekranlar
 * (profil düzenleme, telefon doğrulama) `profileValidated`'ı bekler (`@/hooks/useFullProfile`).
 */
export const USER_SNAPSHOT_KEY = "authUserSnapshot";

/** SecureStore'un belgelenmiş değer sınırı (expo-secure-store `VALUE_BYTES_LIMIT`). */
const SNAPSHOT_BYTES_LIMIT = 2048;

const SNAPSHOT_FIELDS = [
  "id",
  "email",
  "displayName",
  "avatar",
  "avatarUrl",
  "membershipTier",
  "isVerified",
  "isEmailVerified",
  "isPhoneVerified",
  "verificationStatus",
  "isSeller",
  "sellerType",
  "companyName",
  "taxId",
  "businessStatus",
  "totalSales",
  "totalPurchases",
  "profileCompletion",
  "disputeCount",
  "listingCount",
  "maxFreeListings",
  "createdAt",
  "rating",
  "totalRatings",
  "username",
  "usernameClaimed",
] as const satisfies readonly (keyof User)[];

/** Sınır aşılırsa önce bunlar düşer (presigned avatar URL'leri uzun; profil gelince döner). */
const DROPPABLE_FIELDS = ["avatarUrl", "avatar"] as const satisfies readonly (keyof User)[];

export type UserSnapshot = Partial<Pick<User, (typeof SNAPSHOT_FIELDS)[number]>> & {
  id: string;
};

const byteLength = (s: string): number => new TextEncoder().encode(s).length;

/** Kullanıcıdan saklanacak JSON'u üretir (sınır aşılırsa avatar alanları düşer). */
export function serializeUserSnapshot(user: User): string | null {
  if (!user?.id) return null;
  const snapshot: Record<string, unknown> = {};
  for (const field of SNAPSHOT_FIELDS) {
    if (user[field] !== undefined) snapshot[field] = user[field];
  }
  let json = JSON.stringify(snapshot);
  if (byteLength(json) > SNAPSHOT_BYTES_LIMIT) {
    for (const field of DROPPABLE_FIELDS) delete snapshot[field];
    json = JSON.stringify(snapshot);
  }
  return byteLength(json) > SNAPSHOT_BYTES_LIMIT ? null : json;
}

/** Saklı JSON'u çözer; bozuk / eksik kimlikli kayıt `null` (açılış eski yola düşer). */
export function parseUserSnapshot(raw: string | null | undefined): UserSnapshot | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || typeof parsed.id !== "string" || !parsed.id) {
      return null;
    }
    return parsed as UserSnapshot;
  } catch {
    return null;
  }
}

/** Görüntüyü yazar. En iyi çaba: hata oturumu etkilemez (sonraki açılış ağı bekler). */
export async function writeUserSnapshot(user: User): Promise<void> {
  const json = serializeUserSnapshot(user);
  try {
    // Token'larla aynı anahtar zinciri erişilebilirliği (`SECURE_STORE_OPTIONS`).
    if (json) await SecureStore.setItemAsync(USER_SNAPSHOT_KEY, json, SECURE_STORE_OPTIONS);
    else await SecureStore.deleteItemAsync(USER_SNAPSHOT_KEY);
  } catch (error) {
    logger.warn("User snapshot write failed", { err: safeError(error) });
  }
}

export async function readUserSnapshot(): Promise<UserSnapshot | null> {
  try {
    return parseUserSnapshot(await SecureStore.getItemAsync(USER_SNAPSHOT_KEY));
  } catch (error) {
    logger.warn("User snapshot read failed", { err: safeError(error) });
    return null;
  }
}

/** Çıkışta silinir (`resetUserStores`) — ortak cihazda önceki hesabın PII'si kalmasın. */
export async function clearUserSnapshot(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(USER_SNAPSHOT_KEY);
  } catch (error) {
    logger.warn("User snapshot clear failed", { err: safeError(error) });
  }
}
