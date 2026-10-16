/**
 * `options.key` + `dismissAlert(key)`: durum alert'leri (ör. "internet yok") tekilleşir ve
 * bağlantı dönünce düğmesiz kapatılır (kuyrukta ya da ekranda).
 */
import React from 'react';
import { Platform } from 'react-native';
import { act, cleanup, render, screen } from '@testing-library/react-native';
import {
  AlertDialogHost,
  appAlert,
  dismissAlert,
  resetAlertQueueForTests,
} from '../AlertDialog';
import { MODAL_CLOSE_DELAY_MS } from '../../lib/modal-timing';

const originalOS = Platform.OS;
beforeEach(() => {
  jest.useFakeTimers();
  Object.defineProperty(Platform, 'OS', { configurable: true, get: () => 'android' });
});
afterEach(() => {
  cleanup();
  resetAlertQueueForTests();
  jest.useRealTimers();
  Object.defineProperty(Platform, 'OS', { configurable: true, get: () => originalOS });
});

describe('dismissAlert', () => {
  it('ekrandaki anahtarlı alert düğmesiz kapanır; onPress çalışmaz', () => {
    const onPress = jest.fn();
    render(<AlertDialogHost />);
    act(() => appAlert('Durum', 'msg', [{ text: 'Tamam', onPress }], { key: 'k' }));
    expect(screen.getByText('Durum')).toBeTruthy();

    act(() => dismissAlert('k'));
    act(() => jest.advanceTimersByTime(MODAL_CLOSE_DELAY_MS));
    expect(screen.queryByText('Durum')).toBeNull();
    expect(onPress).not.toHaveBeenCalled();
  });

  it('aynı anahtarlı ikinci alert eklenmez (gösterilirken ve sıradayken)', () => {
    render(<AlertDialogHost />);
    act(() => {
      appAlert('Önce', undefined, [{ text: 'a' }]);
      appAlert('Durum', undefined, [{ text: 'b' }], { key: 'k' });
      appAlert('Durum', undefined, [{ text: 'b' }], { key: 'k' });
    });
    expect(screen.getByText('Önce')).toBeTruthy();
    act(() => dismissAlert('k')); // sıradaki tek kopya kalkar
    act(() => {
      appAlert('Önce', undefined, [{ text: 'a' }]);
    });
    expect(screen.queryByText('Durum')).toBeNull();
  });

  it('kuyruktaki (host öncesi / askıda) anahtarlı alert hiç gösterilmez', () => {
    appAlert('Durum', undefined, [{ text: 'Tamam' }], { key: 'k' }); // host yok -> modül kuyruğu
    dismissAlert('k');
    render(<AlertDialogHost />);
    expect(screen.queryByText('Durum')).toBeNull();
  });

  it('askıdaki host: bekleyen anahtarlı alert kapı kapanınca çıkmaz', () => {
    const { rerender } = render(<AlertDialogHost suspended />);
    act(() => appAlert('Durum', undefined, [{ text: 'Tamam' }], { key: 'k' }));
    act(() => dismissAlert('k'));
    rerender(<AlertDialogHost suspended={false} />);
    expect(screen.queryByText('Durum')).toBeNull();
  });
});
