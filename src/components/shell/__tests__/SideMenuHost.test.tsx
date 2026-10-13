import React from 'react';
import { BackHandler, Text, View } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { fireGestureHandler, getByGestureTestId } from 'react-native-gesture-handler/jest-utils';
import { State } from 'react-native-gesture-handler';
import { SideMenuProvider, useSideMenu } from '../SideMenuContext';
import { SideMenuHost, sideMenuWidth, SIDE_MENU_MAX_WIDTH } from '../SideMenuHost';

jest.mock('expo-status-bar', () => ({ StatusBar: () => null, setStatusBarStyle: jest.fn() }));

let backHandlers: Array<() => boolean> = [];

function Trigger() {
  const { open, isOpen } = useSideMenu();
  return (
    <View>
      <Text testID="state">{isOpen ? 'open' : 'closed'}</Text>
      <Text testID="open" onPress={open}>
        aç
      </Text>
    </View>
  );
}

function setup() {
  return render(
    <SideMenuProvider>
      <Trigger />
      <SideMenuHost>
        <Text testID="menu-content">içerik</Text>
      </SideMenuHost>
    </SideMenuProvider>,
  );
}

const flush = () =>
  act(() => {
    jest.advanceTimersByTime(600);
  });

beforeEach(() => {
  jest.useFakeTimers();
  backHandlers = [];
  jest.spyOn(BackHandler, 'addEventListener').mockImplementation((_e, cb) => {
    backHandlers.push(cb as () => boolean);
    return {
      remove: () => {
        backHandlers = backHandlers.filter((h) => h !== cb);
      },
    } as never;
  });
});
afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('SideMenuHost', () => {
  it('kapalıyken hiçbir şey çizmez (içerik bağlı değil)', () => {
    setup();
    expect(screen.queryByTestId('side-menu')).toBeNull();
    expect(screen.queryByTestId('menu-content')).toBeNull();
  });

  it('open() ile panel + örtü + içerik çizilir; panel modal erişilebilirlik kabında', () => {
    setup();
    fireEvent.press(screen.getByTestId('open'));
    flush();
    expect(screen.getByTestId('side-menu')).toBeTruthy();
    expect(screen.getByTestId('side-menu-overlay')).toBeTruthy();
    expect(screen.getByTestId('menu-content')).toBeTruthy();
    expect(screen.getByTestId('side-menu-root').props.accessibilityViewIsModal).toBe(true);
    expect(screen.getByText('Menü')).toBeTruthy();
  });

  it('örtüye dokunma menüyü kapatır ve animasyon bitince söker', () => {
    setup();
    fireEvent.press(screen.getByTestId('open'));
    flush();
    fireEvent.press(screen.getByTestId('side-menu-overlay'));
    expect(screen.getByTestId('state').children.join('')).toBe('closed');
    flush();
    expect(screen.queryByTestId('side-menu')).toBeNull();
  });

  it('kapat (x) düğmesi menüyü kapatır', () => {
    setup();
    fireEvent.press(screen.getByTestId('open'));
    flush();
    fireEvent.press(screen.getByTestId('side-menu-close'));
    flush();
    expect(screen.queryByTestId('side-menu')).toBeNull();
  });

  it('Android geri tuşu açıkken menüyü kapatır (olayı tüketir); kapalıyken dinleyici yok', () => {
    setup();
    expect(backHandlers).toHaveLength(0);
    fireEvent.press(screen.getByTestId('open'));
    flush();
    expect(backHandlers).toHaveLength(1);
    let handled = false;
    act(() => {
      handled = backHandlers[0]!();
    });
    expect(handled).toBe(true);
    flush();
    expect(screen.queryByTestId('side-menu')).toBeNull();
    expect(backHandlers).toHaveLength(0);
  });

  it('sola yeterince kaydırma menüyü kapatır', () => {
    setup();
    fireEvent.press(screen.getByTestId('open'));
    flush();
    act(() => {
      fireGestureHandler(getByGestureTestId('side-menu-pan'), [
        { state: State.BEGAN, translationX: 0, velocityX: 0 },
        { state: State.ACTIVE, translationX: -20, velocityX: -100 },
        { translationX: -150, velocityX: -200 },
        { state: State.END, translationX: -150, velocityX: -200 },
      ]);
    });
    // scheduleOnRN(close) bir tick sonra çalışır, ardından kapanış animasyonu.
    flush();
    flush();
    expect(screen.getByTestId('state').children.join('')).toBe('closed');
    expect(screen.queryByTestId('side-menu')).toBeNull();
  });

  it('kısa sürükleme menüyü kapatmaz (geri yaylanır)', () => {
    setup();
    fireEvent.press(screen.getByTestId('open'));
    flush();
    act(() => {
      fireGestureHandler(getByGestureTestId('side-menu-pan'), [
        { state: State.BEGAN, translationX: 0, velocityX: 0 },
        { state: State.ACTIVE, translationX: -20, velocityX: -50 },
        { state: State.END, translationX: -40, velocityX: -50 },
      ]);
    });
    flush();
    expect(screen.getByTestId('state').children.join('')).toBe('open');
    expect(screen.getByTestId('side-menu')).toBeTruthy();
  });

  it('genişlik: ekranın %80i, en fazla 340pt', () => {
    expect(sideMenuWidth(390)).toBe(312);
    expect(sideMenuWidth(600)).toBe(SIDE_MENU_MAX_WIDTH);
  });
});
