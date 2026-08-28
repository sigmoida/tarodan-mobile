/**
 * Kurumsal ön-başvuru ekranı. Canlı doğrulama (task-3-report.md): yanlış (eski)
 * payload API'de 400 alıyordu (beş zorunlu alan eksik); doğru sekiz alanla 201 +
 * `{applicationId, status, email, message}` dönüyor. Bu adım HESAP AÇMAZ —
 * `password` hiç toplanmaz/gönderilmez, başarı ekranı "hesabınız açıldı" demez.
 */
import React from 'react';
import { TextInput } from 'react-native';
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
  // `errorText` paylaşılan gerçek helper — mock'lanmaz, çünkü boş-dizi/boş-string
  // davranışı burada test ediliyor (client.ts'i çekmemek için doğrudan modülden).
  errorText: jest.requireActual('@/lib/api/errorText').errorText,
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
  // B13: kepAddress zorunlu — web ile eşleşir (KEP yasal tebligat kanalı).
  fireEvent.changeText(
    screen.getByTestId('register-business-kepAddress-input'),
    'basvuru@hs01.kep.tr',
  );
  fireEvent.changeText(screen.getByTestId('register-business-phone-input'), '0532 123 45 67');
  fireEvent.press(screen.getByTestId('register-business-acceptTerms'));
};

beforeEach(() => {
  jest.clearAllMocks();
});

it('şifre alanı hiç render edilmez (bu adım hesap açmaz)', () => {
  renderWithProviders(<RegisterBusinessScreen />);
  // Asıl koruma: ağaçta `secureTextEntry` ile render edilmiş HİÇBİR TextInput yok.
  // (testID/placeholder sorgulamak vakumdu — o testID'ler eski kodda da yoktu.)
  const secureInputs = screen
    .UNSAFE_queryAllByType(TextInput)
    .filter((node) => node.props.secureTextEntry === true);
  expect(secureInputs).toHaveLength(0);
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
    // B13: kepAddress artık zorunlu, `fillValidForm` her zaman dolduruyor.
    kepAddress: 'basvuru@hs01.kep.tr',
    phone: '+905321234567',
  });
  expect(payload).not.toHaveProperty('password');
  // contactPhone opsiyonel — boş bırakılınca HİÇ gönderilmez.
  expect(Object.keys(payload).sort()).toEqual(
    [
      'authorizedFullName',
      'companyLegalName',
      'companyTitle',
      'companyAddress',
      'companyEmail',
      'kepAddress',
      'phone',
    ].sort(),
  );
});

