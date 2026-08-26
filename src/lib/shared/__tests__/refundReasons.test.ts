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
 * girmesi gerekiyor. Bilinmeyen kod SESSİZCE düşmez — ham kodla gösterilir.
 *
 * **2026-08-26: enum artık DOĞRULANDI.** `POST /orders/:id/refund-requests`
 * geçersiz bir kodda tam listeyi geri veriyor (staging):
 *
 *   delivery_delayed, changed_mind, damaged, wrong_item, not_as_described,
 *   missing_parts, counterfeit, defective, buyer_damaged, lost_in_transit, other
 *
 * `defective` ve `buyer_damaged` o güne kadar sözlükte YOKTU: bu kodu taşıyan
 * talep ekranda ham snake_case basılıyordu ve alıcı web'de seçebildiği iki
 * nedeni burada seçemiyordu.
 */
import {
  REFUND_REASONS,
  refundReasonConfig,
  refundReasonLabel,
  REFUND_REASON_OPTIONS,
  BUYER_SELECTABLE_REFUND_REASONS,
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

  // ESKİ kural "`other` en sonda dursun"du. Web `other`'ı alıcıya HİÇ
  // sunmuyor (politika çözümü olmayan serbest kova) ve mobil sunuyordu — bu
  // bir sıralama tercihi değil, parite farkıydı. Kural artık web'inkiyle aynı.
  it('alıcıya `other` sunmaz — serbest kova seçilemez', () => {
    expect(REFUND_REASON_OPTIONS.map((o) => o.value)).not.toContain('other');
  });

  it('`lost_in_transit` de sunulmaz (operasyonel tespit, alıcı beyanı değil)', () => {
    expect(REFUND_REASON_OPTIONS.map((o) => o.value)).not.toContain('lost_in_transit');
  });

  it('seçilebilir listeden TÜRETİLİR — elle yazılmış ikinci bir kopya yok', () => {
    expect(REFUND_REASON_OPTIONS.map((o) => o.value)).toEqual([
      ...BUYER_SELECTABLE_REFUND_REASONS,
    ]);
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

describe('sunucu enum’u ile sözlük', () => {
  it('sözlük enum’un HER değerini tanır — ham kod basılmaz', () => {
    for (const reason of REFUND_REASONS) {
      expect(refundReasonConfig[reason]).toBeDefined();
      expect(refundReasonLabel(reason)).not.toBe(reason);
    }
  });

  it('sözlükte enum dışı uydurma kod yok', () => {
    expect(Object.keys(refundReasonConfig).sort()).toEqual([...REFUND_REASONS].sort());
  });

  it('web’de seçilebilen defective / buyer_damaged burada da seçilebilir', () => {
    const values = REFUND_REASON_OPTIONS.map((o) => o.value);
    expect(values).toContain('defective');
    expect(values).toContain('buyer_damaged');
  });
});
