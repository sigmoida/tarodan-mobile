import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react-native';
import { GLASS_ICON_BUTTON_SIZE, ScreenHeader, theme, usePageScrollValue } from '@/ui';
import { pushMock, resetRouterMocks } from '@/test-utils/router-mock';
import { AppShell, APP_SHELL_BAR_HEIGHT } from '../AppShell';
import { SideMenuProvider, useSideMenu } from '../SideMenuContext';
import { TabBarCollapseProvider, useTabBarCollapsed, useTabBarScrollHandler } from '../TabBarCollapse';

jest.mock('expo-router', () => require('@/test-utils/router-mock').routerMock);
jest.mock('expo-status-bar', () => ({
  StatusBar: ({ style }: { style?: string }) => {
    const { Text: T } = require('react-native');
    return <T testID="status-bar">{style}</T>;
  },
  setStatusBarStyle: jest.fn(),
}));
jest.mock('../useShellCounts', () => ({
  useShellCounts: () => ({ cartCount: 2, notificationCount: 0, messageCount: 0, favoriteCount: 0 }),
}));

let mockTop = 0;
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: mockTop, right: 0, bottom: 0, left: 0 }),
}));

beforeEach(() => {
  resetRouterMocks();
  mockTop = 0;
});

describe('AppShell — tek satır beyaz bar', () => {
  it('beyaz bar (ScreenHeader ile aynı zemin + alt çizgi), logo yok; hamburger + arama alanı + sepet (sayaçlı), bildirim yok ve içerik', () => {
    render(
      <AppShell>
        <Text>içerik</Text>
      </AppShell>,
    );
    expect(StyleSheet.flatten(screen.getByTestId('app-shell-bar-bg').props.style)).toMatchObject({
      backgroundColor: theme.colors.surface.elevated,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border.DEFAULT,
    });
    expect(screen.queryByLabelText('Tarodan')).toBeNull();
    expect(screen.getByTestId('home-menu-button')).toBeTruthy();
    expect(screen.getByTestId('home-search-input')).toBeTruthy();
    // Bildirim alt menüye taşındı: üst barda yok.
    expect(screen.queryByTestId('app-shell-notifications')).toBeNull();
    expect(screen.getByText('2')).toBeTruthy();
    expect(screen.getByText('içerik')).toBeTruthy();
    fireEvent.press(screen.getByTestId('app-shell-cart'));
    expect(pushMock).toHaveBeenCalledWith('/cart');
  });

  it('hamburger solda (ilk öğe), "Menü" etiketli; dokununca yan menüyü açar', () => {
    function State() {
      const { isOpen } = useSideMenu();
      return <Text testID="menu-state">{isOpen ? 'open' : 'closed'}</Text>;
    }
    render(
      <SideMenuProvider>
        <State />
        <AppShell />
      </SideMenuProvider>,
    );
    const btn = screen.getByTestId('home-menu-button');
    expect(btn.props.accessibilityLabel).toBe('Menü');
    const row = screen.getByTestId('app-shell-bar-row') as unknown as {
      props: { children: Array<{ props?: { testID?: string } }> };
    };
    const order = row.props.children.map((c) => c?.props?.testID);
    expect(order).toEqual(['home-menu-button', 'home-search-wrap', 'app-shell-cart']);
    expect(screen.getByTestId('menu-state').children.join('')).toBe('closed');
    fireEvent.press(btn);
    expect(screen.getByTestId('menu-state').children.join('')).toBe('open');
  });

  it('arama alanı sahte alandır: dokununca /search?focus=1 açar', () => {
    render(<AppShell />);
    fireEvent.press(screen.getByTestId('home-search-input'));
    expect(pushMock).toHaveBeenCalledWith('/search?focus=1');
  });

  it('bar satırı = headerHeight (ScreenHeader ile aynı) ve üst boşluk aynı kaynaktan (insets.top)', () => {
    mockTop = 47;
    const { unmount } = render(<AppShell />);
    expect(APP_SHELL_BAR_HEIGHT).toBe(theme.headerHeight);
    const shellBar = {
      ...StyleSheet.flatten(screen.getByTestId('app-shell-bar').props.style),
      ...StyleSheet.flatten(screen.getByTestId('app-shell-bar-bg').props.style),
    };
    expect(shellBar.paddingTop).toBe(47);
    unmount();

    render(<ScreenHeader title="Sepet" />);
    const stackBar = StyleSheet.flatten(screen.getByTestId('screen-header').props.style);
    const stackRow = StyleSheet.flatten(screen.getByTestId('screen-header-row').props.style);
    // Tab kökü <-> yığın ekranı: barın alt kenarı aynı y'de (inset + satır yüksekliği).
    expect(stackBar.paddingTop).toBe(shellBar.paddingTop);
    // Yığın barı yüzer ve zeminsizdir (kenar şeridi ayrı katman); ana sayfa barı kendi zemini.
    expect(stackBar.backgroundColor).toBeUndefined();
    expect(stackRow.height).toBe(APP_SHELL_BAR_HEIGHT);
  });

  it('arama alanına çift dokunuş tek /search açar', () => {
    render(<AppShell />);
    fireEvent.press(screen.getByTestId('home-search-input'));
    fireEvent.press(screen.getByTestId('home-search-input'));
    expect(pushMock.mock.calls.filter((c) => String(c[0]).startsWith('/search'))).toHaveLength(1);
  });

  it('StatusBar bildirmez (kök varsayılanı koyu içerik kalır)', () => {
    render(<AppShell />);
    expect(screen.queryByTestId('status-bar')).toBeNull();
  });

  it('arama alanı açık gri (gray-100) zemin + muted yer tutucu', () => {
    render(<AppShell />);
    const field = StyleSheet.flatten(screen.getByTestId('home-search-input').props.style);
    expect(field.backgroundColor).toBe(theme.colors.gray[100]);
  });

  it('arama alanı yüksekliği = cam düğme çapı, tam yuvarlak; sarmalayıcı aynı yükseklikte', () => {
    render(<AppShell />);
    const field = StyleSheet.flatten(screen.getByTestId('home-search-input').props.style);
    expect(field.height).toBe(GLASS_ICON_BUTTON_SIZE);
    expect(field.borderRadius).toBe(theme.radius.full);
    expect(StyleSheet.flatten(screen.getByTestId('home-search-wrap').props.style).height).toBe(GLASS_ICON_BUTTON_SIZE);
    expect(GLASS_ICON_BUTTON_SIZE).toBeLessThanOrEqual(APP_SHELL_BAR_HEIGHT);
  });
});

