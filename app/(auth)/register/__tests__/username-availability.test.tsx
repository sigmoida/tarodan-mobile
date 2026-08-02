/**
 * Kayıt ekranı — kullanıcı adı alanının uçtan uca davranışı: `available:false`
 * iken gönderim engellenir; büyük harfli giriş uygunluk ucuna hiç sorulmadan
 * elenir (canlıda ölçülen tuzak — uç format doğrulamıyor).
 */
import React from 'react';
import { screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils/render';
import { resetRouterMocks } from '@/test-utils/router-mock';

jest.mock('expo-router', () => require('@/test-utils/router-mock').routerMock);

jest.mock('@/lib/api', () => ({
  authApi: {
    register: jest.fn(),
    checkEmail: jest.fn(() => Promise.resolve({ data: { exists: false } })),
    checkUsernameAvailability: jest.fn(),
  },
}));
import { authApi } from '@/lib/api';
import RegisterScreen from '../index';

const mockRegister = authApi.register as jest.Mock;
const mockCheckAvailability = authApi.checkUsernameAvailability as jest.Mock;

function fillRestOfForm() {
  fireEvent.changeText(screen.getByTestId('register-displayName-input'), 'Test Kullanıcı');
  fireEvent.changeText(screen.getByTestId('register-email-input'), 'test@demo.com');
  fireEvent.changeText(screen.getByTestId('register-password-input'), 'Demo1234');
  fireEvent.changeText(screen.getByTestId('register-confirmPassword-input'), 'Demo1234');
  fireEvent.press(screen.getByTestId('register-acceptTerms'));
  fireEvent(screen.getByTestId('register-birthDate-input'), 'onChange', '1990-01-01');
}

describe('Kayıt ekranı — kullanıcı adı uygunluğu', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    resetRouterMocks();
    mockCheckAvailability.mockResolvedValue({ data: { available: true } });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('büyük harfli girişte uygunluk ucu hiç çağrılmaz', async () => {
    renderWithProviders(<RegisterScreen />);
    fireEvent.changeText(screen.getByTestId('register-username-input'), 'Gorkem');

    await jest.advanceTimersByTimeAsync(1000);
    expect(mockCheckAvailability).not.toHaveBeenCalled();
  });

  it('available:false iken "Kayıt Ol" kaydı göndermez', async () => {
    mockCheckAvailability.mockResolvedValue({ data: { available: false } });
    renderWithProviders(<RegisterScreen />);
    fireEvent.changeText(screen.getByTestId('register-username-input'), 'alinmis.ad');
    fillRestOfForm();

    await jest.advanceTimersByTimeAsync(400);
    await waitFor(() => expect(mockCheckAvailability).toHaveBeenCalledWith('alinmis.ad'));
    await waitFor(() => expect(screen.getByText('Bu kullanıcı adı alınmış')).toBeTruthy());

    fireEvent.press(screen.getByTestId('register-submit-button'));
    await act(async () => {
      await Promise.resolve();
    });
    expect(mockRegister).not.toHaveBeenCalled();
  });

  it('uygun kullanıcı adıyla kayıt normal şekilde (küçük harfe çevrilerek) gönderilir', async () => {
    mockRegister.mockResolvedValue({ data: { id: 'u1' } });
    renderWithProviders(<RegisterScreen />);
    fireEvent.changeText(screen.getByTestId('register-username-input'), 'Gorkem.Test');
    fillRestOfForm();

    fireEvent.press(screen.getByTestId('register-submit-button'));
    await waitFor(() =>
      expect(mockRegister).toHaveBeenCalledWith(
        expect.objectContaining({ username: 'gorkem.test' }),
      ),
    );
  });
});
