/**
 * BottomSheet — tek alttan açılan panel primitive'i: açılma/kapanma, arka plan, Android geri
 * tuşu (onRequestClose), aşağı sürükleyerek kapatma, kapanış-sonrası kuyruk (iOS donma kuralı),
 * güvenli alanlı sabit footer ve klavye kaldırması.
 */
import React, { useState } from 'react';
import { Modal, Text as RNText, StyleSheet } from 'react-native';
import { act, fireEvent, render, screen, within } from '@testing-library/react-native';
import { fireGestureHandler, getByGestureTestId } from 'react-native-gesture-handler/jest-utils';
import { State } from 'react-native-gesture-handler';
import { BottomSheet, useBottomSheet, theme } from '@/ui';
import {
  keyboardResizedWindow,
  sheetBottomPadding,
  sheetLayout,
  sheetMaxHeight,
  shouldCloseSheetOnRelease,
  SHEET_TOP_GAP,
} from '../../lib/sheetMotion';
import { MODAL_DISMISS_TIMEOUT_MS } from '../../lib/modal-timing';

const mockInsets = { top: 47, right: 0, bottom: 34, left: 0 };
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => mockInsets,
  useSafeAreaFrame: () => ({ x: 0, y: 0, width: 390, height: 844 }),
}));

let mockKeyboardHeight = 0;
jest.mock('@/hooks/useKeyboardHeight', () => ({
  ...jest.requireActual('@/hooks/useKeyboardHeight'),
  useKeyboardHeight: () => mockKeyboardHeight,
}));

const { spacing } = theme;

const flush = (ms = 600) =>
  act(() => {
    jest.advanceTimersByTime(ms);
  });

/** Arka plan, `accessibilityViewIsModal` sheet'in kardeşi → ekran okuyucudan (ve RNTL'den) gizli. */
const backdrop = () => screen.getByTestId('sheet-backdrop', { includeHiddenElements: true });

/** Native Modal'ın iOS `onDismiss`'i (testte native yok — elle tetiklenir). */
const dismissNative = () =>
  act(() => {
    screen.UNSAFE_getByType(Modal).props.onDismiss?.();
  });

function Harness({
  onClosed,
  footer,
  initialOpen = true,
  closeOnBackdrop,
  children,
}: {
  onClosed?: () => void;
  footer?: React.ReactNode;
  initialOpen?: boolean;
  closeOnBackdrop?: boolean;
  children?: React.ReactNode;
}) {
  const [open, setOpen] = useState(initialOpen);
  return (
    <>
      <RNText testID="open" onPress={() => setOpen(true)}>
        aç
      </RNText>
      <RNText testID="state">{open ? 'open' : 'closed'}</RNText>
      <BottomSheet
        isOpen={open}
        onClose={() => setOpen(false)}
        onClosed={onClosed}
        title="Başlık"
        footer={footer}
        closeOnBackdrop={closeOnBackdrop}
        testID="sheet"
      >
        {children ?? <RNText testID="content">içerik</RNText>}
      </BottomSheet>
    </>
  );
}

beforeEach(() => {
  jest.useFakeTimers();
  mockKeyboardHeight = 0;
});
afterEach(() => {
  jest.useRealTimers();
});

describe('BottomSheet · açılma / kapanma', () => {
  it('kapalıyken içerik bağlı değil; açılınca başlık, içerik ve modal erişilebilirlik kabı çizilir', () => {
    render(<Harness initialOpen={false} />);
    expect(screen.queryByTestId('sheet')).toBeNull();
    expect(screen.queryByTestId('content')).toBeNull();

    fireEvent.press(screen.getByTestId('open'));
    flush();
    const sheet = screen.getByTestId('sheet');
    expect(sheet.props.accessibilityViewIsModal).toBe(true);
    expect(within(sheet).getByText('Başlık')).toBeTruthy();
    expect(within(sheet).getByTestId('content')).toBeTruthy();
    expect(screen.getByRole('header')).toBeTruthy();
  });

  it('native Modal saydam, status/gezinti çubuğu saydam ve kendi animasyonu yok', () => {
    render(<Harness />);
    const modal = screen.UNSAFE_getByType(Modal);
    expect(modal.props).toMatchObject({
      visible: true,
      transparent: true,
      statusBarTranslucent: true,
      navigationBarTranslucent: true,
      animationType: 'none',
    });
  });

  it('kapat (X) düğmesi etiketli ve kapatır; kapanış animasyonu bitince içerik sökülür', () => {
    render(<Harness />);
    const close = screen.getByTestId('sheet-close');
    expect(close.props.accessibilityLabel).toBe('Kapat');
    fireEvent.press(close);
    expect(screen.getByTestId('state').children.join('')).toBe('closed');
    flush();
    expect(screen.queryByTestId('content')).toBeNull();
    expect(screen.UNSAFE_getByType(Modal).props.visible).toBe(false);
  });

  it('arka plana dokunmak kapatır; closeOnBackdrop=false iken kapatmaz', () => {
    const { unmount } = render(<Harness />);
    fireEvent.press(backdrop());
    expect(screen.getByTestId('state').children.join('')).toBe('closed');
    unmount();

    render(<Harness closeOnBackdrop={false} />);
    fireEvent.press(backdrop());
    expect(screen.getByTestId('state').children.join('')).toBe('open');
  });

  it('Android donanım geri tuşu (Modal onRequestClose) kapatır', () => {
    render(<Harness />);
    act(() => {
      screen.UNSAFE_getByType(Modal).props.onRequestClose();
    });
    expect(screen.getByTestId('state').children.join('')).toBe('closed');
  });
});

