/**
 * İki adımlı doğrulama EKRANI: 2FA kapalıyken açılışta doğrudan kurulum (enable bir kez; QR + anahtar
 * + kod; yanlış kod alanın altında) → yedek kodlar aynı ekranda; açıkken
 * kapat / yedek kod yenile DİYALOGLARI kendi formunu taşır, geçerli kodda ÖNCE kapanır SONRA
 * mutation (src/ui/CLAUDE.md › iOS modal rule); yenilenen kodlar diyalogda değil ekranın kartında gösterilir.
 */
import React from 'react';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { appAlert, toast } from '@/ui';
import { renderWithProviders } from '@/test-utils';
import { backMock, canGoBackMock, navigationDispatchMock, resetRouterMocks } from '@/test-utils/router-mock';
import i18n from '@/i18n/config';

jest.mock('@/ui', () => {
  const actual = jest.requireActual('@/ui');
  const { confirmWith } = jest.requireActual('@/ui/components/AlertDialog');
  const appAlert = jest.fn();
  return {
    ...actual,
    appAlert,
    confirm: (options: unknown) => confirmWith(appAlert, options),
    toast: Object.assign(jest.fn(), { success: jest.fn(), error: jest.fn(), dismiss: jest.fn() }),
  };
});
jest.mock('expo-router', () => jest.requireActual('@/test-utils/router-mock').routerMock);

// Native-stack çıkış koruması: `usePreventRemove`'un son durumunu ve geri çağırımını yakala.
const mockPrevent: { active: boolean; cb?: (e: { data: { action: unknown } }) => void } = { active: false };
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  usePreventRemove: (active: boolean, cb: (e: { data: { action: unknown } }) => void) => {
    mockPrevent.active = active;
    mockPrevent.cb = cb;
  },
}));
jest.mock('@/stores/authStore', () => ({
  useAuthStore: (sel?: (state: Record<string, unknown>) => unknown) => {
    const state: Record<string, unknown> = { isAuthenticated: true, user: { id: 'u1' } };
    return sel ? sel(state) : state;
  },
}));

let mockEnabled = false;
const mockApi = {
  getTwoFactorStatus: jest.fn(() => Promise.resolve({ data: { isEnabled: mockEnabled } })),
  setupTwoFactor: jest.fn(() =>
    Promise.resolve({
      data: { secret: 'JBSWY3DPEHPK3PXP', qrCodeImage: 'data:image/png;base64,AAA', backupCodes: ['A1', 'B2'] },
    }),
  ),
  verifyTwoFactor: jest.fn((_code: string): Promise<{ data: unknown }> => Promise.resolve({ data: {} })),
  disableTwoFactor: jest.fn((_code: string) => Promise.resolve({ data: {} })),
  regenerateBackupCodes: jest.fn((_code: string) => Promise.resolve({ data: { backupCodes: ['N1', 'N2'] } })),
};
jest.mock('@/lib/api', () => ({
  authApi: {
    getTwoFactorStatus: () => mockApi.getTwoFactorStatus(),
    setupTwoFactor: () => mockApi.setupTwoFactor(),
    verifyTwoFactor: (c: string) => mockApi.verifyTwoFactor(c),
    disableTwoFactor: (c: string) => mockApi.disableTwoFactor(c),
    regenerateBackupCodes: (c: string) => mockApi.regenerateBackupCodes(c),
  },
}));

import TwoFactorScreen from '../two-factor';

const successMock = toast.success as jest.Mock;
const errorMock = toast.error as jest.Mock;

beforeEach(() => {
  mockEnabled = false;
  Object.values(mockApi).forEach((m) => m.mockClear());
  successMock.mockClear();
  errorMock.mockClear();
  resetRouterMocks();
  navigationDispatchMock.mockClear();
  mockPrevent.active = false;
  mockPrevent.cb = undefined;
  canGoBackMock.mockReturnValue(true);
});