let collapsedRef: { value: boolean } | null = null;
function Capture() {
  collapsedRef = useTabBarCollapsed();
  return null;
}

describe('AppShell - yuzen bar: kaydirinca arama gizlenir, cam butonlar kalir', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  function setup() {
    render(
      <TabBarCollapseProvider>
        <Capture />
        <AppShell />
      </TabBarCollapseProvider>,
    );
  }
  const wrap = () => screen.getByTestId('home-search-wrap', { includeHiddenElements: true });

  it('liste basinda arama alani gorunur ve dokunulabilir', () => {
    setup();
    expect(wrap().props.pointerEvents).toBe('auto');
    expect(wrap().props.accessibilityElementsHidden).toBe(false);
    fireEvent.press(screen.getByTestId('home-search-input'));
    expect(pushMock).toHaveBeenCalledWith('/search?focus=1');
  });

  it('daralinca arama alani dokunmaya + ekran okuyucuya kapanir; menu ve sepet yerinde ve calisir', async () => {
    setup();
    act(() => {
      collapsedRef!.value = true;
      jest.advanceTimersByTime(300);
    });
    await waitFor(() => expect(wrap().props.pointerEvents).toBe('none'));
    expect(wrap().props.accessibilityElementsHidden).toBe(true);
    expect(wrap().props.importantForAccessibility).toBe('no-hide-descendants');
    fireEvent.press(screen.getByTestId('home-search-input', { includeHiddenElements: true }));
    expect(pushMock).not.toHaveBeenCalledWith('/search?focus=1');
    fireEvent.press(screen.getByTestId('app-shell-cart'));
    expect(pushMock).toHaveBeenCalledWith('/cart');
    expect(screen.getByTestId('home-menu-button')).toBeTruthy();
  });

  it('yukari kaydirinca / liste basina gelince arama geri gelir', async () => {
    setup();
    act(() => {
      collapsedRef!.value = true;
      jest.advanceTimersByTime(300);
    });
    await waitFor(() => expect(wrap().props.pointerEvents).toBe('none'));
    act(() => {
      collapsedRef!.value = false;
      jest.advanceTimersByTime(300);
    });
    await waitFor(() => expect(wrap().props.pointerEvents).toBe('auto'));
  });
});

