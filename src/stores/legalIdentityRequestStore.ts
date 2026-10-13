import { create } from 'zustand';

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
}

export const useLegalIdentityRequestStore = create<LegalIdentityRequestState>(() => ({
  requested: false,
}));

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

/** Açık isteği kapat ve bekleyen her işlemi sonuçla çöz. */
export function settleLegalIdentityRequest(completed: boolean): void {
  const pending = waiters;
  waiters = [];
  useLegalIdentityRequestStore.setState({ requested: false });
  pending.forEach((resolve) => resolve(completed));
}
