import { create } from 'zustand';
import { runAfterModalClose } from '@/ui/ModalMessage';

/**
 * İhtiyaç anında kimlik isteği — YALNIZ istemci/UI durumu (sunucu verisi
 * React Query'de, `qk.legalIdentity.me`). Bir işlem (ödeme, ilan, banka
 * hesabı…) kimlik isteyince `requested` açılır ve `RequiredStepsGate` kimlik
 * adımını gösterir; adım tamamlanınca ya da üye vazgeçince bekleyen işlem(ler)
 * sonuçla çözülür.
 *
 * Bekleyenlerin `resolve`'ları store'da değil modül kapsamında durur: store
 * yalnız serileştirilebilir durum taşısın, abonelikler fonksiyon değişince
 * gereksiz yere tetiklenmesin.
 */
interface LegalIdentityRequestState {
  requested: boolean;
  /**
   * "Kimlik bilgileriniz kaydedildi" bildirimi bekliyor (web
   * `successMessage: identity.gate.saved`). Kapı katmanı kapanınca gösterilir.
   */
  savedNotice: boolean;
}

export const useLegalIdentityRequestStore = create<LegalIdentityRequestState>(() => ({
  requested: false,
  savedNotice: false,
}));

/** Kayıt başarılı: bildirim kapı kapanınca çıksın. */
export function showLegalIdentitySavedNotice(): void {
  useLegalIdentityRequestStore.setState({ savedNotice: true });
}

export function dismissLegalIdentitySavedNotice(): void {
  useLegalIdentityRequestStore.setState({ savedNotice: false });
}

let waiters: Array<(completed: boolean) => void> = [];

/**
 * Kimlik adımını aç; adım bitince `true` (kimlik tamam, işleme devam), üye
 * vazgeçerse ya da oturum kapanırsa `false` (işlem iptal) ile çözülür. Adım
 * zaten açıksa aynı sonucu bekler — iki işlem iki pencere açmaz.
 */
export function openLegalIdentityRequest(): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    waiters.push(resolve);
    useLegalIdentityRequestStore.setState({ requested: true });
  });
}

/**
 * Açık isteği kapat; bekleyen her işlemi, kapı modalı TAMAMEN kapandıktan
 * SONRA sonuçla çöz.
 *
 * Kapı native tam ekran bir Modal (`FullScreenGate`) ve istek kapanınca
 * ağaçtan sökülür — sökülen Modal'ın `onDismiss`'i gelmez. Bekleyenler aynı
 * tick'te çözülseydi çağıran (ödeme, ilan…) kapı daha kaybolurken devam edip
 * `appAlert` açabilirdi; iOS iki modalı aynı anda sunamaz ve donar
 * (ModalFreeze, CLAUDE.md §12). Bu yüzden ortak `runAfterModalClose`
 * süresi kadar beklenir. Bu arada açılan yeni bir istek kendi listesine
 * yazılır, bu sonuca karışmaz.
 */
export function settleLegalIdentityRequest(completed: boolean): void {
  const pending = waiters;
  waiters = [];
  useLegalIdentityRequestStore.setState({ requested: false });
  if (pending.length === 0) return;
  runAfterModalClose(() => pending.forEach((resolve) => resolve(completed)));
}
