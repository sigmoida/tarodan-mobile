/**
 * PayTR Direct API — imzalı form katmanı (saf, UI'sız).
 *
 * Kart verisi KENDİ API'MİZE ASLA gönderilmez: backend `assertNoRawCardData` ile
 * gövdedeki kart alan adlarını arayıp 400 döner. Akış: `POST /payments/direct-form`
 * imzalı sunucu alanlarını verir, kart alanlarını İSTEMCİ ekler ve tarayıcı
 * (WebView) doğrudan PayTR'ye POST eder.
 *
 * 3DS zorunludur (`non_3d: "0"`), bu yüzden banka sayfası WebView'de render edilir.
 */

/** PayTR'nin tek geçerli ödeme hedefi. Başka bir action gelirse akış iptal edilir. */
export const PAYTR_ACTION = 'https://www.paytr.com/odeme';

export type PaytrField = { name: string; value: string };

export type DirectFormResponse = {
  paymentId: string;
  action: string;
  method?: string;
  fields: PaytrField[];
  requireCvv?: boolean;
  savedCard?: boolean;
  status?: string;
};

export type NewCardInput = {
  holder: string;
  number: string;
  expMonth: string;
  expYear: string;
  cvc: string;
};

type CodedError = Error & { code: string };

const codedError = (code: string, message: string): CodedError => {
  const err = new Error(message) as CodedError;
  err.code = code;
  return err;
};

/**
 * Sunucudan ham kart alanı GELMEMELİ. Geliyorsa ya sunucu sözleşmesi bozulmuş ya
 * araya giren var — her iki durumda akış iptal edilir.
 */
const RAW_CARD_FIELD_NAMES = new Set([
  'card',
  'card_number',
  'cardnumber',
  'cc_owner',
  'cvv',
  'cvc',
  'expiry_month',
  'expiry_year',
]);

/** Karşılaştırma için sondaki eğik çizgiyi at (PayTR ikisini de kabul ediyor). */
const normalizeAction = (action: string) => action.trim().replace(/\/+$/, '');

export function assertSafePaytrForm(res: DirectFormResponse): void {
  if (normalizeAction(res.action ?? '') !== PAYTR_ACTION) {
    throw codedError(
      'PAYTR_BAD_ACTION',
      'Ödeme hedefi beklenmedik bir adres. Güvenliğiniz için işlem durduruldu.',
    );
  }
  if (!Array.isArray(res.fields) || res.fields.length === 0) {
    throw codedError('PAYTR_NO_FIELDS', 'Ödeme formu eksik geldi. Lütfen tekrar deneyin.');
  }
  for (const field of res.fields) {
    if (RAW_CARD_FIELD_NAMES.has(String(field?.name ?? '').toLowerCase())) {
      throw codedError(
        'PAYTR_RAW_CARD_FIELD',
        'Ödeme formu beklenmedik alan içeriyor. Güvenliğiniz için işlem durduruldu.',
      );
    }
  }
}

const digitsOnly = (value: string) => value.replace(/\D/g, '');

export function cardFieldsForNewCard(card: NewCardInput): PaytrField[] {
  const month = digitsOnly(card.expMonth).padStart(2, '0').slice(-2);
  const year = digitsOnly(card.expYear).slice(-2);
  return [
    { name: 'cc_owner', value: card.holder.trim() },
    { name: 'card_number', value: digitsOnly(card.number) },
    { name: 'expiry_month', value: month },
    { name: 'expiry_year', value: year },
    { name: 'cvv', value: digitsOnly(card.cvc) },
  ];
}

export function cardFieldsForSavedCard(cvv?: string): PaytrField[] {
  return cvv ? [{ name: 'cvv', value: digitsOnly(cvv) }] : [];
}

const escapeHtml = (value: string) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

/**
 * WebView'e verilecek auto-submit dokümanı. RN'de DOM yok; POST'u WebView içinde
 * kendini gönderen bir formla yapıyoruz (platformun postUrl API'sine bağımlı kalmadan
 * iOS/Android'de aynı davranış).
 */
export function buildPaytrFormHtml(action: string, fields: PaytrField[]): string {
  const inputs = fields
    .map(
      (f) =>
        `<input type="hidden" name="${escapeHtml(f.name)}" value="${escapeHtml(f.value)}" />`,
    )
    .join('');
  return `<!doctype html><html><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /></head><body><form id="paytr" action="${escapeHtml(action)}" method="POST" accept-charset="UTF-8">${inputs}</form><script>document.getElementById("paytr").submit();</script></body></html>`;
}
