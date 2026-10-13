/**
 * İki adımlı doğrulama EKRANI: kurulum (QR + anahtar + kod) → yedek kodlar aynı ekranda; açıkken
 * kapat / yedek kod yenile DİYALOGLARI kendi formunu taşır, geçerli kodda ÖNCE kapanır SONRA
 * mutation (§12); yenilenen kodlar diyalogda değil ekranın kartında gösterilir.
 */
import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { toast } from '@/ui';
import { renderWithProviders } from '@/test-utils';
import { backMock, canGoBackMock, resetRouterMocks } from '@/test-utils/router-mock';
import i18n from '@/i18n/config';

jest.mock('@/ui', () => ({
  ...jest.requireActual('@/ui'),
  appAlert: jest.fn(),
  toast: Object.assign(jest.fn(), { success: jest.fn(), error: jest.fn(), dismiss: jest.fn() }),
}));
jest.mock('expo-router', () => jest.requireActual('@/test-utils/router-mock').routerMock);
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
  canGoBackMock.mockReturnValue(true);
});

describe('kurulum', () => {
  it('başlat → QR + gizli anahtar; kod → 2FA açılır, yedek kodlar ekranda; "kaydettim" → geri', async () => {
    renderWithProviders(<TwoFactorScreen />);
    fireEvent.press(await screen.findByTestId('two-factor-start'));

    expect(await screen.findByTestId('two-factor-secret')).toBeTruthy();
    expect(screen.getByText('JBSWY3DPEHPK3PXP')).toBeTruthy();
    expect(screen.getByTestId('two-factor-qr')).toBeTruthy();

    fireEvent.changeText(screen.getByTestId('two-factor-code-input'), '12-34 56');
    expect(screen.getByTestId('two-factor-code-input').props.value).toBe('123456');
    fireEvent.press(screen.getByTestId('two-factor-verify'));

    // Doğrulama yanıtında kod yok → kurulum yanıtındakiler gösterilir (web ile aynı).
    expect(await screen.findByTestId('backup-codes-card')).toBeTruthy();
    expect(mockApi.verifyTwoFactor).toHaveBeenCalledWith('123456');
    expect(screen.getByText('A1')).toBeTruthy();
    expect(successMock).toHaveBeenCalledWith(i18n.t('security.twoFactorEnabled'));
    expect(backMock).not.toHaveBeenCalled();

    fireEvent.press(screen.getByTestId('backup-codes-ack'));
    expect(backMock).toHaveBeenCalled();
  });

  it('kurulum başlatılamazsa toast.error, tanıtımda kalınır', async () => {
    mockApi.setupTwoFactor.mockRejectedValueOnce({ response: { data: { message: 'Zaten açık' } } });
    renderWithProviders(<TwoFactorScreen />);
    fireEvent.press(await screen.findByTestId('two-factor-start'));
    await waitFor(() => expect(errorMock).toHaveBeenCalledWith('Zaten açık'));
    expect(screen.getByTestId('two-factor-start')).toBeTruthy();
  });

  it('yanlış kod: toast.error, kurulum ekranda kalır', async () => {
    mockApi.verifyTwoFactor.mockRejectedValueOnce({ response: { data: { message: 'Geçersiz kod' } } });
    renderWithProviders(<TwoFactorScreen />);
    fireEvent.press(await screen.findByTestId('two-factor-start'));
    fireEvent.changeText(await screen.findByTestId('two-factor-code-input'), '000000');
    fireEvent.press(screen.getByTestId('two-factor-verify'));
    await waitFor(() => expect(errorMock).toHaveBeenCalledWith('Geçersiz kod'));
    expect(screen.getByTestId('two-factor-secret')).toBeTruthy();
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
