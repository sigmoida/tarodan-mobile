/**
 * Kayıt ekranı — kullanıcı adı alanının uçtan uca davranışı:
 * - `available:false` iken gönderim engellenir,
 * - karışık büyük/küçük giriş ALANDA anında küçük harfe çevrilir (kullanıcı
 *   gerçekten kaydolacağı handle'ı görür) ve uygunluk ucuna sorulur,
 * - girdi değişince önceki adın "alınmış" sonucu yeni ada yapışmaz (bayat sonuç).
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

  it('karışık büyük/küçük giriş alanda küçük harfe çevrilir ve uygunluk ucuna sorulur', async () => {
    renderWithProviders(<RegisterScreen />);
    const input = screen.getByTestId('register-username-input');
    fireEvent.changeText(input, 'Gorkem');

    // Alan, gerçekten kaydedilecek handle'ı gösterir — sessiz dönüşüm yok.
    expect(input.props.value).toBe('gorkem');

    await jest.advanceTimersByTimeAsync(400);
    await waitFor(() => expect(mockCheckAvailability).toHaveBeenCalledWith('gorkem'));
  });

  it('geçersiz karakter içeren giriş uygunluk ucuna hiç sorulmaz', async () => {
    renderWithProviders(<RegisterScreen />);
    fireEvent.changeText(screen.getByTestId('register-username-input'), 'gorkem test');

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

  it('alınmış addan yeni bir ada geçince "alınmış" kalkar, buton açılır ve kayıt gönderilir', async () => {
    mockCheckAvailability.mockImplementation((u: string) =>
      Promise.resolve({ data: { available: u !== 'alinmis.ad' } }),
    );
    mockRegister.mockResolvedValue({ data: { id: 'u1' } });
    renderWithProviders(<RegisterScreen />);
    fireEvent.changeText(screen.getByTestId('register-username-input'), 'alinmis.ad');
    fillRestOfForm();

    await jest.advanceTimersByTimeAsync(400);
    await waitFor(() => expect(screen.getByText('Bu kullanıcı adı alınmış')).toBeTruthy());

    // Kullanıcı bambaşka geçerli bir ada geçer ve HEMEN gönderir (mobilde
    // "yaz + hemen bas" gerçekçi). Bayat `available:false` yeni ada yapışmamalı.
    fireEvent.changeText(screen.getByTestId('register-username-input'), 'yeni.ad');
    expect(screen.queryByText('Bu kullanıcı adı alınmış')).toBeNull();
    expect(screen.getByText('Kontrol ediliyor…')).toBeTruthy();

    fireEvent.press(screen.getByTestId('register-submit-button'));
    await waitFor(() =>
      expect(mockRegister).toHaveBeenCalledWith(expect.objectContaining({ username: 'yeni.ad' })),
    );
  });
});

/**
 * N-1: `'İstanbul'.toLowerCase()` → `"i̇stanbul"` (i + BİRLEŞİK NOKTA U+0307,
 * 9 karakter) — alanda gözle "istanbul" gibi görünür ama USERNAME_PATTERN'i
 * geçmez. Öncesinde bu durumda hiçbir satır içi geri bildirim çıkmıyordu (RHF
 * `mode` varsayılan `onSubmit`); kullanıcı ancak "Kayıt Ol"a basınca öğreniyordu.
 * Hedef, bir transliterasyon EKLEMEK değil — yalnız görünürlük eklemek.
 */
describe('Kayıt ekranı — Türkçe karakterli girdide biçim uyarısı (N-1)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    resetRouterMocks();
    mockCheckAvailability.mockResolvedValue({ data: { available: true } });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('İpek yazınca biçim uyarısı ANINDA (debounce beklemeden) görünür ve uygunluk ucu hiç sorulmaz', async () => {
    renderWithProviders(<RegisterScreen />);
    fireEvent.changeText(screen.getByTestId('register-username-input'), 'İpek');

    // Senkron: 400ms debounce'u beklemeden görünür.
    expect(screen.getByText(/geçersiz biçim/i)).toBeTruthy();

    await jest.advanceTimersByTimeAsync(1000);
    expect(mockCheckAvailability).not.toHaveBeenCalled();
  });

  it('boş alanda biçim uyarısı görünmez (kullanıcı henüz bir şey yazmadı)', () => {
    renderWithProviders(<RegisterScreen />);
    expect(screen.queryByText(/geçersiz biçim/i)).toBeNull();
  });

  it('İpek\'ten gorkem\'e geçince biçim uyarısı kaybolur ve normal akış (kontrol ediliyor → sonuç) işler', async () => {
    renderWithProviders(<RegisterScreen />);
    const input = screen.getByTestId('register-username-input');
    fireEvent.changeText(input, 'İpek');
    expect(screen.getByText(/geçersiz biçim/i)).toBeTruthy();

    fireEvent.changeText(input, 'gorkem');
    expect(screen.queryByText(/geçersiz biçim/i)).toBeNull();
    expect(screen.getByText('Kontrol ediliyor…')).toBeTruthy();

    await jest.advanceTimersByTimeAsync(400);
    await waitFor(() => expect(mockCheckAvailability).toHaveBeenCalledWith('gorkem'));
    await waitFor(() => expect(screen.getByText('Bu kullanıcı adı uygun')).toBeTruthy());
  });

  it('zod hatası varken biçim uyarısı onu ezmez', async () => {
    renderWithProviders(<RegisterScreen />);
    const input = screen.getByTestId('register-username-input');
    fillRestOfForm();

    // 2 karakter — usernameSchema.min(3) reddeder. Submit ile zod hatası tetiklenir.
    fireEvent.changeText(input, 'ab');
    fireEvent.press(screen.getByTestId('register-submit-button'));
    await waitFor(() => expect(screen.getByText('En az 3 karakter olmalıdır')).toBeTruthy());

    // RHF `reValidateMode` (varsayılan `onChange`) artık bu alanı her tuşta
    // yeniden doğruluyor — Türkçe karakterli, yine geçersiz bir girişe geçelim.
    // Zod'un KENDİ mesajı üstün kalmalı; N-1'in genel "geçersiz biçim" metni
    // onu EZMEMELİ.
    fireEvent.changeText(input, 'İpek');
    await waitFor(() =>
      expect(screen.getByText(/küçük harf, rakam, nokta ve alt çizgi/i)).toBeTruthy(),
    );
    expect(screen.queryByText(/^geçersiz biçim:/i)).toBeNull();
  });
});
