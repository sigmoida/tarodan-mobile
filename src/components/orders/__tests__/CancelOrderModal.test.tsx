/**
 * İptal formu — üye ve misafir iptalinin PAYLAŞTIĞI modal.
 *
 * En kritik davranış: gövdede `reasonCode` GİDER. Bu istemci uzun süre yalnız
 * serbest metin `reason` gönderdi ve sunucu `paid`/`preparing` siparişlerde
 * kod olmadan `server.order.cancelReasonRequired` ile 400 attığı için ödenmiş
 * siparişin iptali mobilde hiç çalışmıyordu.
 *
 * İkincisi: modal mutasyondan ÖNCE kapanır (CLAUDE.md §12 — mutasyonun uyarısı
 * `ui-native` Modal açıkken iOS'u donduruyor).
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { CancelOrderModal } from '../CancelOrderModal';
import { DEFAULT_CANCELLATION_REASON } from '@/lib/shared/orderCancellation';

function setup(overrides: Partial<React.ComponentProps<typeof CancelOrderModal>> = {}) {
  const onConfirm = jest.fn();
  const onClose = jest.fn();
  render(
    <CancelOrderModal
      isOpen
      onClose={onClose}
      onConfirm={onConfirm}
      {...overrides}
    />,
  );
  return { onConfirm, onClose };
}

describe('CancelOrderModal', () => {
  it('varsayılan nedeni reasonCode olarak gönderir', () => {
    const { onConfirm } = setup();
    fireEvent.press(screen.getByTestId('cancel-order-confirm'));
    expect(onConfirm).toHaveBeenCalledWith({
      reasonCode: DEFAULT_CANCELLATION_REASON,
      reason: undefined,
    });
  });

  it('boş not gönderMEZ — sunucuya `reason: ""` sızmaz', () => {
    const { onConfirm } = setup();
    fireEvent.press(screen.getByTestId('cancel-order-confirm'));
    expect(onConfirm.mock.calls[0][0].reason).toBeUndefined();
  });

  it('mutasyondan ÖNCE kapanır (iOS donma kuralı)', () => {
    const calls: string[] = [];
    const onClose = jest.fn(() => calls.push('close'));
    const onConfirm = jest.fn(() => calls.push('confirm'));
    render(<CancelOrderModal isOpen onClose={onClose} onConfirm={onConfirm} />);
    fireEvent.press(screen.getByTestId('cancel-order-confirm'));
    expect(calls).toEqual(['close', 'confirm']);
  });

  it('ödemesi alınmış siparişte iade uyarısını gösterir', () => {
    setup({ willRefund: true });
    expect(screen.getByText(/iade edilecek/i)).toBeTruthy();
  });

  it('ödenmemiş siparişte iade uyarısı yerine sade onay metnini gösterir', () => {
    setup({ willRefund: false });
    expect(screen.queryByText(/iade edilecek/i)).toBeNull();
  });

  it('alıcıya `Diğer` seçeneğini sunmaz', () => {
    setup();
    expect(screen.queryByText('Diğer')).toBeNull();
  });
});
