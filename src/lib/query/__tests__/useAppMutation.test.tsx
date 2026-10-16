import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { toast } from '@/ui';
import { useAppMutation } from '../useAppMutation';

jest.mock('@/ui', () => {
  const t = Object.assign(jest.fn(), { success: jest.fn(), error: jest.fn(), dismiss: jest.fn() });
  return { toast: t, appAlert: jest.fn() };
});

jest.mock('@/lib/network/networkError', () => ({ shouldSuppressNetworkErrorToast: jest.fn(() => false) }));

const suppressMock = jest.requireMock('@/lib/network/networkError')
  .shouldSuppressNetworkErrorToast as jest.Mock;
const successMock = toast.success as jest.Mock;
const errorMock = toast.error as jest.Mock;

function setup(options: Parameters<typeof useAppMutation<string, string>>[1], fn: (v: string) => Promise<string>) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  const invalidate = jest.spyOn(client, 'invalidateQueries');
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const hook = renderHook(() => useAppMutation<string, string>(fn, options), { wrapper });
  return { ...hook, invalidate };
}

beforeEach(() => {
  successMock.mockClear();
  errorMock.mockClear();
});

describe('useAppMutation', () => {
  it('başarı: her anahtar için invalidate + toast.success (string) + onSuccess', async () => {
    const onSuccess = jest.fn();
    const { result, invalidate } = setup(
      { invalidates: [['a'], ['b', 1]], success: 'Kaydedildi', onSuccess },
      async (v) => `ok:${v}`,
    );
    await act(async () => {
      await result.current.mutateAsync('x');
    });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['a'] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['b', 1] });
    expect(invalidate).toHaveBeenCalledTimes(2);
    expect(successMock).toHaveBeenCalledWith('Kaydedildi');
    expect(onSuccess).toHaveBeenCalledWith('ok:x', 'x');
    expect(errorMock).not.toHaveBeenCalled();
  });

  it('success fonksiyonu (data, vars) ile üretilir; boş mesaj toast atmaz', async () => {
    const { result } = setup({ success: (d, v) => `${d}/${v}` }, async () => 'D');
    await act(async () => {
      await result.current.mutateAsync('V');
    });
    expect(successMock).toHaveBeenCalledWith('D/V');

    successMock.mockClear();
    const none = setup({}, async () => 'D');
    await act(async () => {
      await none.result.current.mutateAsync('V');
    });
    expect(successMock).not.toHaveBeenCalled();
  });

  it('hata: toast.error(sunucu mesajı); invalidate ve success YOK', async () => {
    const { result, invalidate } = setup(
      { invalidates: [['a']], success: 'ok', error: 'Yedek' },
      async () => {
        throw { response: { data: { message: ['ilk', 'ikinci'] } } };
      },
    );
    await act(async () => {
      await result.current.mutateAsync('x').catch(() => undefined);
    });
    expect(errorMock).toHaveBeenCalledWith('ilk');
    expect(successMock).not.toHaveBeenCalled();
    expect(invalidate).not.toHaveBeenCalled();
  });

  it('hata: sunucu mesajı yoksa error (string) yedek metni; fonksiyon e ile üretilir', async () => {
    const fail = async () => {
      throw { response: { data: {} } };
    };
    const a = setup({ error: 'Yedek' }, fail);
    await act(async () => {
      await a.result.current.mutateAsync('x').catch(() => undefined);
    });
    expect(errorMock).toHaveBeenLastCalledWith('Yedek');

    const b = setup({ error: (e) => `Fn:${(e as { response: unknown }).response !== undefined}` }, fail);
    await act(async () => {
      await b.result.current.mutateAsync('x').catch(() => undefined);
    });
    expect(errorMock).toHaveBeenLastCalledWith('Fn:true');
  });

  it('hata: error verilmezse genel "işlem başarısız" metni (boş değil)', async () => {
    const { result } = setup({}, async () => {
      throw {};
    });
    await act(async () => {
      await result.current.mutateAsync('x').catch(() => undefined);
    });
    expect(errorMock).toHaveBeenCalledTimes(1);
    expect(typeof errorMock.mock.calls[0][0]).toBe('string');
    expect(errorMock.mock.calls[0][0].length).toBeGreaterThan(0);
  });

  it('silentError: toast yok ama onError çalışır', async () => {
    const onError = jest.fn();
    const err = { response: { data: { message: 'boom' } } };
    const { result } = setup({ silentError: true, onError }, async () => {
      throw err;
    });
    await act(async () => {
      await result.current.mutateAsync('v').catch(() => undefined);
    });
    expect(errorMock).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith(err, 'v');
  });

  it('mutation: onMutate / onSettled geçişi korunur', async () => {
    const onMutate = jest.fn();
    const onSettled = jest.fn();
    const { result } = setup({ mutation: { onMutate, onSettled } }, async () => 'ok');
    await act(async () => {
      await result.current.mutateAsync('v');
    });
    await waitFor(() => expect(onSettled).toHaveBeenCalled());
    expect(onMutate).toHaveBeenCalled();
    expect(onMutate.mock.calls[0][0]).toBe('v');
    expect(onSettled.mock.calls[0][2]).toBe('v');
  });

  it('global çevrimdışı diyaloğu bildiriyorsa (ağ hatası) hata toast\'ı basılmaz; onError yine çalışır', async () => {
    suppressMock.mockReturnValueOnce(true);
    const onError = jest.fn();
    const err = { isAxiosError: true, code: 'ERR_NETWORK' };
    const { result } = setup({ error: 'Kaydedilemedi', onError }, async () => {
      throw err;
    });
    await act(async () => {
      await result.current.mutateAsync('x').catch(() => undefined);
    });
    expect(errorMock).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith(err, 'x');
  });
});