it('contactPhone doldurulunca payload\'a eklenir ve telefon normalize edilir', async () => {
  (authApi.registerBusiness as jest.Mock).mockResolvedValue({
    data: { applicationId: 'app-2', status: 'submitted', email: 'x@y.com', message: 'ok' },
  });
  renderWithProviders(<RegisterBusinessScreen />);

  fillValidForm();
  fireEvent.changeText(screen.getByTestId('register-business-contactPhone-input'), '0533 765 43 21');
  fireEvent.press(screen.getByTestId('register-business-submit-button'));

  await waitFor(() => expect(authApi.registerBusiness).toHaveBeenCalledTimes(1));
  const payload = (authApi.registerBusiness as jest.Mock).mock.calls[0][0];
  expect(payload.kepAddress).toBe('basvuru@hs01.kep.tr');
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
  fireEvent.changeText(
    screen.getByTestId('register-business-kepAddress-input'),
    'basvuru@hs01.kep.tr',
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

it('başarı mesajı başvuru numarasını içerir (destek referansı)', async () => {
  (authApi.registerBusiness as jest.Mock).mockResolvedValue({
    data: { applicationId: '40356b5a-1506-4169-86be-0a8e726d6f4f', status: 'submitted', email: 'x@y.com', message: 'ok' },
  });
  renderWithProviders(<RegisterBusinessScreen />);

  fillValidForm();
  fireEvent.press(screen.getByTestId('register-business-submit-button'));

  await waitFor(() => expect(appAlert).toHaveBeenCalledTimes(1));
  const [, message] = (appAlert as jest.Mock).mock.calls[0];
  expect(message).toMatch(/40356b5a-1506-4169-86be-0a8e726d6f4f/);
});

/**
 * REGRESYON: `defaultValues` yalnız `acceptTerms` veriyordu; dokunulmamış string
 * alanlar RHF'te `undefined` kalıp zod `invalid_type` → İngilizce "Required"
 * üretiyordu. Tamamen Türkçe bir ekranda en sık gidilen hata yolu buydu.
 */
it('boş formda submit → hataların hepsi TÜRKÇE, "Required" hiç görünmez', async () => {
  renderWithProviders(<RegisterBusinessScreen />);

  fireEvent.press(screen.getByTestId('register-business-submit-button'));

  // authorizedFullName / companyLegalName / companyTitle
  await waitFor(() => expect(screen.getAllByText('En az 2 karakter olmalıdır')).toHaveLength(3));
  expect(screen.getByText('En az 10 karakter olmalıdır')).toBeTruthy(); // companyAddress
  expect(screen.getByText('Geçerli bir e-posta adresi girin')).toBeTruthy(); // companyEmail
  expect(screen.getByText('E-posta adresi gerekli')).toBeTruthy(); // kepAddress (B13: zorunlu)
  expect(screen.getByText('Telefon numarası gerekli')).toBeTruthy(); // phone
  expect(screen.getByText(/sözleşmesini.*kabul/i)).toBeTruthy(); // acceptTerms
  expect(screen.queryAllByText(/required/i)).toHaveLength(0);
  expect(authApi.registerBusiness).not.toHaveBeenCalled();
});

it('kepAddress boş bırakılınca hata verir (B13: zorunlu, contactPhone ise opsiyonel kalır)', async () => {
  renderWithProviders(<RegisterBusinessScreen />);
  fireEvent.press(screen.getByTestId('register-business-submit-button'));

  await waitFor(() => expect(screen.getByText('Telefon numarası gerekli')).toBeTruthy());
  expect(screen.getByText('E-posta adresi gerekli')).toBeTruthy(); // kepAddress
  // companyEmail (format hatası) + kepAddress (zorunlu hatası) — biri diğerinin
  // mesajını taşımaz, ikisi ayrı metin.
  expect(screen.queryAllByText('Geçerli bir e-posta adresi girin')).toHaveLength(1);
  expect(screen.queryAllByText(/Geçerli bir telefon numarası girin/)).toHaveLength(0);
});

/**
 * REGRESYON: eski form `PhoneInput` ile her tuş vuruşunda formatlıyordu; yeni form
 * düz `FormInput`'a geçince normalizasyon yalnız submit'te ve GÖRÜNMEZ koşuyordu.
 */
it('telefon alanı yazarken formatlanır — görünen değer gönderilen değerdir', () => {
  renderWithProviders(<RegisterBusinessScreen />);
  const phone = screen.getByTestId('register-business-phone-input');

  fireEvent.changeText(phone, '05321234567');
  expect(phone.props.value).toBe('532 123 45 67');

  fireEvent.changeText(phone, '+905321234567');
  expect(phone.props.value).toBe('532 123 45 67');
});

it('çözülemeyen telefon gönderilmez (TR olmayan numara sessizce kırpılmaz)', async () => {
  renderWithProviders(<RegisterBusinessScreen />);

  fillValidForm();
  fireEvent.changeText(screen.getByTestId('register-business-phone-input'), '+1 415 555 0100');
  fireEvent.press(screen.getByTestId('register-business-submit-button'));

  await waitFor(() =>
    expect(screen.getByText('Geçerli bir telefon numarası girin (5XX XXX XX XX)')).toBeTruthy(),
  );
  expect(authApi.registerBusiness).not.toHaveBeenCalled();
});

it('429 (throttle) → NestJS sınıf adı değil, Türkçe mesaj gösterilir', async () => {
  (authApi.registerBusiness as jest.Mock).mockRejectedValue({
    response: { status: 429, data: { message: 'ThrottlerException: Too Many Requests', statusCode: 429 } },
  });
  renderWithProviders(<RegisterBusinessScreen />);

  fillValidForm();
  fireEvent.press(screen.getByTestId('register-business-submit-button'));

  await waitFor(() => expect(appAlert).toHaveBeenCalledTimes(1));
  const [title, message] = (appAlert as jest.Mock).mock.calls[0];
  expect(title).toBe('Başvuru gönderilemedi');
  expect(message).not.toMatch(/ThrottlerException|Too Many Requests/);
  expect(message).toMatch(/bir dakika sonra tekrar deneyin/i);
});

it('boş `message` dizisiyle gelen 400 → boş alert değil, Türkçe fallback', async () => {
  (authApi.registerBusiness as jest.Mock).mockRejectedValue({
    response: { status: 400, data: { message: [] } },
  });
  renderWithProviders(<RegisterBusinessScreen />);

  fillValidForm();
  fireEvent.press(screen.getByTestId('register-business-submit-button'));

  await waitFor(() => expect(appAlert).toHaveBeenCalledTimes(1));
  const [, message] = (appAlert as jest.Mock).mock.calls[0];
  expect(message).toBe('Başvurunuz gönderilemedi. Lütfen tekrar deneyin.');
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
