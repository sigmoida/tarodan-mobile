/**
 * Kurumsal ön-başvuru ekranı. Canlı doğrulama (task-3-report.md): yanlış (eski)
 * payload API'de 400 alıyordu (beş zorunlu alan eksik); doğru sekiz alanla 201 +
 * `{applicationId, status, email, message}` dönüyor. Bu adım HESAP AÇMAZ —
 * `password` hiç toplanmaz/gönderilmez, başarı ekranı "hesabınız açıldı" demez.
 */
import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils';

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  router: { replace: (r: string) => mockReplace(r), back: jest.fn(), canGoBack: () => false },
}));

jest.mock('@/lib/api', () => ({
  authApi: {
    registerBusiness: jest.fn(),
  },
}));
import { authApi } from '@/lib/api';
import { appAlert } from '@/ui';

import RegisterBusinessScreen from '../index';

const fillValidForm = () => {
  fireEvent.changeText(
    screen.getByTestId('register-business-authorizedFullName-input'),
    'Ayşe Test Yılmaz',
  );
  fireEvent.changeText(
    screen.getByTestId('register-business-companyLegalName-input'),
    'Test Otomotiv Sanayi ve Ticaret Limited Şirketi',
  );
  fireEvent.changeText(
    screen.getByTestId('register-business-companyTitle-input'),
    'Test Otomotiv Ltd. Şti.',
  );
  fireEvent.changeText(
    screen.getByTestId('register-business-companyAddress-input'),
    'Örnek Mahallesi Test Caddesi No:12 Kadıköy İstanbul',
  );
  fireEvent.changeText(
    screen.getByTestId('register-business-companyEmail-input'),
    'basvuru@testotomotiv.com',
  );
  fireEvent.changeText(screen.getByTestId('register-business-phone-input'), '0532 123 45 67');
  fireEvent.press(screen.getByTestId('register-business-acceptTerms'));
};

beforeEach(() => {
  jest.clearAllMocks();
});

it('şifre alanı hiç render edilmez (bu adım hesap açmaz)', () => {
  renderWithProviders(<RegisterBusinessScreen />);
  expect(screen.queryByTestId('register-business-password-input')).toBeNull();
  expect(screen.queryByTestId('register-business-passwordConfirm-input')).toBeNull();
  expect(screen.queryByPlaceholderText('••••••••')).toBeNull();
  expect(screen.queryByText(/^Şifre \*$/)).toBeNull();
});

it('sekiz sözleşme alanı render edilir', () => {
  renderWithProviders(<RegisterBusinessScreen />);
  expect(screen.getByTestId('register-business-authorizedFullName-input')).toBeTruthy();
  expect(screen.getByTestId('register-business-companyLegalName-input')).toBeTruthy();
  expect(screen.getByTestId('register-business-companyTitle-input')).toBeTruthy();
  expect(screen.getByTestId('register-business-companyAddress-input')).toBeTruthy();
  expect(screen.getByTestId('register-business-companyEmail-input')).toBeTruthy();
  expect(screen.getByTestId('register-business-kepAddress-input')).toBeTruthy();
  expect(screen.getByTestId('register-business-phone-input')).toBeTruthy();
  expect(screen.getByTestId('register-business-contactPhone-input')).toBeTruthy();
});

it('geçerli form gönderildiğinde payload API DTO ile birebir eşleşir (fazla alan yok, password yok)', async () => {
  (authApi.registerBusiness as jest.Mock).mockResolvedValue({
    data: {
      applicationId: 'app-1',
      status: 'submitted',
      email: 'basvuru@testotomotiv.com',
      message: 'Şirket hesabı başarıyla oluşturuldu! Lütfen email adresinize gönderilen doğrulama linkine tıklayın.',
    },
  });
  renderWithProviders(<RegisterBusinessScreen />);

  fillValidForm();
  fireEvent.press(screen.getByTestId('register-business-submit-button'));

  await waitFor(() => expect(authApi.registerBusiness).toHaveBeenCalledTimes(1));

  const payload = (authApi.registerBusiness as jest.Mock).mock.calls[0][0];
  expect(payload).toEqual({
    authorizedFullName: 'Ayşe Test Yılmaz',
    companyLegalName: 'Test Otomotiv Sanayi ve Ticaret Limited Şirketi',
    companyTitle: 'Test Otomotiv Ltd. Şti.',
    companyAddress: 'Örnek Mahallesi Test Caddesi No:12 Kadıköy İstanbul',
    companyEmail: 'basvuru@testotomotiv.com',
    phone: '+905321234567',
  });
  expect(payload).not.toHaveProperty('password');
  // Boş bırakılan opsiyonel alanlar (kepAddress/contactPhone) HİÇ gönderilmez.
  expect(Object.keys(payload).sort()).toEqual(
    [
      'authorizedFullName',
      'companyLegalName',
      'companyTitle',
      'companyAddress',
      'companyEmail',
      'phone',
    ].sort(),
  );
});