describe('kurulum (2FA kapalı → doğrudan QR ekranı)', () => {
  it('açılışta enable BİR kez; QR + anahtar + kod; tanıtım/gereksinim/neden kartları ve durum kartı yok', async () => {
    renderWithProviders(<TwoFactorScreen />);

    expect(await screen.findByTestId('two-factor-secret')).toBeTruthy();
    expect(screen.getByText('JBSWY3DPEHPK3PXP')).toBeTruthy();
    expect(screen.getByTestId('two-factor-qr')).toBeTruthy();
    expect(screen.getByTestId('two-factor-code-input')).toBeTruthy();
    expect(screen.queryByTestId('two-factor-start')).toBeNull();
    expect(screen.queryByTestId('two-factor-status-badge')).toBeNull();
    expect(screen.queryByText(i18n.t('profile.twoFactor.requirementsTitle'))).toBeNull();
    expect(screen.queryByText(i18n.t('profile.twoFactor.whyTitle'))).toBeNull();
    expect(screen.queryByText(i18n.t('profile.twoFactor.intro'))).toBeNull();
    expect(mockApi.setupTwoFactor).toHaveBeenCalledTimes(1);
  });

  it('kod → 2FA açılır, SON enable yanıtının yedek kodları ekranda; "kaydettim" → geri; enable tekrar çağrılmaz', async () => {
    renderWithProviders(<TwoFactorScreen />);
    await screen.findByTestId('two-factor-secret');

    fireEvent.changeText(screen.getByTestId('two-factor-code-input'), '12-34 56');
    expect(screen.getByTestId('two-factor-code-input').props.value).toBe('123456');
    fireEvent.press(screen.getByTestId('two-factor-verify'));

    // Doğrulama yanıtı ({ success: true }) yedek kod taşımaz → kurulum yanıtındakiler.
    expect(await screen.findByTestId('backup-codes-card')).toBeTruthy();
    expect(mockApi.verifyTwoFactor).toHaveBeenCalledWith('123456');
    expect(screen.getByText('A1')).toBeTruthy();
    expect(successMock).toHaveBeenCalledWith(i18n.t('security.twoFactorEnabled'));
    expect(backMock).not.toHaveBeenCalled();

    fireEvent.press(screen.getByTestId('backup-codes-ack'));
    expect(backMock).toHaveBeenCalled();
    // Durum yeniden çekildi ama kurulum kendiliğinden yeniden BAŞLAMADI (anahtar yeniden üretilmez).
    await waitFor(() => expect(mockApi.getTwoFactorStatus.mock.calls.length).toBeGreaterThanOrEqual(2));
    expect(mockApi.setupTwoFactor).toHaveBeenCalledTimes(1);
  });

  it('kod alanı TOTP içindir: SMS/oneTimeCode önerisi yok, rakam klavyesi, 6 hane', async () => {
    renderWithProviders(<TwoFactorScreen />);
    const input = await screen.findByTestId('two-factor-code-input');
    expect(input.props.textContentType).not.toBe('oneTimeCode');
    expect(input.props.autoComplete).not.toBe('one-time-code');
    expect(input.props.keyboardType).toBe('number-pad');
    expect(input.props.maxLength).toBe(6);
  });

  it('eksik kod: düğme ölü değil — basınca alanın altında uyarı, istek yok', async () => {
    renderWithProviders(<TwoFactorScreen />);
    fireEvent.changeText(await screen.findByTestId('two-factor-code-input'), '123');
    fireEvent.press(screen.getByTestId('two-factor-verify'));
    expect(await screen.findByText(i18n.t('profile.twoFactor.enterSixDigits'))).toBeTruthy();
    expect(mockApi.verifyTwoFactor).not.toHaveBeenCalled();
  });

  it.each([
    ['eski 401', { response: { status: 401, data: { message: 'Geçersiz doğrulama kodu', i18nKey: 'server.security.invalidCode' } } }],
    ['yeni 400', { response: { status: 400, data: { message: 'Geçersiz doğrulama kodu', errorCode: 'INVALID_2FA_CODE' } } }],
  ])('yanlış kod (%s): hata kod alanının altında, toast yok, kurulum ekranda kalır', async (_label, err) => {
    mockApi.verifyTwoFactor.mockRejectedValueOnce(err);
    renderWithProviders(<TwoFactorScreen />);
    fireEvent.changeText(await screen.findByTestId('two-factor-code-input'), '000000');
    fireEvent.press(screen.getByTestId('two-factor-verify'));

    expect(await screen.findByText('Geçersiz doğrulama kodu')).toBeTruthy();
    expect(errorMock).not.toHaveBeenCalled();
    expect(screen.getByTestId('two-factor-secret')).toBeTruthy();
    expect(mockApi.setupTwoFactor).toHaveBeenCalledTimes(1);

    // Yeni kodla tekrar: hata kalkar, doğrulama geçer.
    fireEvent.changeText(screen.getByTestId('two-factor-code-input'), '123456');
    fireEvent.press(screen.getByTestId('two-factor-verify'));
    expect(await screen.findByTestId('backup-codes-card')).toBeTruthy();
  });

  it('kurulum başlatılamazsa ErrorState (sunucu mesajı); tekrar dene → QR; toast yok', async () => {
    mockApi.setupTwoFactor.mockRejectedValueOnce({ response: { data: { message: 'Şifre gerekli' } } });
    renderWithProviders(<TwoFactorScreen />);

    expect(await screen.findByTestId('error-state')).toBeTruthy();
    expect(screen.getByText('Şifre gerekli')).toBeTruthy();
    expect(errorMock).not.toHaveBeenCalled();

    fireEvent.press(screen.getByText(i18n.t('mobile.errorRetry')));
    expect(await screen.findByTestId('two-factor-secret')).toBeTruthy();
    expect(mockApi.setupTwoFactor).toHaveBeenCalledTimes(2);
  });

  it('çift dokunma kilidi: istek uçuştayken ikinci "tekrar dene" yeni enable başlatmaz', async () => {
    mockApi.setupTwoFactor.mockRejectedValueOnce({ response: { data: { message: 'Geçici hata' } } });
    renderWithProviders(<TwoFactorScreen />);
    const retry = await screen.findByText(i18n.t('mobile.errorRetry'));

    type SetupReply = Awaited<ReturnType<typeof mockApi.setupTwoFactor>>;
    let resolveSetup: (v: SetupReply) => void = () => undefined;
    mockApi.setupTwoFactor.mockImplementationOnce(
      () => new Promise((resolve) => (resolveSetup = resolve)),
    );
    fireEvent.press(retry);
    fireEvent.press(retry);
    await waitFor(() => expect(mockApi.setupTwoFactor).toHaveBeenCalledTimes(2));

    await act(async () => {
      resolveSetup({ data: { secret: 'SECOND', qrCodeImage: 'data:image/png;base64,BBB', backupCodes: ['Z9'] } });
    });
    expect(await screen.findByText('SECOND')).toBeTruthy();
    expect(mockApi.setupTwoFactor).toHaveBeenCalledTimes(2);
  });
});

