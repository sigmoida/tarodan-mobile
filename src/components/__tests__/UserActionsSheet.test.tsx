/**
 * UserActionsSheet: eylem menüsü `ActionSheet` (appAlert düğmesi değil). Şikayet penceresi ve
 * engel onayı sheet TAMAMEN kapandıktan sonra açılır (zamanlayıcı hack'i yok, §12).
 */
import React from 'react';
import { Modal } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ router: { push: (...a: unknown[]) => mockPush(...a) } }));

const mockRequestBlock = jest.fn();
const mockRequestUnblock = jest.fn();
let mockIsBlocked = false;
jest.mock('@/hooks/useBlockUser', () => ({
  useBlockStatus: () => ({ isBlocked: mockIsBlocked }),
  useBlockUser: () => ({
    requestBlock: mockRequestBlock,
    requestUnblock: mockRequestUnblock,
    pending: false,
  }),
}));

let mockAuthed = true;
jest.mock('@/stores/authStore', () => ({
  useAuthStore: () => ({ isAuthenticated: mockAuthed }),
}));

// Şikayet penceresi: yalnız `visible` bayrağını görünür kılan kuklalık.
jest.mock('../ReportModal', () => {
  const { Text } = jest.requireActual('react-native');
  return { __esModule: true, default: ({ visible }: { visible: boolean }) => (visible ? <Text testID="report-open">açık</Text> : null) };
});

import UserActionsButton from '../UserActionsSheet';

const nativeDismiss = () =>
  act(() => {
    screen.UNSAFE_getByType(Modal).props.onDismiss?.();
  });

const openMenu = () => fireEvent.press(screen.getByTestId('more'));

function setup(props: Partial<React.ComponentProps<typeof UserActionsButton>> = {}) {
  return render(<UserActionsButton testID="more" userId="u2" userName="Ayşe" {...props} />);
}

beforeEach(() => {
  jest.useFakeTimers();
  mockPush.mockClear();
  mockRequestBlock.mockClear();
  mockRequestUnblock.mockClear();
  mockIsBlocked = false;
  mockAuthed = true;
});
afterEach(() => {
  act(() => {
    jest.runOnlyPendingTimers();
  });
  jest.useRealTimers();
});

describe('UserActionsSheet', () => {
  it('kapalıyken menü çizilmez; ikona basınca ActionSheet açılır (başlık = kullanıcı adı)', () => {
    setup();
    expect(screen.queryByTestId('user-actions-sheet')).toBeNull();
    openMenu();
    expect(screen.getByTestId('user-actions-sheet')).toBeOnTheScreen();
    expect(screen.getByText('Ayşe')).toBeOnTheScreen();
    // [Şikayet, Engelle] + ayrı Vazgeç
    expect(screen.getByTestId('user-actions-sheet-action-0')).toBeOnTheScreen();
    expect(screen.getByTestId('user-actions-sheet-action-1')).toBeOnTheScreen();
    expect(screen.queryByTestId('user-actions-sheet-action-2')).toBeNull();
    expect(screen.getByTestId('user-actions-sheet-cancel')).toBeOnTheScreen();
  });

  it('şikayet: önce menü kapanır, şikayet penceresi kapanıştan SONRA açılır', () => {
    setup();
    openMenu();
    fireEvent.press(screen.getByTestId('user-actions-sheet-action-0'));
    expect(screen.queryByTestId('report-open')).toBeNull();
    nativeDismiss();
    expect(screen.getByTestId('report-open')).toBeOnTheScreen();
  });

  it('misafir şikayet: giriş ekranı, pencere açılmaz', () => {
    mockAuthed = false;
    setup();
    openMenu();
    fireEvent.press(screen.getByTestId('user-actions-sheet-action-0'));
    nativeDismiss();
    expect(mockPush).toHaveBeenCalledWith('/(auth)/login');
    expect(screen.queryByTestId('report-open')).toBeNull();
  });

  it('engelle: onay (requestBlock) kapanıştan sonra çalışır', () => {
    setup();
    openMenu();
    fireEvent.press(screen.getByTestId('user-actions-sheet-action-1'));
    expect(mockRequestBlock).not.toHaveBeenCalled();
    nativeDismiss();
    expect(mockRequestBlock).toHaveBeenCalledWith('u2', 'Ayşe');
  });

  it('engelli kullanıcıda "Engeli kaldır" satırı', () => {
    mockIsBlocked = true;
    setup();
    openMenu();
    fireEvent.press(screen.getByTestId('user-actions-sheet-action-1'));
    nativeDismiss();
    expect(mockRequestUnblock).toHaveBeenCalledWith('u2', 'Ayşe');
    expect(mockRequestBlock).not.toHaveBeenCalled();
  });

  it('ek satırlar şikayetin ÜSTÜNDE; showReportUser=false iken şikayet satırı yok (ilan detayı)', () => {
    const onExtra = jest.fn();
    setup({ showReportUser: false, extraActions: [{ label: 'İlanı Şikayet Et', onPress: onExtra }] });
    openMenu();
    expect(screen.getByText('İlanı Şikayet Et')).toBeOnTheScreen();
    // ek satır + engelle = 2 satır
    expect(screen.queryByTestId('user-actions-sheet-action-2')).toBeNull();
    fireEvent.press(screen.getByText('İlanı Şikayet Et'));
    nativeDismiss();
    expect(onExtra).toHaveBeenCalledTimes(1);
  });
});
