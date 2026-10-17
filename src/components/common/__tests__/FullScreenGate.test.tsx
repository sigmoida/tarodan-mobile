/**
 * B2 inceleme 7 + 9 · Tam ekran kapıların ortak kabuğu: native tam ekran
 * Modal (açık ekran modallarının ve uyarıların üstünde), kapatılamaz, TEK
 * öncelik sırası (ForceUpdate > RequiredSteps), iOS'ta düşen sunum yeniden
 * denenir.
 */
import React from 'react';
import { Keyboard, Modal, Platform, StyleSheet, Text } from 'react-native';
import { act, render, renderHook, screen } from '@testing-library/react-native';
import {
  FULL_SCREEN_GATE_LAYERS,
  FullScreenGate,
  GATE_PRESENT_RETRY_MS,
  topFullScreenGate,
  useFullScreenGateShown,
} from '../FullScreenGate';
import { keyboardBottomInset } from '@/hooks/useKeyboardHeight';

const modals = () => screen.UNSAFE_queryAllByType(Modal);

describe('FullScreenGate', () => {
  afterEach(() => jest.useRealTimers());

  it('öncelik tek sabitten: zorunlu güncelleme zorunlu adımların üstünde', () => {
    expect(FULL_SCREEN_GATE_LAYERS).toEqual(['forceUpdate', 'requiredSteps']);
    expect(topFullScreenGate({ requiredSteps: true, forceUpdate: true })).toBe('forceUpdate');
    expect(topFullScreenGate({ requiredSteps: true })).toBe('requiredSteps');
    expect(topFullScreenGate({})).toBeNull();
  });

  it('içeriği native, tam ekran, kapatılamaz bir Modal içinde sunar', () => {
    render(
      <FullScreenGate layer="requiredSteps" testID="gate">
        <Text>içerik</Text>
      </FullScreenGate>,
    );
    expect(screen.getByText('içerik')).toBeOnTheScreen();
    expect(screen.getByTestId('gate').props.accessibilityViewIsModal).toBe(true);
    const [modal] = modals();
    expect(modal!.props.visible).toBe(true);
    expect(modal!.props.presentationStyle).toBe('fullScreen');
    expect(modal!.props.statusBarTranslucent).toBe(true);
    expect(modal!.props.transparent).toBeFalsy();
    // Android geri tuşu: onRequestClose hiçbir şey yapmaz, kapı açık kalır.
    act(() => modal!.props.onRequestClose());
    expect(screen.getByText('içerik')).toBeOnTheScreen();
  });

  it('onBackPress verilirse Android geri tuşu onu çağırır (kimlik adımında "Vazgeç")', () => {
    const onBackPress = jest.fn();
    render(
      <FullScreenGate layer="requiredSteps" onBackPress={onBackPress}>
        <Text>içerik</Text>
      </FullScreenGate>,
    );
    act(() => modals()[0]!.props.onRequestClose());
    expect(onBackPress).toHaveBeenCalledTimes(1);
  });

  it('aynı anda yalnız en üst kapı sunulur; üstteki kalkınca alttaki görünür', () => {
    const Gates = ({ update }: { update: boolean }) => (
      <>
        <FullScreenGate layer="requiredSteps">
          <Text>onay</Text>
        </FullScreenGate>
        {update && (
          <FullScreenGate layer="forceUpdate">
            <Text>güncelle</Text>
          </FullScreenGate>
        )}
      </>
    );
    const view = render(<Gates update />);
    expect(screen.getByText('güncelle')).toBeOnTheScreen();
    expect(screen.queryByText('onay')).toBeNull();

    view.rerender(<Gates update={false} />);
    expect(screen.getByText('onay')).toBeOnTheScreen();
  });

  it('useFullScreenGateShown kapı bağlıyken true (kök düzen uyarıları erteler)', () => {
    const hook = renderHook(() => useFullScreenGateShown());
    expect(hook.result.current).toBe(false);
    const view = render(
      <FullScreenGate layer="requiredSteps">
        <Text>onay</Text>
      </FullScreenGate>,
    );
    hook.rerender({});
    expect(hook.result.current).toBe(true);
    view.unmount();
    hook.rerender({});
    expect(hook.result.current).toBe(false);
  });

  it('iOS: onShow gelmezse (başka modal sunuluyken) Modal yeniden bağlanıp tekrar sunulur', () => {
    expect(Platform.OS).toBe('ios');
    jest.useFakeTimers();
    render(
      <FullScreenGate layer="requiredSteps">
        <Text>onay</Text>
      </FullScreenGate>,
    );
    const first = modals()[0]!;
    act(() => jest.advanceTimersByTime(GATE_PRESENT_RETRY_MS));
    const second = modals()[0]!;
    expect(second).not.toBe(first);

    // Sunum başarılı: artık yeniden denenmez.
    act(() => second.props.onShow());
    act(() => jest.advanceTimersByTime(GATE_PRESENT_RETRY_MS * 3));
    expect(modals()[0]).toBe(second);
  });

  describe('B3 inceleme 9 · klavye alt düğmeleri örtmez', () => {
    const realOS = Platform.OS;
    let handlers: Record<string, (e?: unknown) => void>;
    beforeEach(() => {
      handlers = {};
      jest.spyOn(Keyboard, 'addListener').mockImplementation(((
        type: string,
        fn: (e?: unknown) => void,
      ) => {
        handlers[type] = fn;
        return { remove: jest.fn() };
      }) as never);
    });
    afterEach(() => {
      Platform.OS = realOS;
      jest.restoreAllMocks();
    });

    const bottom = () => StyleSheet.flatten(screen.getByTestId('gate').props.style).paddingBottom;
    const renderGate = () =>
      render(
        <FullScreenGate layer="requiredSteps" testID="gate">
          <Text>form</Text>
        </FullScreenGate>,
      );

    it('Android (kenardan kenara Modal): klavye açılınca alt boşluk klavye kadar büyür, kapanınca döner', () => {
      Platform.OS = 'android';
      renderGate();
      expect(Object.keys(handlers)).toEqual(['keyboardDidShow', 'keyboardDidHide']);
      expect(bottom()).toBe(0);
      act(() => handlers.keyboardDidShow!({ endCoordinates: { height: 300 } }));
      expect(bottom()).toBe(300);
      act(() => handlers.keyboardDidHide!());
      expect(bottom()).toBe(0);
    });

    it('iOS: klavye animasyonuyla (will*) aynı anda', () => {
      renderGate();
      expect(Object.keys(handlers)).toEqual(['keyboardWillShow', 'keyboardWillHide']);
      act(() => handlers.keyboardWillShow!({ endCoordinates: { height: 336 } }));
      expect(bottom()).toBe(336);
    });

    it('güvenli alan: Android klavye ölçüsü gezinti çubuğunu içermez, iOS içerir', () => {
      Platform.OS = 'android';
      expect(keyboardBottomInset(0, 24)).toBe(24);
      expect(keyboardBottomInset(300, 24)).toBe(324);
      Platform.OS = 'ios';
      expect(keyboardBottomInset(0, 34)).toBe(34);
      expect(keyboardBottomInset(336, 34)).toBe(336);
    });
  });
});
