import React from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { PageShell, RawText, theme, toast, ToastHost } from '@/ui';
import { resetToastForTests, TOAST_GAP } from '../Toast';

let mockKeyboardHeight = 0;
jest.mock('@/hooks/useKeyboardHeight', () => ({
  ...jest.requireActual('@/hooks/useKeyboardHeight'),
  useKeyboardHeight: () => mockKeyboardHeight,
}));

const SAFE_BOTTOM = 34;
jest.mock('react-native-safe-area-context', () => {
  const { createContext } = jest.requireActual<typeof React>('react');
  const inset = { top: 0, right: 0, bottom: 34, left: 0 };
  const Pass = ({ children }: { children?: React.ReactNode }) => children;
  return {
    SafeAreaProvider: Pass,
    SafeAreaView: Pass,
    SafeAreaInsetsContext: createContext(inset),
    useSafeAreaInsets: () => inset,
    useSafeAreaFrame: () => ({ x: 0, y: 0, width: 390, height: 844 }),
  };
});

const { spacing } = theme;
const footerPad = () =>
  StyleSheet.flatten(screen.getByTestId('page-shell-footer').props.style).paddingBottom;
const layout = (height: number) => ({ nativeEvent: { layout: { x: 0, y: 0, width: 390, height } } });

const shell = (props: Partial<React.ComponentProps<typeof PageShell>> = {}) => (
  <PageShell title="Form" footer={<RawText>Kaydet</RawText>} {...props}>
    <RawText>içerik</RawText>
  </PageShell>
);

beforeEach(() => {
  mockKeyboardHeight = 0;
});
afterEach(() => {
  jest.restoreAllMocks();
  resetToastForTests();
});

describe('PageShell klavye — iOS', () => {
  beforeEach(() => {
    jest.replaceProperty(Platform, 'OS', 'ios');
  });

  it('KeyboardAvoidingView padding ile kaçar (davranış değişmedi)', () => {
    render(shell());
    expect(screen.UNSAFE_getByType(KeyboardAvoidingView).props.behavior).toBe('padding');
    expect(screen.queryByTestId('page-shell-keyboard')).toBeNull();
  });

  it('alt çubuk: klavye kapalı → güvenli alan dahil; açık → güvenli alan YOK (klavye üstünde boşluk olmaz)', () => {
    const { rerender } = render(shell());
    expect(footerPad()).toBe(spacing[3] + SAFE_BOTTOM);
    mockKeyboardHeight = 300;
    rerender(shell());
    expect(footerPad()).toBe(spacing[3]);
  });

  it('keyboardAware={false}: klavye açıkken de güvenli alan korunur (çubuk klavyeyle yükselmez)', () => {
    mockKeyboardHeight = 300;
    render(shell({ keyboardAware: false }));
    expect(footerPad()).toBe(spacing[3] + SAFE_BOTTOM);
    expect(screen.UNSAFE_queryByType(KeyboardAvoidingView)).toBeNull();
  });
});

describe('PageShell klavye — Android (kenardan kenara)', () => {
  beforeEach(() => {
    jest.replaceProperty(Platform, 'OS', 'android');
  });

  const kbPad = () =>
    StyleSheet.flatten(screen.getByTestId('page-shell-keyboard').props.style).paddingBottom;

  it('KAV yok; pencere küçülmediyse gövde + çubuk klavye örtüşmesi kadar kaçar (klavye + gezinti çubuğu)', () => {
    const { rerender } = render(shell());
    expect(screen.UNSAFE_queryByType(KeyboardAvoidingView)).toBeNull();
    fireEvent(screen.getByTestId('page-shell-keyboard'), 'layout', layout(800));
    expect(kbPad()).toBe(0);
    mockKeyboardHeight = 300;
    rerender(shell());
    // Android klavye yüksekliği gezinti çubuğu HARİÇ → örtüşme = 300 + 34.
    expect(kbPad()).toBe(300 + SAFE_BOTTOM);
    expect(footerPad()).toBe(spacing[3]);
  });

  it('işletim sistemi pencereyi zaten küçülttüyse (adjustResize) ek kaçış yok — çift kaçış olmaz', () => {
    const { rerender } = render(shell());
    fireEvent(screen.getByTestId('page-shell-keyboard'), 'layout', layout(800));
    mockKeyboardHeight = 300;
    rerender(shell());
    fireEvent(screen.getByTestId('page-shell-keyboard'), 'layout', layout(800 - 300 - SAFE_BOTTOM));
    expect(kbPad()).toBe(0);
    // Çubuk yine de güvenli alanı düşer (klavyenin hemen üstünde).
    expect(footerPad()).toBe(spacing[3]);
  });

  it('toast alt çubukla birlikte klavyenin üstüne çıkar (followsKeyboard)', () => {
    mockKeyboardHeight = 300;
    render(
      <>
        <ToastHost />
        {shell()}
      </>,
    );
    fireEvent(screen.getByTestId('page-shell-footer'), 'layout', layout(64));
    act(() => {
      toast('Kaydedildi', { duration: 0 });
    });
    const bottom = StyleSheet.flatten(screen.getByTestId('toast').props.style).bottom;
    expect(bottom).toBe(300 + SAFE_BOTTOM + 64 + TOAST_GAP);
  });
});
