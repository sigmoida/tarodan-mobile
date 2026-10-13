/**
 * B-2.4 · Yasal kimlik — İHTİYAÇ ANINDA kapı (delta 23; Apple 5.1.1 yüzünden
 * girişte değil). `ensureLegalIdentity()` kimlik eksikse zorunlu adımlar
 * sırasındaki kimlik adımını açar; kaydedilince işlem devam eder (`true`),
 * "Vazgeç"te iptal olur (`false`). Yalnız `missing` alanlar sorulur,
 * `suggestedNationalId` TCKN'yi ön doldurur, gövde yalnız eksikleri taşır.
 */
import React from 'react';
import { AppState, Modal } from 'react-native';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { makeTestQueryClient, renderWithProviders } from '@/test-utils';
import { pushMock, resetRouterMocks } from '@/test-utils/router-mock';
import type { LegalIdentityStatus } from '@/lib/shared/legalIdentity';

let mockPathname = '/';
jest.mock('expo-router', () => ({
  ...jest.requireActual('@/test-utils/router-mock').routerMock,
  usePathname: () => mockPathname,
}));

jest.mock('@/lib/api', () => ({
  consentsApi: { getPending: jest.fn(), accept: jest.fn() },
  legalIdentityApi: { getStatus: jest.fn(), submit: jest.fn() },
  errorText: jest.requireActual('@/lib/api/errorText').errorText,
}));

import { consentsApi, legalIdentityApi } from '@/lib/api';
import { ensureLegalIdentity } from '@/hooks/useLegalIdentity';
import { useAuthStore } from '@/stores/authStore';
import { useLegalIdentityRequestStore } from '@/stores/legalIdentityRequestStore';
import RequiredStepsGate from '../RequiredStepsGate';
import { NATIONAL_ID_INPUT_MAX_LENGTH } from '../LegalIdentityGate';

const mockGetPending = consentsApi.getPending as jest.Mock;
const mockGetStatus = legalIdentityApi.getStatus as jest.Mock;
const mockSubmit = legalIdentityApi.submit as jest.Mock;

const VALID_TCKN = '10000000146';

const status = (over: Partial<LegalIdentityStatus> = {}): LegalIdentityStatus => ({
  required: true,
  missing: ['legalFirstName', 'legalLastName', 'nationalId'],
  legalFirstName: null,
  legalLastName: null,
  nationalIdMasked: null,
  suggestedNationalId: null,
  ...over,
});

const COMPLETE = status({
  missing: [],
  legalFirstName: 'Ayşe Nur',
  legalLastName: 'Yılmaz',
  nationalIdMasked: '•••••••••46',
});

function setup() {
  const queryClient = makeTestQueryClient();
  const view = renderWithProviders(<RequiredStepsGate />, { queryClient });
  return { queryClient, view };
}

/**
 * Bir işlemin kimlik istemesi. Sorgu ve store güncellemeleri act içinde
 * yerleşsin diye bir makro-görev beklenir; sonuç (`true` devam / `false`
 * iptal) `result.value`'ya düşer.
 */
async function request(queryClient: ReturnType<typeof makeTestQueryClient>) {
  const result: { value?: boolean } = {};
  await act(async () => {
    void ensureLegalIdentity(queryClient).then((r) => (result.value = r));
    await new Promise((r) => setTimeout(r, 0));
  });
  return result;
}

beforeEach(() => {
  mockPathname = '/';
  resetRouterMocks();
  mockGetPending.mockReset().mockResolvedValue({ data: { pending: [] } });
  mockGetStatus.mockReset();
  mockSubmit.mockReset();
  useAuthStore.setState({ isAuthenticated: true, isLoading: false });
  useLegalIdentityRequestStore.setState({ requested: false });
});