it('kepAddress + contactPhone doldurulunca payload\'a eklenir ve telefon normalize edilir', async () => {
  (authApi.registerBusiness as jest.Mock).mockResolvedValue({
    data: { applicationId: 'app-2', status: 'submitted', email: 'x@y.com', message: 'ok' },
  });
  renderWithProviders(<RegisterBusinessScreen />);

  fillValidForm();
  fireEvent.changeText(screen.getByTestId('register-business-kepAddress-input'), 'firma@hs01.kep.tr');
  fireEvent.changeText(screen.getByTestId('register-business-contactPhone-input'), '0533 765 43 21');
  fireEvent.press(screen.getByTestId('register-business-submit-button'));

  await waitFor(() => expect(authApi.registerBusiness).toHaveBeenCalledTimes(1));
  const payload = (authApi.registerBusiness as jest.Mock).mock.calls[0][0];
  expect(payload.kepAddress).toBe('firma@hs01.kep.tr');
  expect(payload.contactPhone).toBe('+905337654321');
});

it('KVKK onayı işaretlenmeden gönderilmez', async () => {
  renderWithProviders(<RegisterBusinessScreen />);

  fireEvent.changeText(
    screen.getByTestId('register-business-authorizedFullName-input'),
    'Ayşe Test Yılmaz',
  );
  fireEvent.changeText(
    screen.getByTestId('register-business-companyLegalName-input'),
    'Test Otomotiv Sanayi ve Ticaret Limited Şirketi',
  );
  fireEvent.changeText(
    screen.getByTestId('register-business-companyTitle-input'),
    'Test Otomotiv Ltd. Şti.',
  );
  fireEvent.changeText(
    screen.getByTestId('register-business-companyAddress-input'),
    'Örnek Mahallesi Test Caddesi No:12 Kadıköy İstanbul',
  );
  fireEvent.changeText(
    screen.getByTestId('register-business-companyEmail-input'),
    'basvuru@testotomotiv.com',
  );
  fireEvent.changeText(screen.getByTestId('register-business-phone-input'), '0532 123 45 67');
  // acceptTerms İŞARETLENMEDİ.
  fireEvent.press(screen.getByTestId('register-business-submit-button'));

  await waitFor(() => expect(screen.getByText(/sözleşmesini.*kabul/i)).toBeTruthy());
  expect(authApi.registerBusiness).not.toHaveBeenCalled();
});

it('başarılı başvuruda "hesabınız açıldı" DENMEZ; login ekranına yönlendirir', async () => {
  (authApi.registerBusiness as jest.Mock).mockResolvedValue({
    data: {
      applicationId: 'app-3',
      status: 'submitted',
      email: 'basvuru@testotomotiv.com',
      message: 'Şirket hesabı başarıyla oluşturuldu! Lütfen email adresinize gönderilen doğrulama linkine tıklayın.',
    },
  });
  renderWithProviders(<RegisterBusinessScreen />);

  fillValidForm();
  fireEvent.press(screen.getByTestId('register-business-submit-button'));

  await waitFor(() => expect(appAlert).toHaveBeenCalledTimes(1));
  const [title, message] = (appAlert as jest.Mock).mock.calls[0];
  expect(title).not.toMatch(/hesabınız açıldı|hesap oluşturuldu/i);
  expect(message).toMatch(/admin onayı|inceleme/i);

  // Alert'in "Tamam" butonuna basılınca login'e yönlendirir (token/login YAPILMAZ).
  const buttons = (appAlert as jest.Mock).mock.calls[0][2];
  buttons[0].onPress();
  expect(mockReplace).toHaveBeenCalledWith('/(auth)/login');
});

it('400 hatasında API mesajını gösterir', async () => {
  (authApi.registerBusiness as jest.Mock).mockRejectedValue({
    response: {
      status: 400,
      data: {
        message: ['companyAddress must be longer than or equal to 10 characters'],
      },
    },
  });
  renderWithProviders(<RegisterBusinessScreen />);

  fillValidForm();
  fireEvent.press(screen.getByTestId('register-business-submit-button'));

  await waitFor(() => expect(appAlert).toHaveBeenCalledTimes(1));
  const [title, message] = (appAlert as jest.Mock).mock.calls[0];
  expect(title).toBe('Başvuru gönderilemedi');
  expect(message).toMatch(/companyAddress/);
  expect(mockReplace).not.toHaveBeenCalled();
});
