/**
 * B3 inceleme 5 · Kimlik durumunun TEK sorgu tanımı: profil kartı
 * (`useLegalIdentityStatus`), kapı adımı ve `ensureLegalIdentity` aynı
 * anahtarı, fetcher'ı ve yeniden deneme kuralını kullanır.
 */
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { makeTestQueryClient } from '@/test-utils';
import type { LegalIdentityStatus } from '@/lib/shared/legalIdentity';

jest.mock('@/lib/api', () => ({
  legalIdentityApi: { getStatus: jest.fn(), submit: jest.fn() },
}));

import { legalIdentityApi } from '@/lib/api';
import { qk, retryUnlessClientError } from '@/lib/query';
import {
  ensureLegalIdentity,
  legalIdentityQueryOptions,
  useLegalIdentityStatus,
} from '@/hooks/useLegalIdentity';
import { useAuthStore } from '@/stores/authStore';

const mockGetStatus = legalIdentityApi.getStatus as jest.Mock;

const COMPLETE: LegalIdentityStatus = {
  required: true,
  missing: [],
  legalFirstName: 'Ayşe',
  legalLastName: 'Yılmaz',
  nationalIdMasked: '•••••••••46',
  suggestedNationalId: null,
};

beforeEach(() => {
  mockGetStatus.mockReset();
  useAuthStore.setState({ isAuthenticated: true, isLoading: false });
});

describe('legalIdentityQueryOptions', () => {
  it('anahtar merkezi kayıttan, 4xx yeniden denenmez', () => {
    expect(legalIdentityQueryOptions.queryKey).toEqual(qk.legalIdentity.me);
    expect(legalIdentityQueryOptions.retry).toBe(retryUnlessClientError);
  });

  it('profil sorgusunun önbelleği ensureLegalIdentity ile paylaşılır (ikinci istek yok)', async () => {
    mockGetStatus.mockResolvedValue({ data: COMPLETE });
    const client = makeTestQueryClient();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useLegalIdentityStatus(), { wrapper });
    await waitFor(() => expect(result.current.status).toEqual(COMPLETE));

    await expect(ensureLegalIdentity(client)).resolves.toBe(true);
    expect(mockGetStatus).toHaveBeenCalledTimes(1);
  });

  it('ensureLegalIdentity geçici hatada hook\'larla aynı kuralla yeniden dener', async () => {
    mockGetStatus
      .mockRejectedValueOnce({ response: { status: 503 } })
      .mockResolvedValueOnce({ data: COMPLETE });
    const client = makeTestQueryClient();

    await expect(ensureLegalIdentity(client)).resolves.toBe(true);
    // Eskiden `retry:false` → tek istek ve doğrudan fail-open.
    expect(mockGetStatus).toHaveBeenCalledTimes(2);
  });

  it('4xx (uç yok) yeniden denenmez, fail-open hemen döner', async () => {
    mockGetStatus.mockRejectedValue({ response: { status: 404 } });
    await expect(ensureLegalIdentity(makeTestQueryClient())).resolves.toBe(true);
    expect(mockGetStatus).toHaveBeenCalledTimes(1);
  });
});
