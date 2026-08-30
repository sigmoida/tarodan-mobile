/**
 * Sepetin tamamını iptal — kapı kuralı.
 *
 * Uç staging'de doğrulandı (2026-08-26): uydurma bir kimlikle
 * `404 {"i18nKey":"server.order.groupNotFound"}` dönüyor, yani route VAR.
 * Web bunu 2026-08-12'den beri sunuyor; mobilde grup ekranı salt okunurdu.
 *
 * Kapı kargoya devirden ÖNCEyi arıyor. `status` burada UI durumu
 * (`apiStatusToUi`): sunucunun `paid` + `preparing` ikilisi tek bir
 * `processing`e iniyor — bu yüzden kural sunucu adlarıyla değil, UI adlarıyla
 * yazılmalı. (İlk yazımda `'preparing'` arandı ve tip bunu yakaladı.)
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';

const hookSource = readFileSync(
  resolve(__dirname, '../_hooks/useOrderGroup.ts'),
  'utf8',
);

describe('grup iptali kapısı', () => {
  it('yalnız kargo öncesi UI durumlarını kabul eder', () => {
    expect(hookSource).toContain("['pending', 'processing']");
  });

  it('sunucu durum adlarını (`paid`/`preparing`) doğrudan aramaz', () => {
    // Bunlar `apiStatusToUi` tarafından `processing`e indirgeniyor; burada
    // aranırlarsa kapı HİÇBİR ZAMAN açılmaz ve buton hiç görünmez.
    const gate = hookSource.slice(hookSource.indexOf('CANCELLABLE_UI_STATUSES'));
    expect(gate).not.toContain("=== 'preparing'");
    expect(gate).not.toContain("=== 'paid'");
  });

  it('iptal edilmiş bir kalem varsa grup iptali sunulmaz', () => {
    expect(hookSource).toContain("o.cancellationType !== 'iptal'");
  });

  it('gövde tekil iptalle aynı sözleşmeyi kullanır (reasonCode zorunlu)', () => {
    expect(hookSource).toContain('reasonCode: OrderCancellationReason');
  });
});
