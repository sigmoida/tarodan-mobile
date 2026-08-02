/**
 * İade nedeni sözlüğü — TEK kaynak.
 *
 * Aynı `reason → etiket` haritası dört ayrı dosyada, üç farklı sürümle
 * yazılmıştı: seçicide "Fikrim değişti / vazgeçtim", iki listede "Vazgeçtim",
 * `status-configs`'ta "Fikrimi Değiştirdim". Kapsam da farklıydı — yalnız
 * `status-configs` `counterfeit`/`lost_in_transit` biliyordu, diğer üçünde
 * başka bir yerde açılmış böyle bir talep etiketsiz kalıyordu (CLAUDE.md §5).
 *
 * `delivery_delayed` delta §15 ile eklendi: satıcı kusuru sayılıyor, seçiciye
 * girmesi gerekiyor. Sunucunun tam enum listesi doğrulanamadı, o yüzden
 * bilinmeyen kod SESSİZCE düşmez — ham kodla gösterilir.
 */
import {
  refundReasonConfig,
  refundReasonLabel,
  REFUND_REASON_OPTIONS,
} from '../status-configs';

describe('refundReasonLabel', () => {
  it('labels every reason the dictionary knows', () => {
    Object.keys(refundReasonConfig).forEach((code) => {
      expect(refundReasonLabel(code)).toBe(refundReasonConfig[code]!.label);
    });
  });

  it('falls back to the raw code instead of rendering nothing', () => {
    expect(refundReasonLabel('a_reason_added_later')).toBe('a_reason_added_later');
  });

  it('handles a missing reason without throwing', () => {
    expect(refundReasonLabel(undefined)).toBe('');
    expect(refundReasonLabel('')).toBe('');
  });
});

describe('REFUND_REASON_OPTIONS', () => {
  it('offers delivery_delayed, accepted by the API since the 2026-08-02 delta', () => {
    expect(REFUND_REASON_OPTIONS.map((o) => o.value)).toContain('delivery_delayed');
  });

  it('offers only codes the dictionary can label', () => {
    REFUND_REASON_OPTIONS.forEach((option) => {
      expect(refundReasonConfig[option.value]).toBeDefined();
      expect(option.label).toBe(refundReasonConfig[option.value]!.label);
    });
  });

  it('keeps "other" last so the specific reasons are read first', () => {
    expect(REFUND_REASON_OPTIONS[REFUND_REASON_OPTIONS.length - 1]!.value).toBe('other');
  });

  it('is built without a non-null assertion that could crash the module', () => {
    // Mutasyon denetiminde çıktı: liste sözlükte OLMAYAN bir koda atıfta
    // bulunursa `refundReasonConfig[value]!.label` import anında TypeError
    // atıyordu — iade ekranı komple beyaz ekran olurdu, tek bir yazım hatası
    // yüzünden. Kaynağı okuyup iddiayı doğrudan yasaklıyoruz.
    const source = require('fs').readFileSync(
      require('path').resolve(__dirname, '../status-configs.ts'),
      'utf8',
    );
    const optionsBlock = source.slice(source.indexOf('REFUND_REASON_OPTIONS'));
    expect(optionsBlock).not.toContain('refundReasonConfig[value]!');
  });
});
