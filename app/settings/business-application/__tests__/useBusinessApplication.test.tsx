/**
 * Kurumsal başvuru controller'ı. Kilit kuralı: application.status === 'under_review'
 * iken detay/paydaş formları ve gönder butonu devre dışı; ancak rejected /
 * revision_requested belgeler için yükleme AÇIK kalır.
 */
import React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

jest.mock('@/lib/api', () => ({
  sellerDocumentsApi: {
    list: jest.fn(),
    getApplication: jest.fn(),
    updateApplication: jest.fn(() => Promise.resolve({ data: {} })),
    addStakeholder: jest.fn(() => Promise.resolve({ data: {} })),
    submit: jest.fn(() => Promise.resolve({ data: {} })),
    appeal: jest.fn(() => Promise.resolve({ data: {} })),
  },
}));
import { sellerDocumentsApi } from '@/lib/api';

import { useBusinessApplication } from '../_hooks/useBusinessApplication';

const wrapper = ({ children }: { children: React.ReactNode }) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
};

beforeEach(() => {
  jest.clearAllMocks();
  (sellerDocumentsApi.list as jest.Mock).mockResolvedValue({ data: [] });
  (sellerDocumentsApi.getApplication as jest.Mock).mockResolvedValue({
    data: { id: 'app-1', status: 'draft', stakeholders: [] },
  });
});

it('başvuru yoksa isMissing true olur', async () => {
  (sellerDocumentsApi.getApplication as jest.Mock).mockRejectedValue({
    response: { status: 404 },
  });
  const { result } = renderHook(() => useBusinessApplication(), { wrapper });
  await waitFor(() => expect(result.current.isLoading).toBe(false));
  expect(result.current.isMissing).toBe(true);
});

it('under_review iken kilitlidir', async () => {
  (sellerDocumentsApi.getApplication as jest.Mock).mockResolvedValue({
    data: { id: 'app-1', status: 'under_review', stakeholders: [] },
  });
  const { result } = renderHook(() => useBusinessApplication(), { wrapper });
  await waitFor(() => expect(result.current.isLocked).toBe(true));
});

it('kilitli olsa bile reddedilen belge yeniden yüklenebilir', async () => {
  (sellerDocumentsApi.getApplication as jest.Mock).mockResolvedValue({
    data: { id: 'app-1', status: 'under_review', stakeholders: [] },
  });
  (sellerDocumentsApi.list as jest.Mock).mockResolvedValue({
    data: [
      { id: 'd1', documentType: 'tax_plate', fileName: 'a.pdf', status: 'rejected', uploadedAt: '' },
      { id: 'd2', documentType: 'contract', fileName: 'b.pdf', status: 'pending', uploadedAt: '' },
    ],
  });
  const { result } = renderHook(() => useBusinessApplication(), { wrapper });
  await waitFor(() => expect(result.current.isLocked).toBe(true));

  expect(result.current.canUpload(result.current.documentFor('tax_plate'))).toBe(true);
  expect(result.current.canUpload(result.current.documentFor('contract'))).toBe(false);
});

it('kilitli değilken yüklenmemiş belge yüklenebilir', async () => {
  const { result } = renderHook(() => useBusinessApplication(), { wrapper });
  await waitFor(() => expect(result.current.isLoading).toBe(false));
  expect(result.current.canUpload(result.current.documentFor('tax_plate'))).toBe(true);
});

it('başvuruyu incelemeye gönderir', async () => {
  const { result } = renderHook(() => useBusinessApplication(), { wrapper });
  await waitFor(() => expect(result.current.isLoading).toBe(false));
  await act(async () => {
    result.current.submitApplication();
  });
  await waitFor(() => expect(sellerDocumentsApi.submit).toHaveBeenCalled());
});

it('belge listesinde paydaş kimliğini stakeholderId ile ayırır', async () => {
  (sellerDocumentsApi.list as jest.Mock).mockResolvedValue({
    data: [
      {
        id: 'd1',
        documentType: 'identity_front',
        fileName: 'a.jpg',
        status: 'approved',
        uploadedAt: '',
        stakeholderId: 'sh-1',
      },
    ],
  });
  const { result } = renderHook(() => useBusinessApplication(), { wrapper });
  await waitFor(() => expect(result.current.isLoading).toBe(false));

  expect(result.current.documentFor('identity_front', 'sh-1')?.id).toBe('d1');
  expect(result.current.documentFor('identity_front', 'sh-2')).toBeUndefined();
});
