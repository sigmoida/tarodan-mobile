/**
 * Kurumsal davet aktivasyonu. Token geçersiz/eksikse form GÖSTERİLMEZ.
 * Kullanıcı adı bir kez belirlenir ve değiştirilemez — formda açıkça yazılır.
 */
import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils';

let mockParams: Record<string, string> = { token: 'inv-1' };
const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  router: { replace: (r: string) => mockReplace(r), back: jest.fn(), canGoBack: () => false },
  useLocalSearchParams: () => mockParams,
}));

jest.mock('@/lib/api', () => ({
  authApi: {
    getCorporateInvitation: jest.fn(),
    activateCorporateInvitation: jest.fn(),
  },
}));
import { authApi } from '@/lib/api';

// NOT: `@/ui` global olarak jest.setup.ts'te mock'lanıyor (appAlert: jest.fn()) —
// burada ayrıca override etmiyoruz, aksi halde global `mockReset()` kırılır.

import CorporateInviteScreen from '../index';

beforeEach(() => {
  jest.clearAllMocks();
  mockParams = { token: 'inv-1' };
});

it('geçerli davette şirket bilgisini ve formu gösterir', async () => {
  (authApi.getCorporateInvitation as jest.Mock).mockResolvedValue({
    data: { companyTitle: 'Tarodan Otomotiv', companyEmail: 'k@firma.com', expiresAt: '2026-08-10' },
  });
  renderWithProviders(<CorporateInviteScreen />);

  await waitFor(() => expect(screen.getByText('Tarodan Otomotiv')).toBeTruthy());
  expect(screen.getByTestId('invite-username')).toBeTruthy();
  expect(screen.getByTestId('invite-password')).toBeTruthy();
});

it('token yoksa formu göstermez, geçersiz bağlantı ekranı çıkar', async () => {
  mockParams = {};
  renderWithProviders(<CorporateInviteScreen />);

  await waitFor(() => expect(screen.getByTestId('invite-invalid')).toBeTruthy());
  expect(screen.queryByTestId('invite-username')).toBeNull();
  expect(authApi.getCorporateInvitation).not.toHaveBeenCalled();
});

it('davet geçersiz/süresi dolmuşsa (400) formu göstermez', async () => {
  (authApi.getCorporateInvitation as jest.Mock).mockRejectedValue({
    response: { status: 400, data: { message: 'Davet süresi dolmuş' } },
  });
  renderWithProviders(<CorporateInviteScreen />);

  await waitFor(() => expect(screen.getByTestId('invite-invalid')).toBeTruthy());
  expect(screen.queryByTestId('invite-username')).toBeNull();
});

it('aktivasyon başarılı olduğunda girişe yönlendirir', async () => {
  (authApi.getCorporateInvitation as jest.Mock).mockResolvedValue({
    data: { companyTitle: 'Tarodan Otomotiv', companyEmail: 'k@firma.com', expiresAt: '2026-08-10' },
  });
  (authApi.activateCorporateInvitation as jest.Mock).mockResolvedValue({ data: {} });
  renderWithProviders(<CorporateInviteScreen />);
  await waitFor(() => expect(screen.getByTestId('invite-username')).toBeTruthy());

  fireEvent.changeText(screen.getByTestId('invite-username'), 'tarodan.kurumsal');
  fireEvent.changeText(screen.getByTestId('invite-password'), 'SecurePass1');
  fireEvent.changeText(screen.getByTestId('invite-password-confirm'), 'SecurePass1');
  fireEvent.press(screen.getByTestId('invite-submit'));

  await waitFor(() =>
    expect(authApi.activateCorporateInvitation).toHaveBeenCalledWith({
      token: 'inv-1',
      username: 'tarodan.kurumsal',
      password: 'SecurePass1',
    }),
  );
  await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/(auth)/login'));
});

// §5 yakınsaması: kural artık `@/utils/validation`'daki tek `usernameSchema`.
// ÖNCEDEN bu ekranın şemasında `.toLowerCase()` YOKTU, yani karışık büyük/küçük
// giriş reddediliyordu — kayıt ekranı ise sessizce kabul ediyordu. Artık ikisi de
// alanda küçük harfe çevirir; davranış farkı bilinçli bir karara dönüştü.
it('karışık büyük/küçük kullanıcı adı alanda küçük harfe çevrilir ve öyle gönderilir', async () => {
  (authApi.getCorporateInvitation as jest.Mock).mockResolvedValue({
    data: { companyTitle: 'X', companyEmail: 'k@firma.com', expiresAt: '2026-08-10' },
  });
  (authApi.activateCorporateInvitation as jest.Mock).mockResolvedValue({ data: {} });
  renderWithProviders(<CorporateInviteScreen />);
  await waitFor(() => expect(screen.getByTestId('invite-username')).toBeTruthy());

  const input = screen.getByTestId('invite-username');
  fireEvent.changeText(input, 'Tarodan.Kurumsal');
  expect(input.props.value).toBe('tarodan.kurumsal');

  fireEvent.changeText(screen.getByTestId('invite-password'), 'SecurePass1');
  fireEvent.changeText(screen.getByTestId('invite-password-confirm'), 'SecurePass1');
  fireEvent.press(screen.getByTestId('invite-submit'));

  await waitFor(() =>
    expect(authApi.activateCorporateInvitation).toHaveBeenCalledWith(
      expect.objectContaining({ username: 'tarodan.kurumsal' }),
    ),
  );
});

it('geçersiz kullanıcı adını göndermez', async () => {
  (authApi.getCorporateInvitation as jest.Mock).mockResolvedValue({
    data: { companyTitle: 'X', companyEmail: 'k@firma.com', expiresAt: '2026-08-10' },
  });
  renderWithProviders(<CorporateInviteScreen />);
  await waitFor(() => expect(screen.getByTestId('invite-username')).toBeTruthy());

  fireEvent.changeText(screen.getByTestId('invite-username'), 'Büyük Harf');
  fireEvent.changeText(screen.getByTestId('invite-password'), 'SecurePass1');
  fireEvent.changeText(screen.getByTestId('invite-password-confirm'), 'SecurePass1');
  fireEvent.press(screen.getByTestId('invite-submit'));

  await waitFor(() => expect(screen.getByText(/küçük harf/i)).toBeTruthy());
  expect(authApi.activateCorporateInvitation).not.toHaveBeenCalled();
});
