import React from 'react';
import { Text } from 'react-native';
import { renderWithProviders } from '@/test-utils';
import { captureHardwareBack } from '@/test-utils/hardware-back';
import { replaceMock, resetRouterMocks } from '@/test-utils/router-mock';
import { useBlockHardwareBack, useHardwareBackToHome } from '../useBlockHardwareBack';

jest.mock('expo-router', () => require('@/test-utils/router-mock').routerMock);

function Block({ onBack }: { onBack?: () => void }) {
  useBlockHardwareBack(onBack);
  return <Text>blok</Text>;
}
function Home() {
  useHardwareBackToHome();
  return <Text>ev</Text>;
}

describe('useBlockHardwareBack', () => {
  let back: ReturnType<typeof captureHardwareBack>;
  beforeEach(() => {
    resetRouterMocks();
    back = captureHardwareBack();
  });
  afterEach(() => back.restore());

  it('geri tuşunu yutar (true döner), handler yoksa hiçbir yere gitmez', () => {
    renderWithProviders(<Block />);
    expect(back.count).toBe(1);
    expect(back.press()).toBe(true);
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it('handler verilirse çağrılır ve tuş yine yutulur', () => {
    const onBack = jest.fn();
    renderWithProviders(<Block onBack={onBack} />);
    expect(back.press()).toBe(true);
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('en güncel handler çağrılır (yeniden kayıt gerekmez)', () => {
    const first = jest.fn();
    const second = jest.fn();
    const view = renderWithProviders(<Block onBack={first} />);
    view.rerender(<Block onBack={second} />);
    back.press();
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('odak kaybı/unmount: dinleyici kaldırılır', () => {
    const view = renderWithProviders(<Block />);
    view.unmount();
    expect(back.remove).toHaveBeenCalledTimes(1);
  });

  it('useHardwareBackToHome: geri = ana sayfaya replace', () => {
    renderWithProviders(<Home />);
    expect(back.press()).toBe(true);
    expect(replaceMock).toHaveBeenCalledWith('/(tabs)');
  });
});
