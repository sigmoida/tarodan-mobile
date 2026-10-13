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
import { act, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils';

jest.mock('expo-router', () => require('@/test-utils/router-mock').routerMock);

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
});
