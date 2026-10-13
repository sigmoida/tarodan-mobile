/**
 * B-2.3 · Yeniden-onay kapısı (delta 22). `GET /consents/me/pending` boş değilse
 * girişte ve uygulama ön plana geldiğinde kapatılamaz ekran; tek çıkış onaylamak
 * ya da oturumu kapatmak. Web `RequiredStepsGate` + `ConsentGate` ile aynı kurallar.
 */
import React from 'react';
import { AppState, Modal } from 'react-native';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils';
import { pushMock, replaceMock, resetRouterMocks } from '@/test-utils/router-mock';
import type { PendingConsent } from '@/lib/shared/legalConsent';

let mockPathname = '/';
jest.mock('expo-router', () => ({
  ...jest.requireActual('@/test-utils/router-mock').routerMock,
  usePathname: () => mockPathname,
}));

jest.mock('@/lib/api', () => ({
  consentsApi: { getPending: jest.fn(), accept: jest.fn() },
  errorText: jest.requireActual('@/lib/api/errorText').errorText,
}));

import { consentsApi } from '@/lib/api';
import { qk } from '@/lib/query';
import { useAuthStore } from '@/stores/authStore';
import RequiredStepsGate from '../RequiredStepsGate';

const mockGetPending = consentsApi.getPending as jest.Mock;
const mockAccept = consentsApi.accept as jest.Mock;
const mockLogout = jest.fn(() => Promise.resolve());

const ALL: PendingConsent[] = [
  { document: 'terms', version: '2026-08-05', reason: 'missing', path: '/terms' },
  { document: 'privacy', version: '2026-08-04', reason: 'missing', path: '/privacy' },
  { document: 'kvkk', version: '2026-08-04', reason: 'missing', path: '/privacy' },
];

function signIn(authenticated = true) {
  useAuthStore.setState({ isAuthenticated: authenticated, isLoading: false, logout: mockLogout });
}

beforeEach(() => {
  mockPathname = '/';
  resetRouterMocks();
  mockGetPending.mockReset();
  mockAccept.mockReset();
  mockLogout.mockClear();
  signIn();
});