describe('B-2.4 · ensureLegalIdentity (ihtiyaç anında kimlik)', () => {
  it('kimlik tamamsa kapı açılmaz, işlem hemen devam eder', async () => {
    mockGetStatus.mockResolvedValue({ data: COMPLETE });
    const { queryClient } = setup();
    expect((await request(queryClient)).value).toBe(true);
    expect(screen.queryByTestId('identity-gate')).toBeNull();
  });

  it('muaf hesapta (required:false) hiç gösterilmez', async () => {
    mockGetStatus.mockResolvedValue({ data: status({ required: false, missing: [] }) });
    const { queryClient } = setup();
    expect((await request(queryClient)).value).toBe(true);
    expect(screen.queryByTestId('identity-gate')).toBeNull();
  });

  it('misafirde istek atılmaz (işlemin kendi giriş kapısı var)', async () => {
    useAuthStore.setState({ isAuthenticated: false });
    const { queryClient } = setup();
    expect((await request(queryClient)).value).toBe(true);
    expect(mockGetStatus).not.toHaveBeenCalled();
  });

  it('durum alınamazsa işlem kilitlenmez (fail-open, sunucu zorlamıyor)', async () => {
    mockGetStatus.mockRejectedValue({ response: { status: 404 } });
    const { queryClient } = setup();
    expect((await request(queryClient)).value).toBe(true);
    expect(screen.queryByTestId('identity-gate')).toBeNull();
  });

  it('önbellek "tamam" diyorsa ağa çıkmaz', async () => {
    const { queryClient } = setup();
    queryClient.setQueryData(['legal-identity', 'me'], COMPLETE);
    expect((await request(queryClient)).value).toBe(true);
    expect(mockGetStatus).not.toHaveBeenCalled();
  });

  it('eksikse kapı açılır; yalnız eksik alanlar sorulur, dolu alan salt-okunur', async () => {
    mockGetStatus.mockResolvedValue({
      data: status({ missing: ['nationalId'], legalFirstName: 'Ayşe', legalLastName: 'Yılmaz' }),
    });
    const { queryClient } = setup();
    await request(queryClient);

    expect(await screen.findByTestId('identity-gate')).toBeOnTheScreen();
    expect(screen.getByTestId('identity-gate-nationalId')).toBeOnTheScreen();
    expect(screen.queryByTestId('identity-gate-legalFirstName')).toBeNull();
    expect(screen.queryByTestId('identity-gate-legalLastName')).toBeNull();
    expect(screen.getByDisplayValue('Ayşe')).toBeOnTheScreen();
    expect(screen.getByDisplayValue('Yılmaz')).toBeOnTheScreen();
  });

  it('suggestedNationalId TCKN alanını ön doldurur; ad ön doldurulmaz', async () => {
    mockGetStatus.mockResolvedValue({ data: status({ suggestedNationalId: VALID_TCKN }) });
    const { queryClient } = setup();
    await request(queryClient);

    expect(await screen.findByTestId('identity-gate')).toBeOnTheScreen();
    expect(screen.getByTestId('identity-gate-nationalId').props.value).toBe(VALID_TCKN);
    expect(screen.getByTestId('identity-gate-legalFirstName').props.value).toBe('');
    expect(
      screen.getByText('Banka hesabınıza girdiğiniz numarayla dolduruldu; lütfen kontrol edin.'),
    ).toBeOnTheScreen();
  });

  it('biçimli TCKN yapıştırma kesilmez: ham sınır geniş, normalizasyonu transform yapar', async () => {
    mockGetStatus.mockResolvedValue({ data: status({ missing: ['nationalId'] }) });
    const { queryClient } = setup();
    await request(queryClient);
    const input = await screen.findByTestId('identity-gate-nationalId');

    // Native maxLength transform'dan önce keser; 11 olsaydı yapıştırma 9 haneye inerdi.
    const pasted = '100 000 001 46';
    expect(input.props.maxLength).toBe(NATIONAL_ID_INPUT_MAX_LENGTH);
    expect(input.props.maxLength).toBeGreaterThanOrEqual(pasted.length);
    expect(input.props.maxLength).toBeGreaterThanOrEqual(' 100-000-001-46 '.length);

    fireEvent.changeText(input, pasted);
    expect(screen.getByTestId('identity-gate-nationalId').props.value).toBe(VALID_TCKN);
    // 11 haneden fazlası yine kırpılır.
    fireEvent.changeText(screen.getByTestId('identity-gate-nationalId'), `${VALID_TCKN}999`);
    expect(screen.getByTestId('identity-gate-nationalId').props.value).toBe(VALID_TCKN);
  });

  it('geçersiz TCKN gönderilmez (vendored algoritma)', async () => {
    mockGetStatus.mockResolvedValue({ data: status({ missing: ['nationalId'] }) });
    const { queryClient } = setup();
    await request(queryClient);
    fireEvent.changeText(await screen.findByTestId('identity-gate-nationalId'), '12345678901');
    fireEvent.press(screen.getByTestId('identity-gate-submit'));

    expect(await screen.findByText('Geçerli bir T.C. Kimlik Numarası girin.')).toBeOnTheScreen();
    expect(mockSubmit).not.toHaveBeenCalled();
  });

  it('kaydet: POST yalnız eksikleri normalize taşır; tamamlanınca kapı kapanır ve işlem devam eder', async () => {
    mockGetStatus.mockResolvedValue({ data: status({ missing: ['legalLastName', 'nationalId'], legalFirstName: 'Ayşe' }) });
    mockSubmit.mockResolvedValue({ data: COMPLETE });
    const { queryClient } = setup();
    const result = await request(queryClient);

    fireEvent.changeText(await screen.findByTestId('identity-gate-legalLastName'), '  Öz-Demir  ');
    fireEvent.changeText(screen.getByTestId('identity-gate-nationalId'), '100 000 001 46');
    fireEvent.press(screen.getByTestId('identity-gate-submit'));

    await waitFor(() => expect(mockSubmit).toHaveBeenCalledTimes(1));
    expect(mockSubmit.mock.calls[0]![0]).toEqual({ legalLastName: 'Öz-Demir', nationalId: VALID_TCKN });
    await waitFor(() => expect(result.value).toBe(true));
    expect(screen.queryByTestId('identity-gate')).toBeNull();
  });

  it('sunucu hatası kapının içinde gösterilir, kapı açık kalır', async () => {
    mockGetStatus.mockResolvedValue({ data: status({ missing: ['nationalId'] }) });
    mockSubmit.mockRejectedValue({
      response: { status: 409, data: { message: 'Bu T.C. Kimlik Numarası kullanılamıyor.' } },
    });
    const { queryClient } = setup();
    await request(queryClient);
    fireEvent.changeText(await screen.findByTestId('identity-gate-nationalId'), VALID_TCKN);
    fireEvent.press(screen.getByTestId('identity-gate-submit'));

    expect(await screen.findByText('Bu T.C. Kimlik Numarası kullanılamıyor.')).toBeOnTheScreen();
    expect(screen.getByTestId('identity-gate')).toBeOnTheScreen();
  });

  it('"Vazgeç" kapıyı kapatır ve işlemi iptal eder (false)', async () => {
    mockGetStatus.mockResolvedValue({ data: status() });
    const { queryClient } = setup();
    const result = await request(queryClient);

    fireEvent.press(await screen.findByTestId('identity-gate-cancel'));
    await waitFor(() => expect(result.value).toBe(false));
    expect(screen.queryByTestId('identity-gate')).toBeNull();
    expect(mockSubmit).not.toHaveBeenCalled();
  });

  it('Android geri tuşu kimlik adımında "Vazgeç" gibi davranır', async () => {
    mockGetStatus.mockResolvedValue({ data: status() });
    const { queryClient } = setup();
    const result = await request(queryClient);
    await screen.findByTestId('identity-gate');

    // Kapı native Modal: geri tuşu BackHandler'a değil `onRequestClose`'a düşer.
    act(() => screen.UNSAFE_getByType(Modal).props.onRequestClose());
    await waitFor(() => expect(result.value).toBe(false));
    expect(screen.queryByTestId('identity-gate')).toBeNull();
  });

  it('ön plana dönüşte durum yenilenir; kimlik web\'de tamamlandıysa adım kapanır, işlem devam eder', async () => {
    const listeners: ((s: string) => void)[] = [];
    const spy = jest.spyOn(AppState, 'addEventListener').mockImplementation((type, fn) => {
      if (type === 'change') listeners.push(fn as (s: string) => void);
      return { remove: jest.fn() } as unknown as ReturnType<typeof AppState.addEventListener>;
    });
    mockGetStatus.mockResolvedValue({ data: status() });
    const { queryClient, view } = setup();
    const result = await request(queryClient);
    await screen.findByTestId('identity-gate');

    mockGetStatus.mockResolvedValue({ data: COMPLETE });
    act(() => ['background', 'active'].forEach((st) => listeners.forEach((l) => l(st))));
    await waitFor(() => expect(result.value).toBe(true));
    expect(screen.queryByTestId('identity-gate')).toBeNull();
    // RN jest kurulumunda AppState.addEventListener zaten bir mock: mockRestore
    // onun uygulamasını da siler ve sonraki testlerde `sub.remove` patlar.
    view.unmount();
    spy.mockImplementation(
      () => ({ remove: jest.fn() }) as unknown as ReturnType<typeof AppState.addEventListener>,
    );
  });

  it('oturum kapanırsa bekleyen işlem iptal olur', async () => {
    mockGetStatus.mockResolvedValue({ data: status() });
    const { queryClient } = setup();
    const result = await request(queryClient);
    await screen.findByTestId('identity-gate');

    act(() => useAuthStore.setState({ isAuthenticated: false }));
    await waitFor(() => expect(result.value).toBe(false));
  });

  it('bekleyen onay varsa önce onay kapısı, kimlik ondan sonra', async () => {
    mockGetPending.mockResolvedValue({
      data: { pending: [{ document: 'kvkk', version: '2026-08-04', reason: 'missing', path: '/privacy' }] },
    });
    mockGetStatus.mockResolvedValue({ data: status() });
    const { queryClient } = setup();
    await request(queryClient);

    expect(await screen.findByTestId('consent-gate')).toBeOnTheScreen();
    expect(screen.queryByTestId('identity-gate')).toBeNull();
  });

  it('KVKK bağlantısı metni açar; metin sayfasında kapı gizlenir, dönünce geri gelir', async () => {
    mockGetStatus.mockResolvedValue({ data: status() });
    const { queryClient, view } = setup();
    await request(queryClient);
    fireEvent.press(await screen.findByTestId('identity-gate-privacy'));
    expect(pushMock).toHaveBeenCalledWith('/privacy');

    mockPathname = '/privacy';
    view.rerender(<RequiredStepsGate />);
    expect(screen.queryByTestId('identity-gate')).toBeNull();

    mockPathname = '/';
    view.rerender(<RequiredStepsGate />);
    expect(screen.getByTestId('identity-gate')).toBeOnTheScreen();
  });

  it('aynı anda iki işlem tek pencere açar, ikisi de aynı sonucu alır', async () => {
    mockGetStatus.mockResolvedValue({ data: status() });
    const { queryClient } = setup();
    const results = [await request(queryClient), await request(queryClient)];

    expect(await screen.findAllByTestId('identity-gate')).toHaveLength(1);
    fireEvent.press(screen.getByTestId('identity-gate-cancel'));
    await waitFor(() => expect(results.map((r) => r.value)).toEqual([false, false]));
  });
});
