import { withTimeout } from '../withTimeout';

jest.useFakeTimers();

describe('withTimeout', () => {
  it('promise süresinde biterse değeri döner', async () => {
    await expect(withTimeout(Promise.resolve('ok'), 1000)).resolves.toBe('ok');
  });

  it('asılı kalan promise süre dolunca undefined ile ÇÖZÜLÜR (reject etmez)', async () => {
    // Test süresince asla settle etmeyecek bir promise (sahte zamanlayıcı
    // yalnız 5000ms ilerletilir).
    const hung = new Promise<string>((resolve) => setTimeout(resolve, 10 ** 9));
    const p = withTimeout(hung, 5000);
    jest.advanceTimersByTime(5000);
    await expect(p).resolves.toBeUndefined();
  });

  it('promise reddederse hata çağırana geçer', async () => {
    const boom = new Error('boom');
    await expect(withTimeout(Promise.reject(boom), 1000)).rejects.toBe(boom);
  });

  it('erken biten promise zamanlayıcıyı bırakır (açık handle kalmaz)', async () => {
    const spy = jest.spyOn(global, 'clearTimeout');
    await withTimeout(Promise.resolve(1), 1000);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