describe('B-2.3 · RequiredStepsGate (onay kapısı)', () => {
  it('bekleyen onay yoksa hiçbir şey çizmez', async () => {
    mockGetPending.mockResolvedValue({ data: { pending: [] } });
    const { queryClient } = renderWithProviders(<RequiredStepsGate />);
    await waitFor(() =>
      expect(queryClient.getQueryState(qk.consents.pending)?.status).toBe('success'),
    );
    expect(screen.queryByTestId('consent-gate')).toBeNull();
  });

  it('misafirde sorgu hiç atılmaz', () => {
    signIn(false);
    renderWithProviders(<RequiredStepsGate />);
    expect(mockGetPending).not.toHaveBeenCalled();
    expect(screen.queryByTestId('consent-gate')).toBeNull();
  });

  it('istek başarısızsa kapı açık kalır (fail-open, sunucu zorlamıyor)', async () => {
    // Ör. ucu henüz olmayan bir sunucu: 404 (4xx yeniden denenmez).
    mockGetPending.mockRejectedValue({ response: { status: 404 } });
    const { queryClient } = renderWithProviders(<RequiredStepsGate />);
    await waitFor(() =>
      expect(queryClient.getQueryState(qk.consents.pending)?.status).toBe('error'),
    );
    expect(mockGetPending).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('consent-gate')).toBeNull();
  });

  it('bekleyen belgeler varsa her biri için ayrı kutu; hepsi işaretlenmeden gönderilemez', async () => {
    mockGetPending.mockResolvedValue({ data: { pending: ALL } });
    renderWithProviders(<RequiredStepsGate />);
    expect(await screen.findByTestId('consent-gate')).toBeOnTheScreen();
    expect(screen.getByText('Devam etmek için aşağıdaki belgeleri okuyup onaylamanız gerekiyor.')).toBeOnTheScreen();
    expect(screen.getByTestId('consent-gate-terms')).toBeOnTheScreen();
    expect(screen.getByTestId('consent-gate-privacy')).toBeOnTheScreen();
    expect(screen.getByTestId('consent-gate-kvkk')).toBeOnTheScreen();

    const submit = screen.getByTestId('consent-gate-submit');
    expect(submit).toBeDisabled();
    fireEvent.press(screen.getByTestId('consent-gate-terms'));
    fireEvent.press(screen.getByTestId('consent-gate-privacy'));
    expect(submit).toBeDisabled();
    fireEvent.press(screen.getByTestId('consent-gate-kvkk'));
    expect(submit).not.toBeDisabled();
  });

  it('onay POST /consents/me/accept ile bekleyen belgeleri gönderir; kalan boşsa kapı kapanır', async () => {
    mockGetPending.mockResolvedValue({ data: { pending: ALL } });
    mockAccept.mockResolvedValue({ data: { pending: [] } });
    renderWithProviders(<RequiredStepsGate />);
    await screen.findByTestId('consent-gate');
    for (const d of ['terms', 'privacy', 'kvkk']) fireEvent.press(screen.getByTestId(`consent-gate-${d}`));
    fireEvent.press(screen.getByTestId('consent-gate-submit'));

    await waitFor(() => expect(mockAccept).toHaveBeenCalledWith(['terms', 'privacy', 'kvkk']));
    await waitFor(() => expect(screen.queryByTestId('consent-gate')).toBeNull());
    // Yanıt kalan bekleyenlerdir: kapanmak için ek GET gerekmez.
    expect(mockGetPending).toHaveBeenCalledTimes(1);
  });

  it('onaydan önce başlayan eski GET sonradan dönse de kapıyı yeniden açmaz', async () => {
    mockGetPending.mockResolvedValueOnce({ data: { pending: ALL } });
    const { queryClient } = renderWithProviders(<RequiredStepsGate />);
    await screen.findByTestId('consent-gate');
    for (const d of ['terms', 'privacy', 'kvkk']) fireEvent.press(screen.getByTestId(`consent-gate-${d}`));

    // Onay sürerken bir yeniden sorgu (ör. ön plana dönüş) uçuşta kalıyor.
    let resolveStale!: (v: unknown) => void;
    mockGetPending.mockImplementationOnce(() => new Promise((r) => (resolveStale = r)));
    act(() => {
      void queryClient.refetchQueries({ queryKey: qk.consents.pending });
    });
    await waitFor(() => expect(mockGetPending).toHaveBeenCalledTimes(2));

    mockAccept.mockResolvedValue({ data: { pending: [] } });
    fireEvent.press(screen.getByTestId('consent-gate-submit'));
    await waitFor(() => expect(screen.queryByTestId('consent-gate')).toBeNull());

    // Eski GET (onay öncesi liste) şimdi dönüyor: önbelleğe yazılmamalı.
    await act(async () => {
      resolveStale({ data: { pending: ALL } });
    });
    expect(queryClient.getQueryData(qk.consents.pending)).toEqual([]);
    expect(screen.queryByTestId('consent-gate')).toBeNull();
    // İptal + yeniden render yüklü makinede 5 sn sınırına yaklaşabiliyor.
  }, 15000);

  it('kapı açıkken belgenin yeni sürümü gelirse eski işaret devralınmaz', async () => {
    mockGetPending.mockResolvedValueOnce({ data: { pending: [ALL[0]!] } });
    const { queryClient } = renderWithProviders(<RequiredStepsGate />);
    await screen.findByTestId('consent-gate');
    fireEvent.press(screen.getByTestId('consent-gate-terms'));
    expect(screen.getByTestId('consent-gate-submit')).not.toBeDisabled();

    // Ön plana dönüşte şartların yeni sürümü geliyor.
    mockGetPending.mockResolvedValueOnce({
      data: { pending: [{ ...ALL[0]!, version: '2026-09-01', reason: 'outdated' }] },
    });
    await act(async () => {
      await queryClient.refetchQueries({ queryKey: qk.consents.pending });
    });
    await screen.findByText(
      'Bazı belgelerimiz güncellendi. Devam etmek için güncel metinleri okuyup onaylamanız gerekiyor.',
    );
    expect(screen.getByTestId('consent-gate-submit')).toBeDisabled();

    // Yeni sürüm yeniden işaretlenince gönderilebilir.
    fireEvent.press(screen.getByTestId('consent-gate-terms'));
    expect(screen.getByTestId('consent-gate-submit')).not.toBeDisabled();
  });

  it('güncellenen belgede "güncellendi" metni gösterilir', async () => {
    mockGetPending.mockResolvedValue({
      data: { pending: [{ document: 'terms', version: '2026-09-01', reason: 'outdated', path: '/terms' }] },
    });
    renderWithProviders(<RequiredStepsGate />);
    expect(
      await screen.findByText(
        'Bazı belgelerimiz güncellendi. Devam etmek için güncel metinleri okuyup onaylamanız gerekiyor.',
      ),
    ).toBeOnTheScreen();
  });

  it('gönderim hatası kapının içinde gösterilir, kapı açık kalır', async () => {
    mockGetPending.mockResolvedValue({ data: { pending: [ALL[0]!] } });
    mockAccept.mockRejectedValue({ response: { status: 429, data: { message: 'Çok fazla istek' } } });
    renderWithProviders(<RequiredStepsGate />);
    await screen.findByTestId('consent-gate');
    fireEvent.press(screen.getByTestId('consent-gate-terms'));
    fireEvent.press(screen.getByTestId('consent-gate-submit'));
    expect(await screen.findByText('Çok fazla istek')).toBeOnTheScreen();
    expect(screen.getByTestId('consent-gate')).toBeOnTheScreen();
  });

  it('eski gönderim hatası kapı yeniden açılınca kaybolur; işaretler korunur', async () => {
    mockGetPending.mockResolvedValue({ data: { pending: ALL } });
    mockAccept.mockRejectedValue({ response: { status: 429, data: { message: 'Çok fazla istek' } } });
    const view = renderWithProviders(<RequiredStepsGate />);
    await screen.findByTestId('consent-gate');
    for (const d of ['terms', 'privacy', 'kvkk']) fireEvent.press(screen.getByTestId(`consent-gate-${d}`));
    fireEvent.press(screen.getByTestId('consent-gate-submit'));
    expect(await screen.findByText('Çok fazla istek')).toBeOnTheScreen();

    // Metni okuyup dönüyor: kapı yeniden açılıyor.
    mockPathname = '/terms';
    view.rerender(<RequiredStepsGate />);
    mockPathname = '/';
    view.rerender(<RequiredStepsGate />);
    await screen.findByTestId('consent-gate');
    // Mutasyon sıfırlaması react-query bildirimiyle bir sonraki tikte gelir.
    await waitFor(() => expect(screen.queryByText('Çok fazla istek')).toBeNull());
    expect(screen.getByTestId('consent-gate-submit')).not.toBeDisabled();
  });

  it('oturum değişince (çıkış → giriş) eski hata görünmez', async () => {
    mockGetPending.mockResolvedValue({ data: { pending: [ALL[0]!] } });
    mockAccept.mockRejectedValue({ response: { status: 429, data: { message: 'Çok fazla istek' } } });
    renderWithProviders(<RequiredStepsGate />);
    await screen.findByTestId('consent-gate');
    fireEvent.press(screen.getByTestId('consent-gate-terms'));
    fireEvent.press(screen.getByTestId('consent-gate-submit'));
    expect(await screen.findByText('Çok fazla istek')).toBeOnTheScreen();

    act(() => signIn(false));
    expect(screen.queryByTestId('consent-gate')).toBeNull();
    act(() => signIn(true));
    await screen.findByTestId('consent-gate');
    expect(screen.queryByText('Çok fazla istek')).toBeNull();
    expect(screen.getByTestId('consent-gate-submit')).toBeDisabled();
  });

  it('"Çıkış Yap" oturumu kapatır ve girişe yönlendirir', async () => {
    mockGetPending.mockResolvedValue({ data: { pending: ALL } });
    renderWithProviders(<RequiredStepsGate />);
    await screen.findByTestId('consent-gate');
    fireEvent.press(screen.getByTestId('consent-gate-logout'));
    await waitFor(() => expect(mockLogout).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith('/(auth)/login'));
  });

  it('belge adı metni açar; metin sayfasında kapı gizlenir', async () => {
    mockGetPending.mockResolvedValue({ data: { pending: ALL } });
    const view = renderWithProviders(<RequiredStepsGate />);
    await screen.findByTestId('consent-gate');
    fireEvent.press(screen.getByText('Kullanım Şartları'));
    expect(pushMock).toHaveBeenCalledWith('/terms');

    mockPathname = '/terms';
    view.rerender(<RequiredStepsGate />);
    expect(screen.queryByTestId('consent-gate')).toBeNull();

    mockPathname = '/';
    view.rerender(<RequiredStepsGate />);
    expect(screen.getByTestId('consent-gate')).toBeOnTheScreen();
  });

  it('soğuk açılışta splash bitene kadar (ready=false) gösterilmez; sorgu yine de çalışır', async () => {
    mockGetPending.mockResolvedValue({ data: { pending: ALL } });
    const view = renderWithProviders(<RequiredStepsGate ready={false} />);
    await waitFor(() =>
      expect(view.queryClient.getQueryState(qk.consents.pending)?.status).toBe('success'),
    );
    expect(screen.queryByTestId('consent-gate')).toBeNull();
    expect(screen.UNSAFE_queryAllByType(Modal)).toHaveLength(0);

    // Splash bitti: kapı ek istek beklemeden açılır.
    view.rerender(<RequiredStepsGate ready />);
    expect(await screen.findByTestId('consent-gate')).toBeOnTheScreen();
    expect(mockGetPending).toHaveBeenCalledTimes(1);
  });

  it('native tam ekran Modal olarak sunulur; Android geri tuşu yutulur', async () => {
    mockGetPending.mockResolvedValue({ data: { pending: ALL } });
    renderWithProviders(<RequiredStepsGate />);
    await screen.findByTestId('consent-gate');
    // Kök düzendeki düz bir View açık ekran modallarının altında kalıyordu;
    // kapı artık kendisi bir native Modal.
    const modal = screen.UNSAFE_getByType(Modal);
    expect(modal.props.visible).toBe(true);
    expect(modal.props.statusBarTranslucent).toBe(true);
    act(() => modal.props.onRequestClose());
    expect(screen.getByTestId('consent-gate')).toBeOnTheScreen();
  });

  it('girişte GET /consents/me/pending yalnız bir kez gider (giriş penceresi / parola sorusu sıçramaları)', async () => {
    const listeners: ((s: string) => void)[] = [];
    const spy = jest.spyOn(AppState, 'addEventListener').mockImplementation((type, fn) => {
      if (type === 'change') listeners.push(fn as (s: string) => void);
      return { remove: jest.fn() } as unknown as ReturnType<typeof AppState.addEventListener>;
    });
    const emit = (...states: string[]) =>
      act(() => states.forEach((st) => listeners.forEach((l) => l(st))));
    signIn(false);
    let resolveFirst!: (v: unknown) => void;
    mockGetPending.mockImplementationOnce(() => new Promise((r) => (resolveFirst = r)));
    renderWithProviders(<RequiredStepsGate />);

    // Android: Google giriş ekranı uygulamayı arka plana atar, dönüş girişten önce.
    emit('background', 'active');
    act(() => signIn(true));
    await waitFor(() => expect(mockGetPending).toHaveBeenCalledTimes(1));
    // iOS: Face ID / "Parolayı kaydet" sorusu kısa bir inactive sıçraması yapar.
    emit('inactive', 'active');
    // İstek hâlâ uçuştayken gerçek bir ön plana dönüş: ikinci istek gitmez.
    emit('background', 'active');
    await act(async () => {
      resolveFirst({ data: { pending: [] } });
    });
    expect(mockGetPending).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });

  it('uygulama ön plana gelince bekleyenler yeniden sorulur ve kapı açılır', async () => {
    const listeners: ((s: string) => void)[] = [];
    const spy = jest.spyOn(AppState, 'addEventListener').mockImplementation((type, fn) => {
      if (type === 'change') listeners.push(fn as (s: string) => void);
      return { remove: jest.fn() } as unknown as ReturnType<typeof AppState.addEventListener>;
    });
    mockGetPending.mockResolvedValueOnce({ data: { pending: [] } });
    renderWithProviders(<RequiredStepsGate />);
    await waitFor(() => expect(mockGetPending).toHaveBeenCalledTimes(1));
    expect(screen.queryByTestId('consent-gate')).toBeNull();

    // Metin uygulama arka plandayken güncellendi.
    mockGetPending.mockResolvedValueOnce({ data: { pending: [ALL[0]!] } });
    act(() => listeners.forEach((l) => l('background')));
    act(() => listeners.forEach((l) => l('active')));

    await waitFor(() => expect(mockGetPending).toHaveBeenCalledTimes(2));
    expect(await screen.findByTestId('consent-gate')).toBeOnTheScreen();
    spy.mockRestore();
  });
});
