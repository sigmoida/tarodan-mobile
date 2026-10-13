/**
 * B4 inceleme 1 · ModalFreeze: kimlik kapısı native Modal; bekleyen işlem
 * kapı TAMAMEN kapandıktan sonra devam etmeli. `settle` aynı tick'te
 * çözseydi çağıran kapı kaybolurken `appAlert` açabilir, iOS donardı.
 */
import { MODAL_CLOSE_DELAY_MS } from '@/ui/ModalMessage';
import {
  openLegalIdentityRequest,
  settleLegalIdentityRequest,
  useLegalIdentityRequestStore,
} from '@/stores/legalIdentityRequestStore';

/** Bekleyen mikro görevleri boşalt (promise zinciri ilerlesin). */
const flush = async () => {
  for (let i = 0; i < 5; i += 1) await Promise.resolve();
};

describe('legalIdentityRequestStore · çözüm kapanıştan sonra', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => {
    settleLegalIdentityRequest(false);
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it.each([true, false])('settle(%s): kapı hemen kapanır, işlem modal kapanış süresinden sonra çözülür', async (completed) => {
    const onResult = jest.fn();
    void openLegalIdentityRequest().then(onResult);
    expect(useLegalIdentityRequestStore.getState().requested).toBe(true);

    settleLegalIdentityRequest(completed);
    // Kapı ağaçtan hemen sökülür …
    expect(useLegalIdentityRequestStore.getState().requested).toBe(false);
    await flush();
    // … ama çağıran aynı tick'te devam ETMEZ.
    expect(onResult).not.toHaveBeenCalled();

    jest.advanceTimersByTime(MODAL_CLOSE_DELAY_MS - 1);
    await flush();
    expect(onResult).not.toHaveBeenCalled();

    jest.advanceTimersByTime(1);
    await flush();
    expect(onResult).toHaveBeenCalledWith(completed);
  });

  it('aynı istekte bekleyen iki işlem aynı sonucu alır', async () => {
    const a = jest.fn();
    const b = jest.fn();
    void openLegalIdentityRequest().then(a);
    void openLegalIdentityRequest().then(b);

    settleLegalIdentityRequest(true);
    jest.advanceTimersByTime(MODAL_CLOSE_DELAY_MS);
    await flush();
    expect(a).toHaveBeenCalledWith(true);
    expect(b).toHaveBeenCalledWith(true);
  });

  it('bekleme sırasında açılan yeni istek önceki sonuca karışmaz', async () => {
    const first = jest.fn();
    const second = jest.fn();
    void openLegalIdentityRequest().then(first);
    settleLegalIdentityRequest(false);

    void openLegalIdentityRequest().then(second);
    jest.advanceTimersByTime(MODAL_CLOSE_DELAY_MS);
    await flush();
    expect(first).toHaveBeenCalledWith(false);
    expect(second).not.toHaveBeenCalled();
    expect(useLegalIdentityRequestStore.getState().requested).toBe(true);
  });

  it('bekleyen yoksa zamanlayıcı kurulmaz', () => {
    settleLegalIdentityRequest(true);
    expect(jest.getTimerCount()).toBe(0);
  });
});
