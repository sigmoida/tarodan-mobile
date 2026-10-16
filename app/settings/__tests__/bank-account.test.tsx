/**
 * B-1.8 · Banka hesabı formu — TCKN alanı ve "yeniden doğrulama" notu kalktı.
 *
 * - TCKN'nin tek kaynağı yasal kimlik (delta 23 §3); API `tcKimlikNo`'yu
 *   gönderilmezse kayıtlı değere DOKUNMADAN kabul ediyor (user-bank.service
 *   `resolveBankTckn`). Mobil artık alanı göstermiyor ve GÖNDERMİYOR — kayıtlı
 *   eski değer GET yanıtında olsa bile payload'a sızmıyor.
 * - IBAN doğrulaması kaldırıldı (0487eaee4): "Doğrulanmadı durumuna döner" notu yanlıştı.
 */
import React from 'react';
import { Keyboard } from 'react-native';
import { act, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils';

let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  ...jest.requireActual('@/test-utils/router-mock').routerMock,
  useLocalSearchParams: () => mockParams,
}));
import { backMock, canGoBackMock, replaceMock, resetRouterMocks } from '@/test-utils/router-mock';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

jest.mock('@/stores/authStore', () => ({
  useAuthStore: (sel?: (state: any) => unknown) => {
    const state: any = { isAuthenticated: true };
    return sel ? sel(state) : state;
  },
}));

jest.mock('@/lib/api', () => ({
  errorText: jest.requireActual('@/lib/api/errorText').errorText,
  bankAccountApi: {
    get: jest.fn(),
    upsert: jest.fn(() => Promise.resolve({ data: {} })),
    remove: jest.fn(),
  },
}));
const mockRequireIdentity = jest.fn(() => Promise.resolve(true));
jest.mock('@/hooks/useLegalIdentity', () => ({
  useRequireLegalIdentity: () => ({ requireIdentity: mockRequireIdentity, isChecking: false }),
}));

import { bankAccountApi } from '@/lib/api';
const get = bankAccountApi.get as jest.Mock;
const upsert = bankAccountApi.upsert as jest.Mock;

import BankAccountScreen from '../bank-account';

// Geçerli (mod-97) bir TR IBAN.
const IBAN = 'TR330006100519786457841326';

beforeEach(() => {
  mockParams = {};
  resetRouterMocks();
  get.mockReset();
  upsert.mockClear();
  mockRequireIdentity.mockReset().mockResolvedValue(true);
});

