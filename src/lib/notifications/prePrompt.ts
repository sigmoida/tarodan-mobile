import { readStoredValue, writeStoredValue } from '@/lib/storage/lazyAsyncStorage';
import { canPromptFor, readNotificationPermission } from '@/lib/permissions';
import { useAuthStore } from '@/stores/authStore';
import {
  useNotificationPromptStore,
  type NotificationPromptReason,
} from '@/stores/notificationPromptStore';

/**
 * Bildirim izni ön-istemi (soft pre-prompt): sistem diyaloğu açılıştan kaldırıldı; izin, değer
 * anında (ilk mesaj gönderildi, teklif verildi, sipariş ödendi) KENDİ sheet'imizle istenir.
 * Kullanıcı "Bildirimleri Aç" derse sistem diyaloğu gelir (iOS tek hakkı boşa harcanmaz).
 *
 * Gösterim kuralı:
 * - oturum açık ve izin SORULABİLİR (hiç sorulmadı ya da Android'de bir kez reddedildi);
 * - "Şimdi Değil" sonrası `PRE_PROMPT_COOLDOWN_MS` boyunca tekrar sorulmaz;
 * - bir JS oturumunda en çok bir kez.
 */
export const PRE_PROMPT_COOLDOWN_MS = 14 * 24 * 60 * 60 * 1000;
/** Değer anından sonra sheet'in açılma gecikmesi (önceki modal kapanışı bitsin). */
export const PRE_PROMPT_SHOW_DELAY_MS = 800;
const DISMISSED_AT_KEY = 'notifications.prePrompt.dismissedAt';

let shownThisSession = false;

async function dismissedRecently(now: number): Promise<boolean> {
  try {
    const raw = await readStoredValue(DISMISSED_AT_KEY);
    const at = raw ? Number(raw) : NaN;
    return Number.isFinite(at) && now - at < PRE_PROMPT_COOLDOWN_MS;
  } catch {
    return false;
  }
}

/** Değer anında çağrılır; uygunsa sheet'i açar. Fırlatmaz, beklenmesi gerekmez. */
export async function offerNotificationPrompt(reason: NotificationPromptReason): Promise<boolean> {
  try {
    if (shownThisSession) return false;
    if (!useAuthStore.getState().isAuthenticated) return false;
    if (useNotificationPromptStore.getState().reason) return false;
    const permission = await readNotificationPermission();
    if (!canPromptFor(permission)) return false;
    if (await dismissedRecently(Date.now())) return false;
    shownThisSession = true;
    // Tetikleyen akışın kapanan modalı (teklif modalı) / toast'u yerleşsin: kapanış animasyonu
    // sürerken ikinci bir native sunum (sheet) iOS'u kilitleyebilir (CLAUDE.md §12).
    await new Promise((resolve) => setTimeout(resolve, PRE_PROMPT_SHOW_DELAY_MS));
    if (!useAuthStore.getState().isAuthenticated) return false;
    useNotificationPromptStore.getState().show(reason);
    return true;
  } catch {
    return false;
  }
}

/** "Şimdi Değil": bekleme süresi başlar. */
export async function recordPrePromptDismissed(now = Date.now()): Promise<void> {
  try {
    await writeStoredValue(DISMISSED_AT_KEY, String(now));
  } catch {
    /* en iyi çaba */
  }
}

/** YALNIZ TEST. */
export function resetPrePromptForTests(): void {
  shownThisSession = false;
}
