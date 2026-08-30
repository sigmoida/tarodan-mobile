/**
 * refund-notice · iade matrisi eşiği (delta 17 §1f).
 *
 * Hiçbir ürün kargoya verilmeden iptal → TAM iade. Herhangi bir bacak kargoya
 * verildikten sonra → `totalAmount − shippingAmount`: kargo İADE EDİLMEZ.
 * Eşik, kullanıcının iptal kilidiyle AYNIDIR (bkz. `trade.cancel.lockedHint`
 * yakınındaki `!trade.canCancel && trade.firstWarehouseArrivalAt` koşulu).
 *
 * Bu dosya `TradeActions`'ın `hasShippedLeg` prop'unu doğru okuyup okumadığını
 * (bileşen kablolaması) doğrular — `hasShippedLeg` doğrudan enjekte edilir.
 * Asıl türetme (`pending` shipment'ta hâlâ tam iade mümkün mü?) `derive-v2.test.ts`
 * → `deriveTradeView — hasShippedLeg` bloğunda saf fonksiyon testiyle doğrulanır.
 */
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { TradeActions } from '../[id]/_components/TradeActions';
import trCatalog from '@/i18n/lib/catalog/tr.json';

const NOOP = () => {};
const HANDLERS = {
  setTradeAddressId: NOOP, handleAccept: NOOP, acceptPending: false,
  openReject: NOOP, rejectPending: false, handleCancel: NOOP, cancelPending: false,
  cashPay: NOOP, cashPayPending: false, confirm: NOOP, confirmPending: false,
  openDispute: NOOP,
};

// Repodaki kalıp (bkz. payment-cta.test.tsx): t()'yi anahtarın kendisini döndüren
// bir passthrough olarak sağlar — ancak bu testin doğruluk kaynağı gerçek
// katalog cümlesi olduğundan, incelenen anahtar için gerçek metni döndürür.
function t(key: string) {
  return key === 'trade.shippingNotRefundable'
    ? (trCatalog as any).trade.shippingNotRefundable
    : key;
}

function renderActions(trade: Record<string, unknown>, view: Record<string, unknown>) {
  return render(
    <TradeActions
      trade={{ id: 't1', initiatorId: 'u1', receiverId: 'u2', ...trade } as any}
      id="t1"
      t={t as any}
      isInitiator
      isReceiver={false}
      userId="u1"
      otherPartyId="u2"
      cashPaid={false}
      cashTotal={0}
      isV2={false}
      myPaymentPending={false}
      paidCount={0}
      totalCount={0}
      actions={HANDLERS}
      {...(view as any)}
    />,
  );
}

describe('TradeActions · kargo iadesi uyarısı', () => {
  it('kargoya verilmemişken kargo uyarısı gösterilmez', () => {
    renderActions({ status: 'awaiting_payment' }, { isV2: true, hasShippedLeg: false });
    expect(screen.queryByText(/kargo bedeli iade edilmez/i)).toBeNull();
  });

  it('kargoya verildikten sonra, takas hâlâ iptal edilebiliyorken uyarı gösterilir', () => {
    renderActions(
      { status: 'shipping_to_warehouse', canCancel: true },
      { isV2: true, hasShippedLeg: true },
    );
    expect(screen.getByText(/kargo bedeli iade edilmez/i)).toBeTruthy();
  });

  it('v1 takasta kargoya verilmiş olsa dahi uyarı gösterilmez', () => {
    renderActions(
      { status: 'shipping_to_warehouse', canCancel: true },
      { isV2: false, hasShippedLeg: true },
    );
    expect(screen.queryByText(/kargo bedeli iade edilmez/i)).toBeNull();
  });

  // Uyarı "iptal edersen kargo geri gelmez" der; iptal edilemeyen bir takasta
  // (kilit devreye girmiş ya da terminal durum) yanlış bilgidir.
  it('tamamlanmış takasta uyarı gösterilmez (terminal durum)', () => {
    renderActions(
      { status: 'completed', canCancel: false },
      { isV2: true, hasShippedLeg: true },
    );
    expect(screen.queryByText(/kargo bedeli iade edilmez/i)).toBeNull();
  });

  it('iptal kilidi devredeyken (canCancel false) uyarı gösterilmez', () => {
    renderActions(
      { status: 'shipping_to_warehouse', canCancel: false },
      { isV2: true, hasShippedLeg: true },
    );
    expect(screen.queryByText(/kargo bedeli iade edilmez/i)).toBeNull();
  });
});
