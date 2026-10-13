/**
 * B3 inceleme 5 · Kimlik durumunun TEK sorgu tanımı: profil kartı
 * (`useLegalIdentityStatus`), kapı adımı ve `ensureLegalIdentity` aynı
 * anahtarı, fetcher'ı ve yeniden deneme kuralını kullanır.
 */
import { act, renderHook, waitFor } from '@testing-library/react-native';
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
  useRequireLegalIdentity,
} from '@/hooks/useLegalIdentity';
import {
  settleLegalIdentityRequest,
  useLegalIdentityRequestStore,
} from '@/stores/legalIdentityRequestStore';
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

describe('useRequireLegalIdentity (B4)', () => {
  const MISSING: LegalIdentityStatus = {
    ...COMPLETE,
    missing: ['legalFirstName', 'legalLastName', 'nationalId'],
    legalFirstName: null,
    legalLastName: null,
    nationalIdMasked: null,
  };

  function setup() {
    const client = makeTestQueryClient();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    return renderHook(() => useRequireLegalIdentity(), { wrapper });
  }

  afterEach(() => act(() => settleLegalIdentityRequest(false)));

  it('kontrol sürerken ikinci çağrı false döner (çift basış ikinci işlemi başlatmaz)', async () => {
    let resolveStatus: (v: unknown) => void = () => {};
    mockGetStatus
      .mockImplementationOnce(() => new Promise((r) => (resolveStatus = r)))
      // Test istemcisi gcTime 0: önbellek düşmüş olabilir, sonraki kontrol yeniden sorar.
      .mockResolvedValue({ data: COMPLETE });
    const { result } = setup();

    let first!: Promise<boolean>;
    act(() => {
      first = result.current.requireIdentity();
    });
    await expect(result.current.requireIdentity()).resolves.toBe(false);
    await act(async () => resolveStatus({ data: COMPLETE }));
    await expect(first).resolves.toBe(true);
    // Kilit çözüldü: sonraki basış yeniden kontrol eder.
    await act(async () => {
      await expect(result.current.requireIdentity()).resolves.toBe(true);
    });
  });

  it('kimlik eksik → kapı açılır; kaydedilince true, Vazgeç\'te false', async () => {
    mockGetStatus.mockResolvedValue({ data: MISSING });
    const { result } = setup();

    let saved!: Promise<boolean>;
    act(() => {
      saved = result.current.requireIdentity();
    });
    await waitFor(() => expect(useLegalIdentityRequestStore.getState().requested).toBe(true));
    act(() => settleLegalIdentityRequest(true));
    await expect(saved).resolves.toBe(true);

    let cancelled!: Promise<boolean>;
    act(() => {
      cancelled = result.current.requireIdentity();
    });
    await waitFor(() => expect(useLegalIdentityRequestStore.getState().requested).toBe(true));
    act(() => settleLegalIdentityRequest(false));
    await expect(cancelled).resolves.toBe(false);
  });

  it('isChecking: durum ağdayken ve kapı açıkken true, bitince false (B4 inceleme 6)', async () => {
    let resolveStatus: (v: unknown) => void = () => {};
    mockGetStatus.mockImplementation(() => new Promise((r) => (resolveStatus = r)));
    const { result } = setup();
    expect(result.current.isChecking).toBe(false);

    let pending!: Promise<boolean>;
    act(() => {
      pending = result.current.requireIdentity();
    });
    expect(result.current.isChecking).toBe(true);

    await act(async () => resolveStatus({ data: MISSING }));
    await waitFor(() => expect(useLegalIdentityRequestStore.getState().requested).toBe(true));
    // Kapı açık: düğme hâlâ devre dışı.
    expect(result.current.isChecking).toBe(true);

    act(() => settleLegalIdentityRequest(false));
    await act(async () => {
      await expect(pending).resolves.toBe(false);
    });
    expect(result.current.isChecking).toBe(false);
  });

  it('isChecking: önbellek "tamam" iken hiç true olmaz (titreme yok)', async () => {
    mockGetStatus.mockResolvedValue({ data: COMPLETE });
    const client = makeTestQueryClient();
    client.setQueryData(qk.legalIdentity.me, COMPLETE);
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    const seen: boolean[] = [];
    const { result } = renderHook(
      () => {
        const r = useRequireLegalIdentity();
        seen.push(r.isChecking);
        return r;
      },
      { wrapper },
    );
    await act(async () => {
      await expect(result.current.requireIdentity()).resolves.toBe(true);
    });
    expect(seen.every((v) => v === false)).toBe(true);
    expect(mockGetStatus).not.toHaveBeenCalled();
  });

  it('misafirde kapı hiç açılmaz, durum sorulmaz', async () => {
    useAuthStore.setState({ isAuthenticated: false, isLoading: false });
    const { result } = setup();
    await expect(result.current.requireIdentity()).resolves.toBe(true);
    expect(mockGetStatus).not.toHaveBeenCalled();
  });
});
