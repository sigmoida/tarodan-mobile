/**
 * payments-card · v2 iki taraflı ödeme kartı (delta 17 §1a).
 *
 * Toplam SUNUCUDAN gelir: `tradeFeeAmount + shippingAmount + amount = totalAmount`.
 * `amount + commission` türetmesi v2'de YANLIŞ sonuç verir ve bu kartta hiç geçmez.
 */
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { TradePaymentsCard } from '../[id]/_components/TradePaymentsCard';
import { TradeCashCard } from '../[id]/_components/TradeCashCard';
import { TradeCostPreviewCard } from '../[id]/_components/TradeCostPreviewCard';

const V2_VIEW = {
  isV2: true,
  myPaymentRow: { id: 'c1', payerId: 'u1', amount: 0, tradeFeeAmount: 120, shippingAmount: 190, totalAmount: 310, status: 'completed' },
  theirPaymentRow: { id: 'c2', payerId: 'u2', amount: 500, tradeFeeAmount: 120, shippingAmount: 190, totalAmount: 810, status: 'pending' },
  paidCount: 1,
  totalCount: 2,
} as any;

describe('TradePaymentsCard', () => {
  it('kendi satırımın toplamını sunucudan gelen totalAmount olarak basar', () => {
    render(<TradePaymentsCard view={V2_VIEW} otherPartyName="Karşı" />);
    expect(screen.getByText('310,00 TL')).toBeTruthy();
    expect(screen.getByText('810,00 TL')).toBeTruthy();
  });

  it('hizmet bedeli ve kargo satırlarını ayrı gösterir', () => {
    render(<TradePaymentsCard view={V2_VIEW} otherPartyName="Karşı" />);
    expect(screen.getAllByText('120,00 TL').length).toBeGreaterThan(0);
    expect(screen.getAllByText('190,00 TL').length).toBeGreaterThan(0);
  });

  it('v1 takasta hiç çizmez', () => {
    const { toJSON } = render(
      <TradePaymentsCard view={{ ...V2_VIEW, isV2: false } as any} otherPartyName="Karşı" />,
    );
    expect(toJSON()).toBeNull();
  });

  // Kabul EDİLMEMİŞ v2 takas: `isV2` true (quote dolu) ama `cashPayments` boş.
  // Kapı yalnız `isV2` olsaydı "0/0 ödeme tamamlandı" yazan boş kabuk çizilirdi.
  it('kilitli satır yokken (kabul edilmemiş v2) hiç çizmez', () => {
    const { toJSON } = render(
      <TradePaymentsCard
        view={{ isV2: true, myPaymentRow: null, theirPaymentRow: null, paidCount: 0, totalCount: 0 } as any}
        otherPartyName="Karşı"
      />,
    );
    expect(toJSON()).toBeNull();
  });

  // Delta 19 (staging 2026-08-26): `tradeFeeDiscountAmount` cashPayments satırının
  // İÇİNDE dönüyor. `tradeFeeAmount` zaten indirilmiş tutar — indirim satırı yalnız
  // AÇIKLAR, hiçbir toplamdan tekrar düşülmez.
  it('hizmet bedeli kampanya indirimini eksi işaretiyle ayrı satırda gösterir', () => {
    const discounted = {
      ...V2_VIEW,
      myPaymentRow: { ...V2_VIEW.myPaymentRow, tradeFeeAmount: 90, tradeFeeDiscountAmount: 30, totalAmount: 280 },
    };
    render(<TradePaymentsCard view={discounted as any} otherPartyName="Karşı" />);
    expect(screen.getByText('−30,00 TL')).toBeTruthy();
    // Toplam SUNUCUDAN gelir; indirim satırı onu değiştirmez.
    expect(screen.getByText('280,00 TL')).toBeTruthy();
  });

  it('indirim 0 iken satırı hiç çizmez (indirimsiz takasların hepsi 0 döndürüyor)', () => {
    const zeroDiscount = {
      ...V2_VIEW,
      myPaymentRow: { ...V2_VIEW.myPaymentRow, tradeFeeDiscountAmount: 0 },
    };
    render(<TradePaymentsCard view={zeroDiscount as any} otherPartyName="Karşı" />);
    expect(screen.queryByText('Hizmet bedeli indirimi')).toBeNull();
  });

  it('alan hiç gelmediğinde de satırı çizmez (eski gövde şekli)', () => {
    render(<TradePaymentsCard view={V2_VIEW} otherPartyName="Karşı" />);
    expect(screen.queryByText('Hizmet bedeli indirimi')).toBeNull();
  });

  it('hizmet bedeli 0 olsa da satırı çizer (0 TL meşru konfigürasyon)', () => {
    const zeroFee = {
      ...V2_VIEW,
      myPaymentRow: { ...V2_VIEW.myPaymentRow, tradeFeeAmount: 0, totalAmount: 190 },
    };
    render(<TradePaymentsCard view={zeroFee as any} otherPartyName="Karşı" />);
    expect(screen.getAllByText('0,00 TL').length).toBeGreaterThan(0);
  });
});

