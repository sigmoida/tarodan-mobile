/**
 * Taslak koruması — çıkış izni (`leave`) zamanlaması. expo-router 6 `router.back()` GO_BACK'i
 * KUYRUĞA alıp sonraki render'da gönderir (`mockRealisticExit`: ertelenmiş `beforeRemove`).
 * Eski hata: koruma tek render için kalkıp aynı effect'te geri geliyordu → başarılı kayıttan
 * sonra "Kaydedilmemiş değişiklikler" diyaloğu çıkıyordu.
 */
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { appAlert } from '@/ui';
import {
  backMock,
  emitBeforeRemove,
  mockRealisticExit,
  navigationDispatchMock,
  resetRouterMocks,
} from '@/test-utils/router-mock';
import { useUnsavedChangesGuard } from '../useUnsavedChangesGuard';

jest.mock('expo-router', () => jest.requireActual('@/test-utils/router-mock').routerMock);
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));

let exits: ReturnType<typeof mockRealisticExit>;
beforeEach(() => {
  resetRouterMocks();
  exits = mockRealisticExit();
  (appAlert as jest.Mock).mockReset();
});
afterEach(() => {
  backMock.mockReset();
  navigationDispatchMock.mockReset();
});

const render = (dirty: boolean) =>
  renderHook(({ d }: { d: boolean }) => useUnsavedChangesGuard(d), { initialProps: { d: dirty } });

describe('useUnsavedChangesGuard', () => {
  it('kirli form → çıkış engellenir ve onay sorulur', () => {
    render(true);
    expect(emitBeforeRemove().prevented).toBe(true);
    expect(appAlert).toHaveBeenCalledTimes(1);
  });

  it('leave(router.back): ertelenmiş GO_BACK engellenmez, diyalog ÇIKMAZ', async () => {
    const { result } = render(true);
    act(() => result.current.leave(backMock));
    await waitFor(() => expect(exits).toHaveLength(1));
    expect(backMock).toHaveBeenCalledTimes(1);
    expect(exits[0]).toEqual(expect.objectContaining({ prevented: false }));
    expect(appAlert).not.toHaveBeenCalled();
  });

  it('leave sonrası koruma ekran kapanana dek kapalı; dirty DEĞİŞİNCE yeniden kurulur', async () => {
    const { result, rerender } = render(true);
    act(() => result.current.leave(() => undefined));
    await waitFor(() => expect(emitBeforeRemove().prevented).toBe(false));
    // Form temizlenip yeniden kirlenirse (ekran kaldıysa) koruma geri gelir.
    rerender({ d: false });
    rerender({ d: true });
    expect(emitBeforeRemove().prevented).toBe(true);
  });

  it('ekran kapandıktan sonra gelen leave hiçbir şey yapmaz (önceki ekran kapanmaz)', () => {
    const { result, unmount } = render(true);
    const { leave } = result.current;
    unmount();
    const go = jest.fn();
    leave(go);
    expect(go).not.toHaveBeenCalled();
  });

  it('"Değişiklikleri Sil" → bekleyen eylem koruma kalktıktan sonra gönderilir (döngü yok)', async () => {
    render(true);
    const { action } = emitBeforeRemove();
    const [, , buttons] = (appAlert as jest.Mock).mock.calls[0];
    buttons.find((b: { style?: string }) => b.style === 'destructive').onPress();
    await waitFor(() => expect(navigationDispatchMock).toHaveBeenCalledWith(action));
    expect(exits).toEqual([expect.objectContaining({ prevented: false })]);
    expect(appAlert).toHaveBeenCalledTimes(1);
  });
});