describe('AppShell variant="title" — Ana Sayfa dışındaki sekme kökleri', () => {
  it('standart beyaz başlıklı bar: başlık var; arama alanı, bildirim ve sepet yok; geri oku yok', () => {
    render(
      <AppShell variant="title" title="Favoriler">
        <Text>içerik</Text>
      </AppShell>,
    );
    expect(screen.getByText('Favoriler')).toBeTruthy();
    expect(screen.getByText('içerik')).toBeTruthy();
    expect(screen.queryByTestId('home-search-input')).toBeNull();
    expect(screen.queryByTestId('app-shell-notifications')).toBeNull();
    expect(screen.queryByTestId('app-shell-cart')).toBeNull();
    expect(screen.queryByLabelText('Geri')).toBeNull();
  });

  it('ScreenHeader ile aynı bar kuralı: zemin, alt çizgi, üst boşluk ve satır yüksekliği', () => {
    mockTop = 47;
    const { unmount } = render(<AppShell variant="title" title="Profil" />);
    const bar = StyleSheet.flatten(screen.getByTestId('app-shell-bar').props.style);
    const row = StyleSheet.flatten(screen.getByTestId('app-shell-bar-row').props.style);
    unmount();
    render(<ScreenHeader title="Sepet" />);
    const stackBar = StyleSheet.flatten(screen.getByTestId('screen-header').props.style);
    const stackRow = StyleSheet.flatten(screen.getByTestId('screen-header-row').props.style);
    expect(bar.paddingTop).toBe(stackBar.paddingTop);
    expect(bar.backgroundColor).toBe(stackBar.backgroundColor);
    expect(bar.borderBottomColor).toBe(stackBar.borderBottomColor);
    expect(row.height).toBe(stackRow.height);
    expect(row.height).toBe(APP_SHELL_BAR_HEIGHT);
  });

  it('sağ aksiyon slotu çizilir', () => {
    render(<AppShell variant="title" title="Profil" right={<Text>aksiyon</Text>} />);
    expect(screen.getByText('aksiyon')).toBeTruthy();
  });
});

describe('AppShell variant="title" — yüzen ortalı bar + kaydırma kenarı', () => {
  function Bound() {
    const page = usePageScrollValue();
    return (
      <AppShell variant="title" title="Mesajlar" scroll={page}>
        <Text>liste</Text>
      </AppShell>
    );
  }

  it('bar yüzer (absolute), başlık ortalı; geri oku yok', () => {
    render(<AppShell variant="title" title="Mesajlar" />);
    expect(StyleSheet.flatten(screen.getByTestId('app-shell-bar').props.style).position).toBe('absolute');
    expect(StyleSheet.flatten(screen.getByText('Mesajlar').props.style).textAlign).toBe('center');
    expect(screen.queryByLabelText('Geri')).toBeNull();
  });

  it('kaydırma sinyali bağlı değilse gövde bar altında başlar (inset + headerHeight) ve şerit sabit', () => {
    mockTop = 47;
    render(<AppShell variant="title" title="Mesajlar" />);
    expect(StyleSheet.flatten(screen.getByTestId('app-shell-content').props.style).paddingTop).toBe(
      47 + theme.headerHeight + theme.headerBottomPad,
    );
    expect(StyleSheet.flatten(screen.getByTestId('app-shell-bar-edge').props.style).backgroundColor).toBe(
      theme.colors.overlay.white95,
    );
  });

  it('`scroll` verilince gövde tepeden başlar (liste inset verir) ve şerit kaydırmaya bağlı', () => {
    mockTop = 47;
    render(<Bound />);
    expect(StyleSheet.flatten(screen.getByTestId('app-shell-content').props.style).paddingTop).toBeUndefined();
    expect(StyleSheet.flatten(screen.getByTestId('app-shell-bar-edge').props.style).backgroundColor).toBeUndefined();
  });

  it('topInset değişince gövde yeniden mount olmaz (girilen veri korunur)', () => {
    const mounts = jest.fn();
    function Child() {
      React.useEffect(() => {
        mounts();
      }, []);
      return <Text>form</Text>;
    }
    const ui = (
      <AppShell variant="title" title="Profil">
        <Child />
      </AppShell>
    );
    mockTop = 0;
    const { rerender } = render(ui);
    mockTop = 47;
    rerender(ui);
    expect(mounts).toHaveBeenCalledTimes(1);
  });

  it('tek handler: useTabBarScrollHandler(…, scrollY) hem alt menü hem üst bar sinyali için tek onScroll döner', () => {
    const { result } = renderHook(() => {
      const page = usePageScrollValue();
      return { page, tab: useTabBarScrollHandler(undefined, page.scrollY) };
    });
    expect(result.current.tab.onScroll).toBeDefined();
    expect(result.current.page.scrollY.value).toBe(0);
  });
});
