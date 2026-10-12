import type { MessageKey } from '@/i18n/lib';
import { CAN_BUY_DIGITAL } from '@/lib/purchases';
import { neutralizeUpsellError } from '@/lib/api/iosNeutralErrors';
import { activatedStatus } from '@/components/listing/_lib/activation';

/** `POST /products/my/renew` yanıtında ilan başına sonuç (apps/api `RenewalItemResult`). */
export type RenewItem =
  | { id: string; ok: true; status: 'active' | 'pending' }
  | { id: string; ok: false; errorKey: string; errorParams?: Record<string, unknown> };

export interface RenewBatch {
  results: RenewItem[];
  /** Doğrudan yayına dönenler. */
  renewed: number;
  /** İçeriği değiştiği / onay izi olmadığı için onaya düşenler. */
  submitted: number;
  failed: number;
}

/** Yanıt zarflı (`{data}`) ya da düz gelebilir. */
export function readRenewBatch(raw: unknown): RenewBatch {
  const body = raw as { data?: RenewBatch } & Partial<RenewBatch>;
  const batch = body?.data?.results ? body.data : body;
  return {
    results: batch?.results ?? [],
    renewed: batch?.renewed ?? 0,
    submitted: batch?.submitted ?? 0,
    failed: batch?.failed ?? 0,
  };
}

/** Bildirimde en çok kaç başarısız ilan tek tek yazılır (kalanı toplam sayıda). */
export const MAX_FAILURE_LINES = 3;

/** Çeviri bağımlılıkları — test edilebilir kalsın diye dışarıdan verilir. */
export interface RenewTexts {
  t: (key: MessageKey, params?: Record<string, string | number>) => string;
  /** Anahtar katalogda var mı (yoksa nötr genel mesaja düşülür). */
  exists: (key: string) => boolean;
  canBuyDigital?: boolean;
}

const GENERIC_FAILURE: MessageKey = 'server.product.renewFailed';

/**
 * Toplu yenilemede ilan başına gelen `errorKey`'i kullanıcının dilinde çizer.
 *
 * Bu sonuç HTTP 201 gövdesinde gelir (hata değil) → axios response interceptor'ı
 * (`neutralizeUpsellError`) ÇALIŞMAZ; dijital satış kapalıyken üyelik satışı
 * ima eden metin burada elle engellenir:
 *  - ilan limiti → sayıyla bilgi metni (yükseltme çağrısı yok),
 *  - kurumsal satış askısı vb. → `iosNeutralErrors` eşlemesi (tek kaynak),
 *  - katalogda olmayan anahtar → genel "ilan yenilenemedi".
 */
export function renewErrorText(
  errorKey: string,
  errorParams: Record<string, unknown> | undefined,
  { t, exists, canBuyDigital = CAN_BUY_DIGITAL }: RenewTexts,
): string {
  const max = errorParams?.maxListings;
  if (!canBuyDigital && errorKey === 'server.product.listingLimitReached' && max != null) {
    return t('listing.limitReachedInfo', { count: Number(max) });
  }
  const text = exists(errorKey)
    ? t(errorKey as MessageKey, (errorParams ?? {}) as Record<string, string | number>)
    : t(GENERIC_FAILURE);
  // Eşlemeyi yeniden yazmak yerine interceptor'ın kullandığı fonksiyon: hem anahtar
  // eşlemesi hem "üyeliğinizi yükseltin" türü düz metin yakalaması tek yerde kalır.
  const probe = { response: { data: { i18nKey: errorKey, message: text as unknown } } };
  neutralizeUpsellError(probe, (k) => t(k as MessageKey), canBuyDigital);
  return typeof probe.response.data.message === 'string' ? probe.response.data.message : text;
}

/** Başarısız ilanların satırları ("başlık: neden"). */
export function renewalFailureLines(
  batch: RenewBatch,
  titleOf: (id: string) => string,
  texts: RenewTexts,
): string[] {
  return batch.results
    .filter((item): item is Extract<RenewItem, { ok: false }> => item.ok === false)
    .slice(0, MAX_FAILURE_LINES)
    .map((item) =>
      texts.t('profile.expiredListings.failedItem', {
        title: titleOf(item.id),
        reason: renewErrorText(item.errorKey, item.errorParams, texts),
      }),
    );
}

/** Özet bildirim gövdesi; `isError` yalnız HİÇBİR ilan yenilenemediyse true. */
export function renewSummary(
  batch: RenewBatch,
  titleOf: (id: string) => string,
  texts: RenewTexts,
): { isError: boolean; message: string } {
  const { t } = texts;
  const lines: string[] = [];
  if (batch.renewed > 0) lines.push(t('profile.expiredListings.bulkRenewed', { count: batch.renewed }));
  if (batch.submitted > 0) lines.push(t('profile.expiredListings.bulkSubmitted', { count: batch.submitted }));
  if (batch.failed > 0) {
    lines.push(t('profile.expiredListings.bulkFailed', { count: batch.failed }));
    lines.push(...renewalFailureLines(batch, titleOf, texts));
  }
  return {
    isError: batch.failed > 0 && batch.renewed + batch.submitted === 0,
    message: lines.join('\n'),
  };
}

/**
 * Süresi dolan ilanın TEK yenilemesinin mesajı (web `profile.expiredListings.*`):
 * yayına döndü ya da içeriği değiştiği için onaya düştü. Statü okuma kuralı
 * (`activatedStatus`) düzenleme formuyla ortaktır.
 */
export function renewMessageKey(
  response: Parameters<typeof activatedStatus>[0],
): 'profile.expiredListings.renewed' | 'profile.expiredListings.submitted' {
  return activatedStatus(response) === 'active'
    ? 'profile.expiredListings.renewed'
    : 'profile.expiredListings.submitted';
}
