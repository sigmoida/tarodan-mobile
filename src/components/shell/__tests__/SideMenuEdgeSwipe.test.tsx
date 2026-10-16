/**
 * Yan menü kenardan açma jesti: yalnız sekme köklerinde (`(tabs)` grubu) etkin, sol kenar şeridiyle
 * sınırlı (`hitSlop`), yeterli/hızlı sağa sürükleme menüyü açar, kısa sürükleme geri yaylanır ve
 * paneli söker; yığın ekranlarında (iOS kaydırarak geri) ve üste itilmiş (tabs) kopyasında kapalı.
 */
import React from 'react';
import { BackHandler, StyleSheet, Text, View } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { fireGestureHandler, getByGestureTestId } from 'react-native-gesture-handler/jest-utils';
import { State } from 'react-native-gesture-handler';
import { SideMenuProvider, useSideMenu } from '../SideMenuContext';
import { SideMenuHost } from '../SideMenuHost';
import {
  isBaseTabsFocused,
  openDragProgress,
  shouldOpenOnRelease,
  sideMenuEdgeWidth,
  SIDE_MENU_EDGE_WIDTH_ANDROID,
  SIDE_MENU_EDGE_WIDTH_IOS,
} from '../sideMenuMotion';

jest.mock('expo-status-bar', () => ({ StatusBar: () => null, setStatusBarStyle: jest.fn() }));

let mockSegments: string[] = ['(tabs)', 'profile'];
const BASE_TABS = { index: 0, routes: [{ name: '(tabs)' }] };
let mockRootState: unknown = { index: 0, routes: [{ name: '__root', state: BASE_TABS }] };
jest.mock('expo-router', () => ({
  usePathname: () => '/',
  useSegments: () => mockSegments,
  useNavigationContainerRef: () => ({ getRootState: () => mockRootState }),
}));

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
      <SideMenuHost menu={<Text testID="menu-content">içerik</Text>}>
        <Text testID="app-content">uygulama</Text>
      </SideMenuHost>
    </SideMenuProvider>,
  );
}

const flush = () =>
  act(() => {
    jest.advanceTimersByTime(600);
  });
const state = () => screen.getByTestId('state').children.join('');
const edge = () => getByGestureTestId('side-menu-edge-pan');

beforeEach(() => {
  jest.useFakeTimers();
  mockSegments = ['(tabs)', 'profile'];
  mockRootState = { index: 0, routes: [{ name: '__root', state: BASE_TABS }] };
  jest.spyOn(BackHandler, 'addEventListener').mockImplementation(() => ({ remove: () => undefined }) as never);
});
afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('Yan menü — kenardan açma', () => {
  it('Profil sekme kökünde etkin; şerit sol kenarla sınırlı (hitSlop: left 0 + platform genişliği)', () => {
    setup();
    const g = edge();
    expect(g.config.enabled).toBe(true);
    expect(g.config.hitSlop).toEqual({ left: 0, width: SIDE_MENU_EDGE_WIDTH_IOS });
  });

  it.each([
    ['Ana Sayfa', ['(tabs)']],
    ['Favoriler', ['(tabs)', 'favorites']],
    ['Sepet', ['(tabs)', 'cart']],
    ['İlan Ver', ['(tabs)', 'sell']],
  ])('%s sekme kökünde kapalı (☰ yalnız Profil kökünde; sol düğme kategorilerdir)', (_name, segments) => {
    mockSegments = segments as string[];
    setup();
    expect(edge().config.enabled).toBe(false);
  });

  it('yığın ekranında (iOS kaydırarak geri) kapalı', () => {
    mockSegments = ['product', '[id]'];
    setup();
    expect(edge().config.enabled).toBe(false);
  });

  it('üste itilmiş ikinci (tabs) kopyasında kapalı (kök yığın indeksi > 0)', () => {
    mockSegments = ['(tabs)', 'profile'];
    mockRootState = {
      index: 0,
      routes: [
        {
          name: '__root',
          state: { index: 2, routes: [{ name: '(tabs)' }, { name: 'product/[id]' }, { name: '(tabs)' }] },
        },
      ],
    };
    setup();
    expect(edge().config.enabled).toBe(false);
  });

  it('yeterince sağa sürükleme menüyü açar; sürükleme sırasında panel parmakla gelir', () => {
    setup();
    act(() => {
      fireGestureHandler(edge(), [
        { state: State.BEGAN, translationX: 0, velocityX: 0 },
        { state: State.ACTIVE, translationX: 20, velocityX: 300 },
        { translationX: 156, velocityX: 300 },
      ]);
    });
    flush();
    // Panel sürükleme başlar başlamaz bağlanır (içerik boş görünmesin).
    expect(screen.getByTestId('side-menu')).toBeTruthy();
    act(() => {
      fireGestureHandler(edge(), [{ state: State.END, translationX: 156, velocityX: 300 }]);
    });
    flush();
    flush();
    expect(state()).toBe('open');
    expect(screen.getByTestId('menu-content')).toBeTruthy();
  });

  it('kısa ve yavaş sürükleme açmaz: geri yaylanır, panel sökülür, içerik yerine döner', () => {
    setup();
    act(() => {
      fireGestureHandler(edge(), [
        { state: State.BEGAN, translationX: 0, velocityX: 0 },
        { state: State.ACTIVE, translationX: 20, velocityX: 50 },
        { state: State.END, translationX: 40, velocityX: 50 },
      ]);
    });
    flush();
    flush();
    expect(state()).toBe('closed');
    expect(screen.queryByTestId('side-menu')).toBeNull();
    const style = StyleSheet.flatten(screen.getByTestId('side-menu-track').props.style);
    expect(style.transform).toEqual([{ translateX: 0 }]);
  });

  it('menü açıkken kenar jesti progress\'e dokunmaz (kapatma jesti devrede)', () => {
    setup();
    fireEvent.press(screen.getByTestId('open'));
    flush();
    // jest-utils kayıt anındaki jest nesnesini döndürür (enabled güncellenmez); worklet kapısı sınanır.
    act(() => {
      fireGestureHandler(edge(), [
        { state: State.BEGAN, translationX: 0, velocityX: 0 },
        { state: State.ACTIVE, translationX: 20, velocityX: 50 },
        { state: State.END, translationX: 30, velocityX: 50 },
      ]);
    });
    flush();
    expect(state()).toBe('open');
    expect(screen.getByTestId('side-menu')).toBeTruthy();
  });
});

