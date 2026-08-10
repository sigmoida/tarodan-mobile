/**
 * Satıcı kargo akışı — ÖNCE OKU.
 *
 * Ödeme tamamlanınca backend kargo kaydını otomatik oluşturuyor. Mobil bugün
 * koşulsuz `POST /shipping` atıyor ve mevcut kayıtta sunucu
 * `400 "Sipariş hazırlanma durumunda değil"` döndürüyor (2026-08-10 ölçümü) —
 * satıcı bu ham mesajı görüyor.
 *
 * `POST` yalnız ONARIM yoludur: kayıt 404 + sipariş `preparing` + kullanıcı satıcı.
 *
 * Elle takip numarası girişi kalktı: numarayı sunucu üretiyor, satıcının yazdığı
 * serbest metin sunucunun `PKG-` düzeniyle çelişiyordu (matris #20).
 */
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

jest.mock('@/lib/api', () => ({
  ordersApi: { markAsPreparing: jest.fn() },
  shippingApi: { getOrderShipments: jest.fn(), createShipment: jest.fn() },
}));
jest.mock('@/ui', () => ({ ...jest.requireActual('@/ui'), appAlert: jest.fn() }));

import { shippingApi } from '@/lib/api';
import { appAlert } from '@/ui';
import { useSaleActions } from '../_hooks/useSaleActions';

const wrapper = ({ children }: { children: React.ReactNode }) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
};

const ORDER = { id: 'o1', status: 'preparing' } as any;

/** Diyaloğu açıp kargoya verme akışını tetikler. */
async function ship() {
  const { result } = renderHook(() => useSaleActions(), { wrapper });
  act(() => result.current.setShipDialog({ visible: true, order: ORDER }));
  await act(async () => { result.current.handleShip(); });
  await waitFor(() => expect(result.current.updateStatusMutation.isPending).toBe(false));
  return result;
}

beforeEach(() => jest.clearAllMocks());

it('kargo kaydı VARSA POST /shipping çağrılmaz', async () => {
  jest.mocked(shippingApi.getOrderShipments).mockResolvedValue({
    data: { id: 's1', orderId: 'o1', provider: 'surat', trackingNumber: 'PKG-X',
            providerTrackingId: null, trackingUrl: null, status: 'label_created' },
  } as any);

  await ship();

  expect(shippingApi.createShipment).not.toHaveBeenCalled();
});

it('kayıt 404 + sipariş preparing ise POST /shipping çağrılır', async () => {
  jest.mocked(shippingApi.getOrderShipments).mockRejectedValue({ response: { status: 404 } });
  jest.mocked(shippingApi.createShipment).mockResolvedValue({ data: { id: 's9' } } as any);

  await ship();

  expect(shippingApi.createShipment).toHaveBeenCalledWith({ orderId: 'o1', provider: 'surat' });
});

/**
 * ONARIM ile ZATEN VAR aynı şey değildir. Hiçbir dalda sipariş durumu
 * değişmiyor (backend `createShipment` yalnız kayıt açar; sipariş `shipped`'e
 * şube kabulüyle geçer) — "Sipariş durumu güncellendi" demek satıcıyı butona
 * tekrar tekrar bastırıyordu. Ölçüm: 13 siparişin 8'inde kayıt zaten VAR.
 */
describe('kargoya verme geri bildirimi', () => {
  const alertText = () => jest.mocked(appAlert).mock.calls.map((c) => c.join(' ')).join('\n');

  it('kayıt zaten varsa "durum güncellendi" DEMEZ', async () => {
    jest.mocked(shippingApi.getOrderShipments).mockResolvedValue({
      data: { id: 's1', orderId: 'o1', provider: 'surat', trackingNumber: 'PKG-X',
              providerTrackingId: null, trackingUrl: null, status: 'label_created' },
    } as any);

    await ship();

    expect(alertText()).not.toMatch(/güncellendi/i);
    expect(alertText()).toContain('Kargo Kaydı Hazır');
    expect(alertText()).toMatch(/şubesine teslim/i);
  });

  it('onarım yapıldıysa kaydın OLUŞTUĞUNU söyler', async () => {
    jest.mocked(shippingApi.getOrderShipments).mockRejectedValue({ response: { status: 404 } });
    jest.mocked(shippingApi.createShipment).mockResolvedValue({ data: { id: 's9' } } as any);

    await ship();

    expect(alertText()).toContain('Kargo Kaydı Oluşturuldu');
    expect(alertText()).not.toMatch(/güncellendi/i);
  });

  it('boş gövdeyi mevcut kayıt saymaz — onarım yolu açık kalır', async () => {
    // `unwrapEnvelope` veri yoksa `{}` döner, `null` değil.
    jest.mocked(shippingApi.getOrderShipments).mockResolvedValue({ data: null } as any);
    jest.mocked(shippingApi.createShipment).mockResolvedValue({ data: { id: 's9' } } as any);

    await ship();

    expect(shippingApi.createShipment).toHaveBeenCalled();
  });
});
