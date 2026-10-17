/**
 * Paylaşılan QueryClient varsayılanı: 4xx yeniden denenmez, ağ/5xx en fazla 2 kez denenir.
 * Eski `retry: 2` 4xx'i de iki kez daha deniyordu (aynı hata ve uyarı üç kez).
 */
import { queryClient } from '../client';
import { retryUnlessClientError } from '../retry';

describe('queryClient varsayılan retry', () => {
  it('sorguların varsayılanı retryUnlessClientError', () => {
    expect(queryClient.getDefaultOptions().queries?.retry).toBe(retryUnlessClientError);
  });

  it('4xx sorguyu tek denemede hataya düşürür, 5xx üç denemede', async () => {
    const clientErr = jest.fn().mockRejectedValue({ response: { status: 404 } });
    await expect(
      queryClient.fetchQuery({ queryKey: ['retry-test', '4xx'], queryFn: clientErr, retryDelay: 0 }),
    ).rejects.toEqual({ response: { status: 404 } });
    expect(clientErr).toHaveBeenCalledTimes(1);

    const serverErr = jest.fn().mockRejectedValue({ response: { status: 503 } });
    await expect(
      queryClient.fetchQuery({ queryKey: ['retry-test', '5xx'], queryFn: serverErr, retryDelay: 0 }),
    ).rejects.toEqual({ response: { status: 503 } });
    expect(serverErr).toHaveBeenCalledTimes(3);
  });
});
