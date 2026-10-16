import { createOfflineDialogController } from '../offlineDialogController';

function setup(initiallyBlocked = false) {
  const state = { blocked: initiallyBlocked };
  const show = jest.fn();
  const hide = jest.fn();
  const c = createOfflineDialogController({ show, hide, isBlocked: () => state.blocked });
  return { c, show, hide, state };
}

describe('offlineDialogController', () => {
  it('çevrimdışı kararında hemen (engel yoksa) TEK kez gösterir', () => {
    const { c, show } = setup();
    c.onStatus(false);
    expect(show).toHaveBeenCalledTimes(1);
    c.onStatus(false); // tekrar bildirim: zararsız
    c.reevaluate();
    expect(show).toHaveBeenCalledTimes(1);
    expect(c.isVisible()).toBe(true);
  });

  it('kullanıcı kapatsa da aynı çevrimdışı süreçte tekrar göstermez; yeniden kopunca gösterir', () => {
    const { c, show } = setup();
    c.onStatus(false);
    c.markClosed();
    expect(c.isVisible()).toBe(false);
    c.reevaluate();
    expect(show).toHaveBeenCalledTimes(1);

    c.onStatus(true);
    c.onStatus(false);
    expect(show).toHaveBeenCalledTimes(2);
  });

  it('bağlantı dönünce açık diyaloğu kapatır ve sıfırlar', () => {
    const { c, show, hide } = setup();
    c.onStatus(false);
    c.onStatus(true);
    expect(hide).toHaveBeenCalledTimes(1);
    expect(c.isVisible()).toBe(false);
    c.onStatus(false);
    expect(show).toHaveBeenCalledTimes(2);
  });

  it('diyalog zaten kapatılmışsa bağlantı dönünce hide çağrılmaz', () => {
    const { c, hide } = setup();
    c.onStatus(false);
    c.markClosed();
    c.onStatus(true);
    expect(hide).not.toHaveBeenCalled();
  });

  describe('engel (açık modal / splash / kapı)', () => {
    it('engel varken ERTELENİR, kalkınca (reevaluate) gösterilir', () => {
      const { c, show, state } = setup(true);
      c.onStatus(false);
      expect(show).not.toHaveBeenCalled();
      expect(c.isDeferred()).toBe(true);
      c.reevaluate(); // engel sürüyor
      expect(show).not.toHaveBeenCalled();
      state.blocked = false;
      c.reevaluate();
      expect(show).toHaveBeenCalledTimes(1);
      expect(c.isDeferred()).toBe(false);
    });

    it('ertelenmişken bağlantı dönerse hiç gösterilmez', () => {
      const { c, show, hide, state } = setup(true);
      c.onStatus(false);
      c.onStatus(true);
      state.blocked = false;
      c.reevaluate();
      expect(show).not.toHaveBeenCalled();
      expect(hide).not.toHaveBeenCalled();
      expect(c.isDeferred()).toBe(false);
    });

    it('ertelenmiş gösterim bir sonraki çevrimdışı sürece SIZMAZ', () => {
      const { c, show, state } = setup(true);
      c.onStatus(false);
      c.onStatus(true);
      c.onStatus(false); // yeni süreç, hâlâ engelli
      state.blocked = false;
      c.reevaluate();
      expect(show).toHaveBeenCalledTimes(1); // yeni sürecin tek gösterimi
    });
  });

  it('present(): kullanıcı isteğiyle süreç kuralını atlayıp yeniden gösterir; açıkken çift açmaz; çevrimiçiyken yok sayar', () => {
    const { c, show } = setup();
    c.present();
    expect(show).not.toHaveBeenCalled();
    c.onStatus(false);
    c.markClosed();
    c.present();
    expect(show).toHaveBeenCalledTimes(2);
    c.present();
    expect(show).toHaveBeenCalledTimes(2);
  });

  it('present(): engel varsa ertelenir', () => {
    const { c, show, state } = setup();
    c.onStatus(false);
    c.markClosed();
    state.blocked = true;
    c.present();
    expect(show).toHaveBeenCalledTimes(1);
    state.blocked = false;
    c.reevaluate();
    expect(show).toHaveBeenCalledTimes(2);
  });

  it('dispose sonrası yeniden bağlanınca ilk çevrimdışı karar yine gösterilir', () => {
    const { c, show } = setup();
    c.onStatus(false);
    c.dispose();
    expect(c.isVisible()).toBe(false);
    c.onStatus(false);
    expect(show).toHaveBeenCalledTimes(2);
  });
});
