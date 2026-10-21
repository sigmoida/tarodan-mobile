/**
 * İlan formu komisyon önizlemesi — query hook (web `useCommissionPreview` paritesi).
 * Fiyat > 0 VE kategori yoksa sorulmaz; kademe yoksa alan gönderilmez; yanıt
 * `shippingAmount` / `sellerNetAmount` / `packageTierShipping[]` ile normalize edilir.
 */
import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockPreview = jest.fn();
jest.mock('@/lib/api', () => ({
  ordersApi: { getCommissionPreview: (...a: unknown[]) => mockPreview(...a) },
}));

import { useCommissionPreview } from '../_hooks/useCommissionPreview';

function setup(amount: string, categoryId: string, tier = '') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return renderHook(() => useCommissionPreview(amount, categoryId, tier), { wrapper });
}

beforeEach(() => {
  mockPreview.mockReset();
  mockPreview.mockResolvedValue({
    data: {
      sellerFeeAmount: '25',
      withholdingTaxAmount: 1,
      shippingAmount: '50',
      sellerNetAmount: 424,
      packageTierShipping: [
        { code: 'small', sellerShippingAmount: '50' },
        { code: 'large', sellerShippingAmount: 80 },
      ],
    },
  });
});

describe('useCommissionPreview', () => {
  it('fiyat + kategori varken sorar ve yanıtı normalize eder', async () => {
    const { result } = setup('400', 'cat-1', 'large');
    await waitFor(() => expect(result.current.commissionPreview).not.toBeNull());
    expect(mockPreview).toHaveBeenCalledWith({ amount: 400, categoryId: 'cat-1', packageTier: 'large' });
    expect(result.current.commissionEnabled).toBe(true);
    expect(result.current.commissionPreview).toEqual({
      sellerFeeAmount: 25,
      withholdingTaxAmount: 1,
      shippingAmount: 50,
      sellerNetAmount: 424,
      packageTierShipping: [
        { code: 'small', sellerShippingAmount: 50 },
        { code: 'large', sellerShippingAmount: 80 },
      ],
    });
  });

  it('kademe seçilmemişse packageTier gönderilmez (istemci small uydurmaz)', async () => {
    const { result } = setup('400', 'cat-1');
    await waitFor(() => expect(result.current.commissionPreview).not.toBeNull());
    expect(mockPreview).toHaveBeenCalledWith({ amount: 400, categoryId: 'cat-1', packageTier: undefined });
  });

  it('sends the parsed amount, never the typed text (shared TL amount parser)', async () => {
    const { result } = setup('1250,50', 'cat-1');
    await waitFor(() => expect(result.current.commissionPreview).not.toBeNull());
    expect(mockPreview).toHaveBeenCalledWith({ amount: 1250.5, categoryId: 'cat-1', packageTier: undefined });
  });

  it('asks nothing for refused text: "1.000" is never asked as 1 TL', async () => {
    const { result } = setup('1.000', 'cat-1');
    await new Promise((r) => setTimeout(r, 500));
    expect(mockPreview).not.toHaveBeenCalled();
    expect(result.current.commissionEnabled).toBe(false);
  });

  it('kategori yoksa sorulmaz, önizleme yok, enabled=false', async () => {
    const { result } = setup('400', '');
    await new Promise((r) => setTimeout(r, 500));
    expect(mockPreview).not.toHaveBeenCalled();
    expect(result.current).toEqual({
      commissionPreview: null,
      commissionLoading: false,
      commissionError: false,
      commissionEnabled: false,
    });
  });

  it('fiyat boş/0 ise sorulmaz', async () => {
    setup('0', 'cat-1');
    setup('', 'cat-1');
    await new Promise((r) => setTimeout(r, 500));
    expect(mockPreview).not.toHaveBeenCalled();
  });

  it('sunucu hatası → commissionError (eksik girdi değil)', async () => {
    mockPreview.mockRejectedValue(new Error('503'));
    const { result } = setup('400', 'cat-1', 'small');
    await waitFor(() => expect(result.current.commissionError).toBe(true));
    expect(result.current.commissionEnabled).toBe(true);
    expect(result.current.commissionPreview).toBeNull();
  });
});
