/**
 * Ölü ödeme anahtarları geri gelmesin: "kartımı sakla" metni web anahtarlarından
 * (`checkout.saveCardPaytr`, `checkout.saveCardForRenewal`) geliyor; eski
 * `payment.saveCardForFuture` / `payment.saveCardForLater` hiçbir yerde
 * kullanılmıyordu ve iki katalogdan silindi.
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '../../../..');
const DEAD = ['saveCardForFuture', 'saveCardForLater'];

it.each(['tr', 'en'])('%s kataloğunda payment.saveCardFor{Future,Later} yok', (lang) => {
  const catalog = JSON.parse(readFileSync(`${ROOT}/src/i18n/lib/catalog/${lang}.json`, 'utf8'));
  for (const key of DEAD) expect(catalog.payment).not.toHaveProperty(key);
});

it('üretilen anahtar tipinde de yok', () => {
  const keys = readFileSync(`${ROOT}/src/i18n/lib/generated/keys.ts`, 'utf8');
  for (const key of DEAD) expect(keys).not.toContain(`"payment.${key}"`);
});

// The old installment info keys had no reader (web, API or mobile) and were removed with the
// installment options endpoint (ADR 0019, A3); they must not come back.
const DEAD_SERVER = ['installmentInfoFetchFailed', 'installmentInfoUnavailable', 'installmentResponseInvalid'];

it.each(['tr', 'en'])('%s catalog has no server.payment.installmentInfo* / installmentResponseInvalid', (lang) => {
  const catalog = JSON.parse(readFileSync(`${ROOT}/src/i18n/lib/catalog/${lang}.json`, 'utf8'));
  for (const key of DEAD_SERVER) expect(catalog.server.payment).not.toHaveProperty(key);
});
