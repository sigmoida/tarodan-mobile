/**
 * Android donanım geri tuşu yakalayıcısı (testte): `BackHandler.addEventListener` casusu. Kullanım:
 *   const back = captureHardwareBack();   // render'dan ÖNCE
 *   render(...); expect(back.press()).toBe(true);
 *   back.restore();                       // afterEach
 * `press()` en son kaydolan dinleyiciyi (RN gibi) çağırır; dinleyici yoksa `false` (tuş sistemde kalır).
 */
import { BackHandler } from 'react-native';

export function captureHardwareBack() {
  const handlers: Array<() => boolean | null | undefined> = [];
  const remove = jest.fn();
  const spy = jest.spyOn(BackHandler, 'addEventListener').mockImplementation((_event, handler) => {
    handlers.push(handler);
    return { remove } as unknown as ReturnType<typeof BackHandler.addEventListener>;
  });
  return {
    /** Kayıtlı dinleyici sayısı. */
    get count() {
      return handlers.length;
    },
    remove,
    press: (): boolean => (handlers.length ? !!handlers[handlers.length - 1]!() : false),
    restore: () => spy.mockRestore(),
  };
}
