import React from 'react';
import { BackHandler, Text, View } from 'react-native';
import { StyleSheet } from 'react-native';
import { act, fireEvent, render, screen, within } from '@testing-library/react-native';
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
  it('kapalıyken panel/menü içeriği bağlı değil; uygulama içeriği hep çizili', () => {
    setup();
    expect(screen.queryByTestId('side-menu')).toBeNull();
    expect(screen.queryByTestId('menu-content')).toBeNull();
    expect(screen.queryByTestId('side-menu-overlay')).toBeNull();
    expect(screen.getByTestId('app-content')).toBeTruthy();
  });

  it('open() ile panel + örtü + içerik çizilir; panel modal erişilebilirlik kabında', () => {
    setup();
    fireEvent.press(screen.getByTestId('open'));
    flush();
    expect(screen.getByTestId('side-menu')).toBeTruthy();
    expect(screen.getByTestId('side-menu-overlay')).toBeTruthy();
    expect(screen.getByTestId('menu-content')).toBeTruthy();
    expect(screen.getByTestId('side-menu').props.accessibilityViewIsModal).toBe(true);
    // Başlık ("Menü") ve X düğmesi yok.
    expect(screen.queryByText('Menü')).toBeNull();
    expect(screen.queryByTestId('side-menu-close')).toBeNull();
    // Push düzeni: panel ve uygulama içeriği AYNI kayan taşıyıcının içinde.
    const track = screen.getByTestId('side-menu-track');
    expect(within(track).getByTestId('side-menu')).toBeTruthy();
    // Açıkken ekran okuyucudan gizli olduğu için gizli öğeler de dahil.
    expect(within(track).getByTestId('app-content', { includeHiddenElements: true })).toBeTruthy();
  });

  it('açıkken uygulama içeriği ekran okuyucudan gizlenir ve aynı örnek kalır (sökülmez)', () => {
    setup();
    const before = screen.getByTestId('app-content');
    fireEvent.press(screen.getByTestId('open'));
    flush();
    const after = screen.getByTestId('app-content', { includeHiddenElements: true });
    expect(after).toBe(before);
    expect(after.parent?.parent?.props.accessibilityElementsHidden).toBe(true);
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

  it('gizli erişilebilirlik "Menüyü kapat" öğesi menüyü kapatır; iOS escape da kapatır', () => {
    setup();
    fireEvent.press(screen.getByTestId('open'));
    flush();
    const hidden = screen.getByTestId('side-menu-a11y-close');
    expect(hidden.props.accessibilityLabel).toBe('Menüyü kapat');
    fireEvent.press(hidden);
    flush();
    expect(screen.queryByTestId('side-menu')).toBeNull();

    fireEvent.press(screen.getByTestId('open'));
    flush();
    act(() => {
      screen.getByTestId('side-menu').props.onAccessibilityEscape();
    });
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
    // jest-utils, kayıt anındaki (kapalı → enabled:false) jest nesnesini döndürür; gerçekte
    // GestureDetector `enabled`i native'e günceller. Testte açık durumu elle yansıt.
    const panGesture = getByGestureTestId('side-menu-pan');
    panGesture.config.enabled = true;
    act(() => {
      fireGestureHandler(panGesture, [
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

  it('yarış: sürükleme sürerken menü dışarıdan kapanırsa jest kapanışı ezmez; panel sökülür, progress 0', () => {
    setup();
    fireEvent.press(screen.getByTestId('open'));
    flush();
    const panGesture = getByGestureTestId('side-menu-pan');
    panGesture.config.enabled = true;
    act(() => {
      fireGestureHandler(panGesture, [
        { state: State.BEGAN, translationX: 0, velocityX: 0 },
        { state: State.ACTIVE, translationX: -20, velocityX: -50 },
      ]);
    });
    // Parmak hâlâ ekrandayken dışarıdan kapanış (Android geri tuşu / rota değişimi).
    act(() => {
      backHandlers[0]!();
    });
    // Eşiğin altında bir bırakma: eski kodda progress=1'e geri yazıp kapanışı keserdi.
    act(() => {
      fireGestureHandler(panGesture, [
        { state: State.ACTIVE, translationX: -40, velocityX: -50 },
        { state: State.END, translationX: -40, velocityX: -50 },
      ]);
    });
    flush();
    flush();
    expect(screen.getByTestId('state').children.join('')).toBe('closed');
    expect(screen.queryByTestId('side-menu')).toBeNull();
    expect(screen.queryByTestId('side-menu-overlay')).toBeNull();
    const style = StyleSheet.flatten(screen.getByTestId('side-menu-track').props.style);
    expect(style.transform).toEqual([{ translateX: 0 }]);
  });

  it('genişlik: ekranın %80i, en fazla 340pt', () => {
    expect(sideMenuWidth(390)).toBe(312);
    expect(sideMenuWidth(600)).toBe(SIDE_MENU_MAX_WIDTH);
  });

  it('kapanış sürerken panel dokunuşa kapalı (çift basış koruması)', () => {
    setup();
    fireEvent.press(screen.getByTestId('open'));
    flush();
    expect(screen.getByTestId('side-menu').props.pointerEvents).toBe('auto');
    fireEvent.press(screen.getByTestId('side-menu-overlay'));
    expect(screen.getByTestId('side-menu').props.pointerEvents).toBe('none');
  });
});
