/**
 * Zorunlu adımlar — kapatılamaz tam ekran adımların TEK sırası ve TEK montaj
 * noktası (`RequiredStepsGate`, kök düzende). Web `apps/web/src/lib/requiredSteps.ts`
 * ile aynı kurallar: aynı anda yalnız BİR adım gösterilir, iki kapı üst üste
 * binmez; biri tamamlanınca sıradaki açılır.
 *
 * Web'den fark (Apple 5.1.1): web'de yasal kimlik girişte istenir; mobilde
 * kimlik İHTİYAÇ ANINDA istenir. Yine de aynı sıraya eklenecek bir adımdır
 * (B3): "durumu" girişte değil, bir işlem kimlik istediğinde `pending` olur.
 * Sıra hukuki önceliktir: önce sözleşme onayları (kimlik verisini işlemenin
 * dayanağı KVKK metnidir), sonra kimlik.
 *
 * Zorlama yalnız istemcidedir: sunucu bekleyen adımı olan üyenin isteklerini
 * reddetmez. Bu yüzden istek başarısız olursa adım `done` sayılır (fail-open).
 */
export const REQUIRED_STEPS = ['consents'] as const;
export type RequiredStep = (typeof REQUIRED_STEPS)[number];

/**
 * - `pending`: üye bu adımı tamamlamalı;
 * - `done`: tamam, muaf ya da istek başarısız (kapı açık kalır);
 * - `unknown`: durum henüz yükleniyor.
 */
export type RequiredStepState = 'pending' | 'done' | 'unknown';

/** Bir sorgunun durumu → adım durumu (her adımın hook'u bunu kullanır). */
export function requiredStepState(input: {
  /** Sorgu çalışıyor mu (giriş yapmış üye). */
  enabled: boolean;
  /** İlk veri henüz gelmedi. */
  isPending: boolean;
  /** Veri geldi ve üyenin yapacağı bir şey var. */
  needed: boolean;
}): RequiredStepState {
  if (!input.enabled) return 'done';
  if (input.isPending) return 'unknown';
  return input.needed ? 'pending' : 'done';
}

/**
 * Gösterilecek adım: sıradaki İLK `pending`. Önceki bir adım hâlâ `unknown`
 * ise sonraki gösterilmez (beklenir) — aksi hâlde sonraki pencere açılır,
 * önceki sorgu gelince onun yerini alır ve pencereler göz kırpar.
 */
export function activeRequiredStep(
  states: Record<RequiredStep, RequiredStepState>,
): RequiredStep | null {
  for (const step of REQUIRED_STEPS) {
    const state = states[step];
    if (state === 'unknown') return null;
    if (state === 'pending') return step;
  }
  return null;
}
