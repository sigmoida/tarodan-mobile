/**
 * SignupPrompt artık `BottomSheet size="fit"`: kapalıyken içerik bağlı değil, "Şimdilik geç"
 * kapatır, ana eylem / giriş bağlantısı yönlendirmeyi sheet kapandıktan SONRA yapar (§12).
 */
import React, { useState } from 'react';
import { Modal } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ router: { push: (...a: unknown[]) => mockPush(...a) } }));
jest.mock('@/lib/purchases', () => ({ ...jest.requireActual('@/lib/purchases'), CAN_BUY_DIGITAL: false }));

import { SignupPrompt } from '../SignupPrompt';

function Harness({ type }: { type: 'favorites' | 'message' }) {
  const [open, setOpen] = useState(true);
  return <SignupPrompt visible={open} onDismiss={() => setOpen(false)} type={type} />;
}

const nativeDismiss = () =>
  act(() => {
    screen.UNSAFE_getByType(Modal).props.onDismiss?.();
  });

beforeEach(() => {
  jest.useFakeTimers();
  mockPush.mockClear();
});
afterEach(() => {
  act(() => {
    jest.runOnlyPendingTimers();
  });
  jest.useRealTimers();
});

describe('SignupPrompt (BottomSheet)', () => {
  it('kapalıyken hiçbir şey çizmez', () => {
    render(<SignupPrompt visible={false} onDismiss={jest.fn()} type="favorites" />);
    expect(screen.queryByTestId('signup-prompt')).toBeNull();
  });

  it('iki düğme footer\'da: ana eylem + "Şimdilik Geç"', () => {
    render(<Harness type="favorites" />);
    expect(screen.getByTestId('signup-prompt-footer')).toBeOnTheScreen();
    expect(screen.getByTestId('signup-prompt-primary')).toBeOnTheScreen();
    expect(screen.getByTestId('signup-prompt-skip')).toBeOnTheScreen();
  });

  it('ana eylem: önce kapanır, kayıt ekranı kapanıştan SONRA açılır', () => {
    render(<Harness type="favorites" />);
    fireEvent.press(screen.getByTestId('signup-prompt-primary'));
    expect(mockPush).not.toHaveBeenCalled();
    nativeDismiss();
    expect(mockPush).toHaveBeenCalledWith('/(auth)/register');
  });

  it('"Şimdilik Geç" yalnız kapatır, yönlendirme yok', () => {
    render(<Harness type="favorites" />);
    fireEvent.press(screen.getByTestId('signup-prompt-skip'));
    nativeDismiss();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('"Zaten üye misiniz" giriş ekranına kapanıştan sonra gider; mesaj varyantında yok', () => {
    const { unmount } = render(<Harness type="favorites" />);
    fireEvent.press(screen.getByTestId('signup-prompt-login'));
    nativeDismiss();
    expect(mockPush).toHaveBeenCalledWith('/(auth)/login');
    unmount();

    render(<Harness type="message" />);
    expect(screen.queryByTestId('signup-prompt-login')).toBeNull();
  });
});