const CASH_TRADE = {
  cashAmount: 500,
  cashPayerId: 'u1',
} as any;

describe('TradeCashCard · v1/v2 kapısı', () => {
  it('isV2=true ise geçerli cashAmount olsa da hiç çizmez (TradePaymentsCard ile çakışmasın)', () => {
    const { toJSON } = render(
      <TradeCashCard
        trade={CASH_TRADE}
        userId="u1"
        otherPartyName="Karşı"
        cashPaid={false}
        cashCommission={0}
        cashTotal={0}
        isV2={true}
      />,
    );
    expect(toJSON()).toBeNull();
  });

  it('isV2=false ve geçerli cashAmount ile çizer (kapı tek yönlü değil)', () => {
    const { toJSON } = render(
      <TradeCashCard
        trade={CASH_TRADE}
        userId="u1"
        otherPartyName="Karşı"
        cashPaid={false}
        cashCommission={0}
        cashTotal={0}
        isV2={false}
      />,
    );
    expect(toJSON()).not.toBeNull();
  });
});

/**
 * Kilitli snapshot ile canlı önizleme AYNI ANDA çizilmez.
 *
 * `payment-quote` kabul EDİLMİŞ takaslarda da dolu gövde döndürüyor (2026-08-09
 * ölçümü §4). İki kart yan yana çizilseydi kullanıcı, PayTR'nin fiilen çekeceği
 * snapshot tutarının yanında canlı bir yeniden fiyatlama görürdü — tarife
 * değiştiyse iki farklı tutar. Kapılar TAMAMLAYICI: satır varsa ödemeler kartı,
 * yoksa önizleme kartı.
 */
const QUOTE_SIDE = { serviceFee: 120, shipping: 190, cashDifference: 0, total: 310 } as any;

describe('TradePaymentsCard ↔ TradeCostPreviewCard tamamlayıcılığı', () => {
  it('kilitli satır VARKEN: ödemeler kartı çizilir, önizleme çizilmez', () => {
    const payments = render(<TradePaymentsCard view={V2_VIEW} otherPartyName="Karşı" />);
    const preview = render(
      <TradeCostPreviewCard mine={QUOTE_SIDE} theirs={QUOTE_SIDE} lockedPaymentCount={V2_VIEW.totalCount} />,
    );
    expect(payments.toJSON()).not.toBeNull();
    expect(preview.toJSON()).toBeNull();
  });

  it('kilitli satır YOKKEN: önizleme çizilir, ödemeler kartı çizilmez (ekran bilgisiz kalmaz)', () => {
    const emptyView = { isV2: true, myPaymentRow: null, theirPaymentRow: null, paidCount: 0, totalCount: 0 } as any;
    const payments = render(<TradePaymentsCard view={emptyView} otherPartyName="Karşı" />);
    const preview = render(
      <TradeCostPreviewCard mine={QUOTE_SIDE} theirs={QUOTE_SIDE} lockedPaymentCount={emptyView.totalCount} />,
    );
    expect(payments.toJSON()).toBeNull();
    expect(preview.toJSON()).not.toBeNull();
  });
});

/**
 * Ertelenmiş madde — `uid` çözülmemişken (auth rehydrate penceresi) İKİ KART DA
 * gizli kalıyordu: satırlar `uid`'e göre seçildiği için ikisi de `null` oluyor,
 * ödeme kartı çizmiyordu; maliyet önizlemesi ise `totalCount > 0` olduğu için
 * zaten kapalıydı. Kullanıcı o an ödeme bölümünü hiç görmüyordu.
 *
 * İki kapı aynı sinyalin iki yüzü olmalı: satır SAYISI (`totalCount`) — kim
 * olduğumuzdan bağımsız. Böylece her durumda tam olarak biri çizilir.
 */
describe('uid çözülmemiş pencere · kartlardan biri MUTLAKA çizilir', () => {
  const NO_UID_VIEW = {
    isV2: true,
    myPaymentRow: null,
    theirPaymentRow: null,
    paidCount: 1,
    totalCount: 2,
  } as any;

  it('ödeme kartı satır sayısına bakar, kendi satırıma değil', () => {
    const { toJSON } = render(<TradePaymentsCard view={NO_UID_VIEW} otherPartyName="Karşı" />);
    expect(toJSON()).not.toBeNull();
  });

  it('maliyet önizlemesi kilitli satır varken yine çizmez (tamamlayıcı kapı)', () => {
    const { toJSON } = render(
      <TradeCostPreviewCard
        mine={{ serviceFee: 1, shipping: 1, cashDifference: 0, total: 2, feeLines: [] } as any}
        theirs={{ serviceFee: 1, shipping: 1, cashDifference: 0, total: 2, feeLines: [] } as any}
        lockedPaymentCount={NO_UID_VIEW.totalCount}
      />,
    );
    expect(toJSON()).toBeNull();
  });
});
