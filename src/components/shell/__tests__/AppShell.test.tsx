import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { act, fireEvent, render, renderHook, screen, waitFor, within } from '@testing-library/react-native';
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
  useShellCounts: () => ({ cartCount: 2, notificationCount: 5, messageCount: 3 }),
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
  it('beyaz bar (ScreenHeader ile aynı zemin + alt çizgi), logo yok; hamburger + arama alanı + mesajlar + bildirimler (sayaçlı), sepet yok', () => {
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
    // Sepet alt menüde (sekme): üst barda yok. Sağda tam iki düğme, okunmamış sayaçlarıyla.
    expect(screen.queryByTestId('app-shell-cart')).toBeNull();
    expect(within(screen.getByTestId('app-shell-messages')).getByText('3')).toBeTruthy();
    expect(within(screen.getByTestId('app-shell-notifications')).getByText('5')).toBeTruthy();
    expect(screen.getByTestId('app-shell-messages').props.accessibilityLabel).toBe('Mesajlar');
    expect(screen.getByTestId('app-shell-notifications').props.accessibilityLabel).toBe('Bildirimler');
    expect(screen.getByText('içerik')).toBeTruthy();
    fireEvent.press(screen.getByTestId('app-shell-messages'));
    expect(pushMock).toHaveBeenCalledWith('/messages');
    fireEvent.press(screen.getByTestId('app-shell-notifications'));
    expect(pushMock).toHaveBeenCalledWith('/notifications');
  });

  it('mesaj/bildirim düğmesine çift dokunuş tek ekran açar', () => {
    render(<AppShell />);
    fireEvent.press(screen.getByTestId('app-shell-messages'));
    fireEvent.press(screen.getByTestId('app-shell-messages'));
    expect(pushMock.mock.calls.filter((c) => c[0] === '/messages')).toHaveLength(1);
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
      props: { children: Array<{ type?: { name?: string }; props?: { testID?: string } }> };
    };
    const order = row.props.children.map((c) => c?.props?.testID ?? c?.type?.name);
    expect(order).toEqual(['home-menu-button', 'home-search-wrap', 'ShellHeaderActions']);
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

  it('Ana Sayfa arama alanı eski görünümünde: çerçevesiz gri (gray-100) tam yuvarlak hap', () => {
    render(<AppShell />);
    const field = StyleSheet.flatten(screen.getByTestId('home-search-input').props.style);
    expect(field.backgroundColor).toBe(theme.colors.gray[100]);
    expect(field.borderWidth).toBeUndefined();
    expect(field.borderColor).toBeUndefined();
    expect(field.borderRadius).toBe(theme.radius.full);
  });

  it('arama alanı asgari yüksekliği = cam düğme çapı; sarmalayıcı aynı yükseklikte', () => {
    render(<AppShell />);
    const field = StyleSheet.flatten(screen.getByTestId('home-search-input').props.style);
    expect(field.minHeight).toBe(GLASS_ICON_BUTTON_SIZE);
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

  it('daralinca arama alani dokunmaya + ekran okuyucuya kapanir; menu, mesajlar ve bildirimler yerinde ve calisir', async () => {
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
    fireEvent.press(screen.getByTestId('app-shell-notifications'));
    expect(pushMock).toHaveBeenCalledWith('/notifications');
    expect(screen.getByTestId('app-shell-messages')).toBeTruthy();
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
  it('başlıklı bar: solda ☰, sağda TAM iki düğme (mesajlar + bildirimler); arama alanı, sepet ve geri oku yok', () => {
    render(
      <AppShell variant="title" title="Favoriler">
        <Text>içerik</Text>
      </AppShell>,
    );
    expect(screen.getByText('Favoriler')).toBeTruthy();
    expect(screen.getByText('içerik')).toBeTruthy();
    expect(screen.queryByTestId('home-search-input')).toBeNull();
    expect(screen.getByTestId('app-shell-menu').props.accessibilityLabel).toBe('Menü');
    const right = within(screen.getByTestId('app-shell-bar-right'));
    expect(right.getByTestId('app-shell-messages')).toBeTruthy();
    expect(right.getByTestId('app-shell-notifications')).toBeTruthy();
    expect(right.getAllByRole('button')).toHaveLength(2);
    expect(within(screen.getByTestId('app-shell-bar-left')).getByTestId('app-shell-menu')).toBeTruthy();
    expect(screen.queryByTestId('app-shell-cart')).toBeNull();
    expect(screen.queryByLabelText('Geri')).toBeNull();
  });

  it('☰ yan menüyü açar; mesaj/bildirim yığın rotalarını açar', () => {
    function State() {
      const { isOpen } = useSideMenu();
      return <Text testID="menu-state">{isOpen ? 'open' : 'closed'}</Text>;
    }
    render(
      <SideMenuProvider>
        <State />
        <AppShell variant="title" title="Sepetim" subtitle="2 ürün" />
      </SideMenuProvider>,
    );
    expect(screen.getByText('2 ürün')).toBeTruthy();
    fireEvent.press(screen.getByTestId('app-shell-menu'));
    expect(screen.getByTestId('menu-state').children.join('')).toBe('open');
    fireEvent.press(screen.getByTestId('app-shell-messages'));
    expect(pushMock).toHaveBeenCalledWith('/messages');
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

  it('bar yüzer (absolute), başlık ortalı; geri oku yok (yerinde ☰)', () => {
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