describe('sideMenuMotion — kenardan açma kuralları', () => {
  it('şerit: iOS 20pt, Android 16pt (16pt kenar boşluğundaki yatay kaydırıcılarla çakışmaz)', () => {
    expect(sideMenuEdgeWidth('ios')).toBe(SIDE_MENU_EDGE_WIDTH_IOS);
    expect(sideMenuEdgeWidth('android')).toBe(SIDE_MENU_EDGE_WIDTH_ANDROID);
    expect(SIDE_MENU_EDGE_WIDTH_IOS).toBe(20);
    expect(SIDE_MENU_EDGE_WIDTH_ANDROID).toBeLessThanOrEqual(16);
  });

  it('isBaseTabsFocused: yalnız (tabs) barındıran yığın indeks 0 ve o rota (tabs) ise', () => {
    expect(isBaseTabsFocused({ index: 0, routes: [{ name: '(tabs)' }] })).toBe(true);
    expect(isBaseTabsFocused({ index: 0, routes: [{ name: '__root', state: { index: 0, routes: [{ name: '(tabs)' }] } }] })).toBe(true);
    expect(isBaseTabsFocused({ index: 1, routes: [{ name: '(tabs)' }, { name: 'messages' }] })).toBe(false);
    expect(isBaseTabsFocused({ index: 1, routes: [{ name: '(tabs)' }, { name: '(tabs)' }] })).toBe(false);
    expect(isBaseTabsFocused({ index: 0, routes: [{ name: '(auth)' }] })).toBe(false);
    expect(isBaseTabsFocused(undefined)).toBe(false);
  });

  it('progress sağa sürüklemeyle doğrusal ve 0..1 kenetli', () => {
    expect(openDragProgress(0, 300)).toBe(0);
    expect(openDragProgress(150, 300)).toBe(0.5);
    expect(openDragProgress(500, 300)).toBe(1);
    expect(openDragProgress(-40, 300)).toBe(0);
    expect(openDragProgress(10, 0)).toBe(0);
  });

  it('açılma: genişliğin %30u ya da hızlı sağa fırlatma; sola fırlatma asla açmaz', () => {
    expect(shouldOpenOnRelease(100, 0, 300)).toBe(true);
    expect(shouldOpenOnRelease(60, 0, 300)).toBe(false);
    expect(shouldOpenOnRelease(30, 900, 300)).toBe(true);
    expect(shouldOpenOnRelease(200, -900, 300)).toBe(false);
  });
});
