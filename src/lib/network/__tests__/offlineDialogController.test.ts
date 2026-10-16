import {
  createOfflineDialogController,
  OFFLINE_DIALOG_DEBOUNCE_MS,
} from '../offlineDialogController';

function setup() {
  jest.useFakeTimers();
  const show = jest.fn();
  const hide = jest.fn();
  const c = createOfflineDialogController({ show, hide });
  return { c, show, hide };
}
afterEach(() => jest.useRealTimers());

describe('offlineDialogController', () => {
  it('çevrimdışı geçişinde debounce sonrası TEK kez gösterir', () => {
    const { c, show } = setup();
    c.onStatus(false);
    jest.advanceTimersByTime(OFFLINE_DIALOG_DEBOUNCE_MS - 1);
    expect(show).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1);
    expect(show).toHaveBeenCalledTimes(1);
    c.onStatus(false); // tekrar bildirim: zararsız
    jest.advanceTimersByTime(10_000);
    expect(show).toHaveBeenCalledTimes(1);
  });

  it('anlık titreşimde (debounce içinde geri geldi) hiç göstermez', () => {
    const { c, show, hide } = setup();
    c.onStatus(false);
    jest.advanceTimersByTime(500);
    c.onStatus(true);
    jest.advanceTimersByTime(10_000);
    expect(show).not.toHaveBeenCalled();
    expect(hide).not.toHaveBeenCalled();
    expect(c.isActive()).toBe(false);
  });

  it('kullanıcı kapatsa da aynı çevrimdışı süreçte tekrar göstermez; yeniden kopunca gösterir', () => {
    const { c, show } = setup();
    c.onStatus(false);
    jest.advanceTimersByTime(OFFLINE_DIALOG_DEBOUNCE_MS);
    c.markClosed();
    expect(c.isActive()).toBe(false);
    jest.advanceTimersByTime(60_000);
    expect(show).toHaveBeenCalledTimes(1);

    c.onStatus(true);
    c.onStatus(false);
    jest.advanceTimersByTime(OFFLINE_DIALOG_DEBOUNCE_MS);
    expect(show).toHaveBeenCalledTimes(2);
  });

  it('bağlantı dönünce açık diyaloğu kapatır ve sıfırlar', () => {
    const { c, show, hide } = setup();
    c.onStatus(false);
    jest.advanceTimersByTime(OFFLINE_DIALOG_DEBOUNCE_MS);
    expect(c.isActive()).toBe(true);
    c.onStatus(true);
    expect(hide).toHaveBeenCalledTimes(1);
    expect(c.isActive()).toBe(false);
    c.onStatus(false);
    jest.advanceTimersByTime(OFFLINE_DIALOG_DEBOUNCE_MS);
    expect(show).toHaveBeenCalledTimes(2);
  });

  it('diyalog zaten kapatılmışsa bağlantı dönünce hide çağrılmaz', () => {
    const { c, hide } = setup();
    c.onStatus(false);
    jest.advanceTimersByTime(OFFLINE_DIALOG_DEBOUNCE_MS);
    c.markClosed();
    c.onStatus(true);
    expect(hide).not.toHaveBeenCalled();
  });

  it('bekleme (debounce) sırasında da aktif sayılır (çift bildirim bastırma)', () => {
    const { c } = setup();
    c.onStatus(false);
    expect(c.isActive()).toBe(true);
  });

  it('present(): kullanıcı isteğiyle süreç kuralını atlayıp yeniden gösterir; açıkken çift açmaz', () => {
    const { c, show } = setup();
    c.onStatus(false);
    jest.advanceTimersByTime(OFFLINE_DIALOG_DEBOUNCE_MS);
    c.markClosed();
    c.present();
    expect(show).toHaveBeenCalledTimes(2);
    c.present();
    expect(show).toHaveBeenCalledTimes(2);
  });

  it('dispose sonrası yeniden bağlanınca ilk çevrimdışı ölçüm yine geçiş sayılır', () => {
    const { c, show } = setup();
    c.onStatus(false);
    c.dispose();
    jest.advanceTimersByTime(10_000);
    expect(show).not.toHaveBeenCalled();
    c.onStatus(false);
    jest.advanceTimersByTime(OFFLINE_DIALOG_DEBOUNCE_MS);
    expect(show).toHaveBeenCalledTimes(1);
  });
});