describe('yedek kodlar görünümünden çıkış', () => {
  async function reachCodes() {
    renderWithProviders(<TwoFactorScreen />);
    fireEvent.changeText(await screen.findByTestId('two-factor-code-input'), '123456');
    fireEvent.press(screen.getByTestId('two-factor-verify'));
    await screen.findByTestId('backup-codes-card');
  }
  const leaveAction = { type: 'GO_BACK' };

  it('kodlar ekrandayken çıkış korunur; onaylanınca çıkılır, iptalde kalınır', async () => {
    await reachCodes();
    expect(mockPrevent.active).toBe(true);

    const alertMock = appAlert as jest.Mock;
    // İptal → kalınır
    act(() => mockPrevent.cb!({ data: { action: leaveAction } }));
    await waitFor(() => expect(alertMock).toHaveBeenCalledTimes(1));
    expect(alertMock.mock.calls[0]![0]).toBe(i18n.t('security.leaveBackupCodesTitle'));
    await act(async () => {
      alertMock.mock.calls[0]![2].find((b: { style?: string }) => b.style === 'cancel').onPress();
    });
    expect(navigationDispatchMock).not.toHaveBeenCalled();

    // Onay ("Tamam, kaydettim") → bekletilen çıkış sürer
    act(() => mockPrevent.cb!({ data: { action: leaveAction } }));
    await waitFor(() => expect(alertMock).toHaveBeenCalledTimes(2));
    await act(async () => {
      alertMock.mock.calls[1]![2].find((b: { style?: string }) => b.style !== 'cancel').onPress();
    });
    expect(navigationDispatchMock).toHaveBeenCalledWith(leaveAction);
  });

  it('"Tamam, kaydettim" bilinçli çıkış: onay sorulmaz', async () => {
    await reachCodes();
    fireEvent.press(screen.getByTestId('backup-codes-ack'));
    // Koruma kalkar (kodlar görünümü kapandı), çıkış onaysız gerçekleşir.
    await waitFor(() => expect(backMock).toHaveBeenCalled());
    expect(mockPrevent.active).toBe(false);
    expect(appAlert).not.toHaveBeenCalled();
  });

  it('kurulum görünümünde koruma kapalı', async () => {
    renderWithProviders(<TwoFactorScreen />);
    await screen.findByTestId('two-factor-secret');
    expect(mockPrevent.active).toBe(false);
  });
});

