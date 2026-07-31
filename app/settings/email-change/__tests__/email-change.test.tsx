import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils/render';
import EmailChangeScreen from '../index';
import { authApi } from '@/lib/api';

jest.mock('@/lib/api', () => ({
  authApi: {
    requestEmailChange: jest.fn(() => Promise.resolve({ data: { message: 'ok' } })),
    verifyEmailChange: jest.fn(() => Promise.resolve({ data: { email: 'yeni@ornek.com' } })),
  },
}));

jest.mock('expo-router', () => ({ router: { back: jest.fn(), push: jest.fn() } }));

// Not: brief testi düz `render` ile yazıyordu; useEmailChange useMutation kullandığı için
// QueryClientProvider gerekiyor (aksi halde "No QueryClient set" hatası). Repo'nun kendi
// test-utils yardımcısı (`renderWithProviders`) kullanıldı — davranış aynı.
const renderScreen = () => renderWithProviders(<EmailChangeScreen />);

describe('E-posta değişikliği', () => {
  beforeEach(() => jest.clearAllMocks());

  it('geçersiz e-posta gönderilmez', async () => {
    const { getByTestId } = renderScreen();
    fireEvent.changeText(getByTestId('email-change-input'), 'gecersiz');
    fireEvent.press(getByTestId('email-change-request'));
    await waitFor(() => expect(authApi.requestEmailChange).not.toHaveBeenCalled());
  });

  it('geçerli e-posta ile kod istenir ve kod adımına geçilir', async () => {
    const { getByTestId } = renderScreen();
    fireEvent.changeText(getByTestId('email-change-input'), 'yeni@ornek.com');
    fireEvent.press(getByTestId('email-change-request'));
    await waitFor(() =>
      expect(authApi.requestEmailChange).toHaveBeenCalledWith('yeni@ornek.com'),
    );
    await waitFor(() => expect(getByTestId('email-change-code')).toBeTruthy());
  });

  it('6 haneden kısa kod doğrulamaya gönderilmez', async () => {
    const { getByTestId } = renderScreen();
    fireEvent.changeText(getByTestId('email-change-input'), 'yeni@ornek.com');
    fireEvent.press(getByTestId('email-change-request'));
    await waitFor(() => expect(getByTestId('email-change-code')).toBeTruthy());
    fireEvent.changeText(getByTestId('email-change-code'), '123');
    fireEvent.press(getByTestId('email-change-verify'));
    await waitFor(() => expect(authApi.verifyEmailChange).not.toHaveBeenCalled());
  });

  it('6 haneli kod doğrulanır', async () => {
    const { getByTestId } = renderScreen();
    fireEvent.changeText(getByTestId('email-change-input'), 'yeni@ornek.com');
    fireEvent.press(getByTestId('email-change-request'));
    await waitFor(() => expect(getByTestId('email-change-code')).toBeTruthy());
    fireEvent.changeText(getByTestId('email-change-code'), '123456');
    fireEvent.press(getByTestId('email-change-verify'));
    await waitFor(() => expect(authApi.verifyEmailChange).toHaveBeenCalledWith('123456'));
  });
});
