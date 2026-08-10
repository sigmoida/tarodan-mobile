/**
 * payment-cta · v2 ödeme kapısı (delta 17 §1b, §1e).
 *
 * v1: yalnız `cashPayerId` ödeyendi. v2: EŞİT takasta bile iki taraf da öder;
 * kapı "kendi cashPayments satırım pending mi?"dir. "1/2 ödendi" bir TAKILMA
 * DEĞİL, meşru ara durumdur ve öyle gösterilir.
 */
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { TradeActions } from '../[id]/_components/TradeActions';

// Repodaki kalıp (bkz. detail.test.tsx): react-i18next mock'u, t()'yi anahtarın
// kendisini döndüren bir passthrough olarak sağlar.
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    language: 'tr',
  }),
}));

const NOOP = () => {};
const HANDLERS = {
  setTradeAddressId: NOOP, handleAccept: NOOP, acceptPending: false,
  openReject: NOOP, rejectPending: false, handleCancel: NOOP, cancelPending: false,
  cashPay: NOOP, cashPayPending: false, confirm: NOOP, confirmPending: false,
  openDispute: NOOP,
};

function renderActions(trade: Record<string, unknown>, view: Record<string, unknown>) {
  const t = (key: string) => key;
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

describe('TradeActions · ödeme CTA kapısı', () => {
  it('eşit takasta (cashAmount 0) kendi satırım pending ise ödeme CTA çizilir', () => {
    // trade.cashPayerId YOK, cashAmount 0 — v1 kapısı bunu gizlerdi.
    renderActions(
      { status: 'awaiting_payment', cashAmount: 0 },
      { isV2: true, myPaymentRow: { totalAmount: 310 }, myPaymentPending: true },
    );
    expect(screen.getByTestId('cash-pay-button')).toBeTruthy();
    // Tutar SUNUCUDAN: `myPaymentRow.totalAmount`. `cashTotal`a (burada 0)
    // dönülürse buton "0,00 TL" yazar — varlık kontrolü bunu yakalamaz.
    expect(screen.getByText('payment.pay — 310,00 TL')).toBeTruthy();
  });

  it('kendi satırım completed, karşı taraf pending ise bekleme durumu çizilir', () => {
    renderActions(
      { status: 'awaiting_payment' },
      { isV2: true, myPaymentPending: false, paidCount: 1, totalCount: 2 },
    );
    expect(screen.getByText('trade.waitingCounterpartyPayment')).toBeTruthy();
    expect(screen.queryByTestId('cash-pay-button')).toBeNull();
  });

  it('v1 takasta eski cashPayerId kapısı korunur', () => {
    renderActions(
      { status: 'awaiting_payment', cashPayerId: 'u1', cashAmount: 500 },
      { isV2: false },
    );
    expect(screen.getByTestId('cash-pay-button')).toBeTruthy();
    // v1 yolu `cashTotal` yoksa `trade.cashAmount`a döner — o da sunucu alanı.
    expect(screen.getByText('payment.pay — 500,00 TL')).toBeTruthy();
  });
});
