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
import { screen, fireEvent, waitFor } from '@testing-library/react-native';
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
  bankAccountApi: {
    get: jest.fn(),
    upsert: jest.fn(() => Promise.resolve({ data: {} })),
    remove: jest.fn(),
  },
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
});