describe('BottomSheet · sürükleyerek kapatma', () => {
  const drag = (translationY: number, velocityY = 0) =>
    act(() => {
      fireGestureHandler(getByGestureTestId('sheet-pan'), [
        { state: State.BEGAN, translationY: 0, velocityY: 0 },
        { state: State.ACTIVE, translationY: 0, velocityY: 0 },
        { translationY, velocityY },
        { state: State.END, translationY, velocityY },
      ]);
      // scheduleOnRN(onClose) bir tick sonra çalışır.
      jest.advanceTimersByTime(50);
    });

  it('yeterince aşağı çekilince kapanır', () => {
    render(<Harness />);
    flush();
    drag(2000);
    expect(screen.getByTestId('state').children.join('')).toBe('closed');
  });

  it('az çekilip bırakılınca açık kalır; hızlı fırlatma kapatır', () => {
    render(<Harness />);
    flush();
    drag(10);
    expect(screen.getByTestId('state').children.join('')).toBe('open');
    drag(10, 2000);
    expect(screen.getByTestId('state').children.join('')).toBe('closed');
  });
});

describe('BottomSheet · kapanış sonrası (onClosed / runAfterClose)', () => {
  function QueueButton({ fn }: { fn: () => void }) {
    const { runAfterClose } = useBottomSheet();
    return (
      <RNText testID="queue" onPress={() => runAfterClose(fn)}>
        sıraya al
      </RNText>
    );
  }

  it('iOS: eylem sheet kapanıp native Modal onDismiss verdikten SONRA, bir kez çalışır', () => {
    const order: string[] = [];
    const action = jest.fn(() => order.push('action'));
    const onClosed = jest.fn(() => order.push('closed'));
    render(
      <Harness onClosed={onClosed}>
        <QueueButton fn={action} />
      </Harness>,
    );
    fireEvent.press(screen.getByTestId('queue'));
    // Kapatma istendi ama eylem henüz çalışmadı (sheet hâlâ ekranda).
    expect(screen.getByTestId('state').children.join('')).toBe('closed');
    expect(action).not.toHaveBeenCalled();
    flush();
    expect(action).not.toHaveBeenCalled();
    dismissNative();
    expect(order).toEqual(['closed', 'action']);
    // Yedek zamanlayıcı ikinci kez çalıştırmaz.
    flush(MODAL_DISMISS_TIMEOUT_MS);
    expect(action).toHaveBeenCalledTimes(1);
    expect(onClosed).toHaveBeenCalledTimes(1);
  });

  it('onDismiss hiç gelmezse üst sınır sonunda yine çalışır', () => {
    const action = jest.fn();
    render(
      <Harness>
        <QueueButton fn={action} />
      </Harness>,
    );
    fireEvent.press(screen.getByTestId('queue'));
    flush();
    expect(action).not.toHaveBeenCalled();
    flush(MODAL_DISMISS_TIMEOUT_MS);
    expect(action).toHaveBeenCalledTimes(1);
  });

  it('kapanış bitmeden yeniden açılırsa kuyruk düşer', () => {
    const action = jest.fn();
    render(
      <Harness>
        <QueueButton fn={action} />
      </Harness>,
    );
    fireEvent.press(screen.getByTestId('queue'));
    fireEvent.press(screen.getByTestId('open'));
    flush(MODAL_DISMISS_TIMEOUT_MS + 600);
    expect(action).not.toHaveBeenCalled();
    expect(screen.getByTestId('queue')).toBeTruthy();
  });

  it('sheet dışında runAfterClose hemen çalışır', () => {
    const fn = jest.fn();
    function Outside() {
      const { runAfterClose } = useBottomSheet();
      return <RNText testID="outside" onPress={() => runAfterClose(fn)} />;
    }
    render(<Outside />);
    fireEvent.press(screen.getByTestId('outside'));
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

describe('BottomSheet · footer, güvenli alan ve klavye', () => {
  const footer = <RNText testID="footer-btn">Uygula</RNText>;

  it('footer gövdenin DIŞINDA sabit; alt boşluk = güvenli alan (en az spacing[3]); üstte ayraç', () => {
    render(<Harness footer={footer} />);
    const bar = screen.getByTestId('sheet-footer');
    expect(within(bar).getByTestId('footer-btn')).toBeTruthy();
    expect(within(screen.getByTestId('sheet-body')).queryByTestId('footer-btn')).toBeNull();
    const style = StyleSheet.flatten(bar.props.style);
    expect(style.paddingBottom).toBe(34);
    expect(style.borderTopWidth).toBe(1);
  });

  it('klavye açılınca sheet klavye kadar kalkar, footer alt boşluğu spacing[3] olur (iOS)', () => {
    mockKeyboardHeight = 300;
    render(<Harness footer={footer} />);
    expect(StyleSheet.flatten(screen.getByTestId('sheet').props.style).marginBottom).toBe(300);
    expect(StyleSheet.flatten(screen.getByTestId('sheet-footer').props.style).paddingBottom).toBe(spacing[3]);
  });

  it('footer yoksa gövde alt boşluğu güvenli alan kadar', () => {
    render(<Harness />);
    expect(StyleSheet.flatten(screen.getByTestId('sheet-body').props.contentContainerStyle).paddingBottom).toBe(34);
  });
});

describe('sheetMotion (saf kurallar)', () => {
  it('large: ekranın ~%92si, üstte güvenli alan + pay her zaman kalır (SE / 360x640)', () => {
    // iPhone SE 375x667, top 20
    expect(sheetLayout('large', 667, 20, 0)).toEqual({ height: 614, maxHeight: 667 - 20 - SHEET_TOP_GAP });
    // Android 360x640, top 24
    expect(sheetLayout('large', 640, 24, 0).height).toBe(589);
    // Büyük ekran %92; çentikli 852 ekranda üst sınır devreye girer
    expect(sheetLayout('large', 932, 59, 0).height).toBe(857);
    expect(sheetLayout('large', 852, 59, 0).height).toBe(852 - 59 - SHEET_TOP_GAP);
  });

  it('fit yalnız üst sınır verir; klavye kaldırması sınırı küçültür', () => {
    expect(sheetLayout('fit', 667, 20, 0)).toEqual({ maxHeight: 635 });
    expect(sheetMaxHeight(667, 20, 300)).toBe(335);
    expect(sheetLayout('large', 667, 20, 300).height).toBe(335);
  });

  it('alt boşluk: güvenli alan, en az spacing[3]; klavye açıkken spacing[3]', () => {
    expect(sheetBottomPadding(34, false)).toBe(34);
    expect(sheetBottomPadding(0, false)).toBe(spacing[3]);
    expect(sheetBottomPadding(34, true)).toBe(spacing[3]);
  });

  it('Android pencereyi klavye için küçülttüyse ayrıca kaldırma yok (çift kaydırma); iOS hiç', () => {
    expect(keyboardResizedWindow('android', 300, 340, 640)).toBe(true);
    expect(keyboardResizedWindow('android', 300, 640, 640)).toBe(false);
    expect(keyboardResizedWindow('android', 0, 340, 640)).toBe(false);
    expect(keyboardResizedWindow('ios', 300, 340, 640)).toBe(false);
  });

  it('bırakınca kapanma eşiği: yüksekliğin %25i ya da hızlı fırlatma', () => {
    expect(shouldCloseSheetOnRelease(101, 0, 400)).toBe(true);
    expect(shouldCloseSheetOnRelease(99, 0, 400)).toBe(false);
    expect(shouldCloseSheetOnRelease(10, 1200, 400)).toBe(true);
  });
});