describe('2FA açıkken', () => {
  beforeEach(() => {
    mockEnabled = true;
  });

  it('kapat diyaloğu: eksik kod satır içi hata; geçerli kod → diyalog kapanır, sonra istek + toast', async () => {
    renderWithProviders(<TwoFactorScreen />);
    fireEvent.press(await screen.findByTestId('two-factor-disable'));

    fireEvent.changeText(await screen.findByTestId('two-factor-disable-modal-input'), '12');
    fireEvent.press(screen.getByTestId('two-factor-disable-modal-confirm'));
    expect(await screen.findByText(i18n.t('profile.twoFactor.enterSixDigits'))).toBeTruthy();
    expect(mockApi.disableTwoFactor).not.toHaveBeenCalled();

    fireEvent.changeText(screen.getByTestId('two-factor-disable-modal-input'), '654321');
    fireEvent.press(screen.getByTestId('two-factor-disable-modal-confirm'));

    await waitFor(() => expect(mockApi.disableTwoFactor).toHaveBeenCalledWith('654321'));
    expect(screen.queryByTestId('two-factor-disable-modal-input')).toBeNull();
    await waitFor(() => expect(successMock).toHaveBeenCalledWith(i18n.t('security.twoFactorDisabled')));
    // Kapatıldı → güvenlik ekranına dönülür; kurulum kendiliğinden BAŞLAMAZ.
    await waitFor(() => expect(backMock).toHaveBeenCalled());
    expect(mockApi.setupTwoFactor).not.toHaveBeenCalled();
  });

  it('açıkken kurulum kendiliğinden başlamaz; kod diyaloğunda SMS önerisi yok', async () => {
    renderWithProviders(<TwoFactorScreen />);
    fireEvent.press(await screen.findByTestId('two-factor-disable'));
    const input = await screen.findByTestId('two-factor-disable-modal-input');
    expect(input.props.textContentType).not.toBe('oneTimeCode');
    expect(input.props.autoComplete).not.toBe('one-time-code');
    expect(mockApi.setupTwoFactor).not.toHaveBeenCalled();
  });

  it('yedek kod yenile: diyalog kapanır, yeni kodlar ekran kartında; "kaydettim" ekranda bırakır', async () => {
    renderWithProviders(<TwoFactorScreen />);
    fireEvent.press(await screen.findByTestId('two-factor-regenerate'));
    fireEvent.changeText(await screen.findByTestId('regenerate-codes-modal-input'), '111222');
    fireEvent.press(screen.getByTestId('regenerate-codes-modal-confirm'));

    expect(await screen.findByTestId('backup-codes-card')).toBeTruthy();
    expect(mockApi.regenerateBackupCodes).toHaveBeenCalledWith('111222');
    expect(screen.getByText('N1')).toBeTruthy();
    expect(screen.queryByTestId('regenerate-codes-modal-input')).toBeNull();

    fireEvent.press(screen.getByTestId('backup-codes-ack'));
    expect(backMock).not.toHaveBeenCalled();
    expect(await screen.findByTestId('two-factor-regenerate')).toBeTruthy();
  });

  it('yenileme hatası: toast.error (diyalog zaten kapalı)', async () => {
    mockApi.regenerateBackupCodes.mockRejectedValueOnce({ response: { data: { message: 'Kod hatalı' } } });
    renderWithProviders(<TwoFactorScreen />);
    fireEvent.press(await screen.findByTestId('two-factor-regenerate'));
    fireEvent.changeText(await screen.findByTestId('regenerate-codes-modal-input'), '111222');
    fireEvent.press(screen.getByTestId('regenerate-codes-modal-confirm'));

    await waitFor(() => expect(errorMock).toHaveBeenCalledWith('Kod hatalı'));
    expect(screen.queryByTestId('backup-codes-card')).toBeNull();
    expect(screen.queryByTestId('regenerate-codes-modal-input')).toBeNull();
  });
});