describe('B-1.8 · banka hesabı formu', () => {
  it('kayıtlı hesapta TCKN alanı ve yeniden doğrulama notu görünmez', async () => {
    get.mockResolvedValue({
      data: { accountHolder: 'Ayşe Yılmaz', iban: IBAN, tcKimlikNo: '10000000146', taxId: '' },
    });
    renderWithProviders(<BankAccountScreen />);

    expect(await screen.findByDisplayValue('Ayşe Yılmaz')).toBeTruthy();
    expect(screen.queryByText('bankAccount.tcknOptionalLabel')).toBeNull();
    expect(screen.queryByDisplayValue('10000000146')).toBeNull();
    expect(screen.queryByText('bankAccount.reverifyNotice')).toBeNull();
  });

  it('kaydetme payload\'ı tcKimlikNo İÇERMEZ (kayıtlı değer GET\'te olsa bile)', async () => {
    get.mockResolvedValue({
      data: { accountHolder: 'Ayşe Yılmaz', iban: IBAN, tcKimlikNo: '10000000146', taxId: '' },
    });
    renderWithProviders(<BankAccountScreen />);
    await screen.findByDisplayValue('Ayşe Yılmaz');

    fireEvent.press(screen.getByTestId('bank-account-submit-button'));

    await waitFor(() => expect(upsert).toHaveBeenCalledTimes(1));
    const payload = upsert.mock.calls[0]![0];
    expect(payload).toEqual({ accountHolder: 'Ayşe Yılmaz', iban: IBAN });
    expect(payload).not.toHaveProperty('tcKimlikNo');
  });

  it('yeni hesap: ad + IBAN ile kaydedilir, TCKN sorulmaz', async () => {
    get.mockResolvedValue({ data: null });
    renderWithProviders(<BankAccountScreen />);

    fireEvent.changeText(await screen.findByTestId('bank-account-holder-input'), 'Mehmet Kaya');
    fireEvent.changeText(screen.getByTestId('bank-account-iban-input'), IBAN);
    fireEvent.press(screen.getByTestId('bank-account-submit-button'));

    await waitFor(() => expect(upsert).toHaveBeenCalledTimes(1));
    expect(upsert.mock.calls[0]![0]).toEqual({ accountHolder: 'Mehmet Kaya', iban: IBAN });
  });

  it('B-2.4 · kaydetmeden önce yasal kimlik istenir; vazgeçilirse kayıt yapılmaz', async () => {
    get.mockResolvedValue({ data: null });
    mockRequireIdentity.mockResolvedValue(false);
    renderWithProviders(<BankAccountScreen />);

    fireEvent.changeText(await screen.findByTestId('bank-account-holder-input'), 'Mehmet Kaya');
    fireEvent.changeText(screen.getByTestId('bank-account-iban-input'), IBAN);
    fireEvent.press(screen.getByTestId('bank-account-submit-button'));

    await waitFor(() => expect(mockRequireIdentity).toHaveBeenCalledTimes(1));
    expect(upsert).not.toHaveBeenCalled();
  });

  it('kimlik adımından vazgeçilirse kullanıcıya kısa bilgi (toast) verilir', async () => {
    get.mockResolvedValue({ data: null });
    mockRequireIdentity.mockResolvedValue(false);
    const toastSpy = jest.spyOn(jest.requireMock('@/ui'), 'toast').mockImplementation(() => 1);
    renderWithProviders(<BankAccountScreen />);

    fireEvent.changeText(await screen.findByTestId('bank-account-holder-input'), 'Mehmet Kaya');
    fireEvent.changeText(screen.getByTestId('bank-account-iban-input'), IBAN);
    fireEvent.press(screen.getByTestId('bank-account-submit-button'));

    await waitFor(() => expect(toastSpy).toHaveBeenCalledWith('bankAccount.identityRequired'));
    toastSpy.mockRestore();
  });

  /** Kimlik adımı açık kalırken bekleyen `requireIdentity` — testte elle çözülür. */
  function deferIdentity() {
    let resolve!: (v: boolean) => void;
    mockRequireIdentity.mockImplementation(() => new Promise<boolean>((r) => (resolve = r)));
    return (v: boolean) => act(async () => resolve(v));
  }

  async function fillAndSave() {
    fireEvent.changeText(await screen.findByTestId('bank-account-holder-input'), 'Mehmet Kaya');
    fireEvent.changeText(screen.getByTestId('bank-account-iban-input'), IBAN);
    fireEvent.press(screen.getByTestId('bank-account-submit-button'));
    await waitFor(() => expect(mockRequireIdentity).toHaveBeenCalledTimes(1));
  }

  it('B3 inceleme 4 · kimlik adımı sürerken form değiştiyse eski değerler gönderilmez, yeniden Kaydet istenir', async () => {
    get.mockResolvedValue({ data: null });
    const toastSpy = jest.spyOn(jest.requireMock('@/ui'), 'toast').mockImplementation(() => 1);
    const finishIdentity = deferIdentity();
    renderWithProviders(<BankAccountScreen />);
    await fillAndSave();

    fireEvent.changeText(screen.getByTestId('bank-account-holder-input'), 'Ayşe Kaya');
    await finishIdentity(true);

    await waitFor(() => expect(toastSpy).toHaveBeenCalledWith('bankAccount.resubmitAfterIdentity'));
    expect(upsert).not.toHaveBeenCalled();
    toastSpy.mockRestore();

    // Yeniden Kaydet: güncel (görünen) değerler gider.
    mockRequireIdentity.mockReset().mockResolvedValue(true);
    fireEvent.press(screen.getByTestId('bank-account-submit-button'));
    await waitFor(() => expect(upsert).toHaveBeenCalledTimes(1));
    expect(upsert.mock.calls[0]![0]).toEqual({ accountHolder: 'Ayşe Kaya', iban: IBAN });
  });

  it('B3 inceleme 4 · form aynıysa kimlik tamamlanınca kayıt gider', async () => {
    get.mockResolvedValue({ data: null });
    const finishIdentity = deferIdentity();
    renderWithProviders(<BankAccountScreen />);
    await fillAndSave();

    await finishIdentity(true);
    await waitFor(() => expect(upsert).toHaveBeenCalledTimes(1));
    expect(upsert.mock.calls[0]![0]).toEqual({ accountHolder: 'Mehmet Kaya', iban: IBAN });
  });

  it('B3 inceleme 4 · kimlik adımı kapandığında ekran artık bağlı değilse kayıt gitmez', async () => {
    get.mockResolvedValue({ data: null });
    const finishIdentity = deferIdentity();
    const view = renderWithProviders(<BankAccountScreen />);
    await fillAndSave();

    view.unmount();
    await finishIdentity(true);
    expect(upsert).not.toHaveBeenCalled();
  });

  it('B-2.4 · form geçersizse kimlik bile sorulmaz', async () => {
    get.mockResolvedValue({ data: null });
    renderWithProviders(<BankAccountScreen />);
    fireEvent.press(await screen.findByTestId('bank-account-submit-button'));
    expect(await screen.findByText('bankAccount.ibanInvalid')).toBeTruthy();
    expect(mockRequireIdentity).not.toHaveBeenCalled();
  });

  describe('kayıt geri bildirimi', () => {
    it('ilk yüklemede form yerine yükleniyor durumu (boş form "kayıtlı değil" gibi görünmez)', async () => {
      get.mockReturnValue(new Promise(() => undefined));
      renderWithProviders(<BankAccountScreen />);

      await waitFor(() => expect(get).toHaveBeenCalled());
      expect(screen.queryByTestId('bank-account-holder-input')).toBeNull();
      expect(screen.queryByTestId('bank-account-summary')).toBeNull();
    });

    it('okuma hatasında ErrorState + yeniden dene', async () => {
      get.mockRejectedValueOnce(new Error('boom'));
      renderWithProviders(<BankAccountScreen />);

      expect(await screen.findByTestId('error-state')).toBeTruthy();
      expect(screen.queryByTestId('bank-account-holder-input')).toBeNull();

      get.mockResolvedValue({ data: { accountHolder: 'Ayşe Yılmaz', iban: IBAN } });
      fireEvent.press(screen.getByText('mobile.errorRetry'));
      expect(await screen.findByDisplayValue('Ayşe Yılmaz')).toBeTruthy();
    });

    it('kayıtlı hesapta özet kart: maskeli IBAN, hesap sahibi, "Kayıtlı" rozeti, son güncelleme', async () => {
      get.mockResolvedValue({
        data: { accountHolder: 'Ayşe Yılmaz', iban: IBAN, updatedAt: '2026-10-12T09:30:00.000Z' },
      });
      renderWithProviders(<BankAccountScreen />);

      const card = await screen.findByTestId('bank-account-summary');
      expect(card).toBeTruthy();
      expect(screen.getByText('TR33 **** **** **** **** **13 26')).toBeTruthy();
      expect(screen.getByText('bankAccount.savedBadge')).toBeTruthy();
      expect(screen.getAllByText('Ayşe Yılmaz').length).toBeGreaterThan(0);
      // Test çevirisi anahtarı döndürür; satırın çizilmesi yeterli.
      expect(screen.getByText('bankAccount.lastUpdated')).toBeTruthy();
    });

    it('updatedAt yoksa son güncelleme satırı çizilmez; hesap yoksa özet kart görünmez', async () => {
      get.mockResolvedValue({ data: { accountHolder: 'Ayşe Yılmaz', iban: IBAN } });
      const view = renderWithProviders(<BankAccountScreen />);
      await screen.findByTestId('bank-account-summary');
      expect(screen.queryByText('bankAccount.lastUpdated')).toBeNull();
      view.unmount();

      get.mockResolvedValue({ data: null });
      renderWithProviders(<BankAccountScreen />);
      await screen.findByTestId('bank-account-holder-input');
      expect(screen.queryByTestId('bank-account-summary')).toBeNull();
    });

    it('başarılı kayıtta klavye kapanır; Ayarlar\'dan gelindiyse ekranda kalınır', async () => {
      get.mockResolvedValue({ data: null });
      canGoBackMock.mockReturnValue(true);
      const dismiss = jest.spyOn(Keyboard, 'dismiss');
      renderWithProviders(<BankAccountScreen />);

      fireEvent.changeText(await screen.findByTestId('bank-account-holder-input'), 'Mehmet Kaya');
      fireEvent.changeText(screen.getByTestId('bank-account-iban-input'), IBAN);
      fireEvent.press(screen.getByTestId('bank-account-submit-button'));

      await waitFor(() => expect(dismiss).toHaveBeenCalled());
      expect(backMock).not.toHaveBeenCalled();
      expect(replaceMock).not.toHaveBeenCalled();
      dismiss.mockRestore();
    });

    it('from=listing: kayıttan sonra ilan formuna geri dönülür', async () => {
      mockParams = { from: 'listing' };
      get.mockResolvedValue({ data: null });
      canGoBackMock.mockReturnValue(true);
      renderWithProviders(<BankAccountScreen />);

      fireEvent.changeText(await screen.findByTestId('bank-account-holder-input'), 'Mehmet Kaya');
      fireEvent.changeText(screen.getByTestId('bank-account-iban-input'), IBAN);
      fireEvent.press(screen.getByTestId('bank-account-submit-button'));

      await waitFor(() => expect(backMock).toHaveBeenCalledTimes(1));
    });

    it('from=listing, geçmiş yoksa ana sekmeye düşer; kayıt başarısızsa geri dönülmez', async () => {
      mockParams = { from: 'listing' };
      get.mockResolvedValue({ data: null });
      upsert.mockRejectedValueOnce(new Error('fail'));
      renderWithProviders(<BankAccountScreen />);

      fireEvent.changeText(await screen.findByTestId('bank-account-holder-input'), 'Mehmet Kaya');
      fireEvent.changeText(screen.getByTestId('bank-account-iban-input'), IBAN);
      fireEvent.press(screen.getByTestId('bank-account-submit-button'));
      await waitFor(() => expect(upsert).toHaveBeenCalledTimes(1));
      expect(backMock).not.toHaveBeenCalled();
      expect(replaceMock).not.toHaveBeenCalled();

      fireEvent.press(screen.getByTestId('bank-account-submit-button'));
      await waitFor(() => expect(replaceMock).toHaveBeenCalledWith('/(tabs)'));
    });
  });
});
