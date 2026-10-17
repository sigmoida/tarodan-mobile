/**
 * Kapı (tam ekran zorunlu adım) altında AlertDialogHost HEP bağlı kalır:
 * - `suspended` iken yeni alert sunulmaz, kuyrukta bekler; açık alert kuyruğun başına döner.
 * - Host sökülürse bekleyen `afterClose` (basılan düğmenin onPress'i) kaybolmaz; gösterilen ve
 *   bekleyen alert'ler modül kuyruğuna sırayla geri döner.
 */
import React from 'react';
import { Platform } from 'react-native';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react-native';
import { AlertDialogHost, appAlert, resetAlertQueueForTests } from '../AlertDialog';
import { MODAL_CLOSE_DELAY_MS } from '../../lib/modal-timing';

const originalOS = Platform.OS;
beforeEach(() => {
  jest.useFakeTimers();
  Object.defineProperty(Platform, 'OS', { configurable: true, get: () => 'android' });
});
afterEach(() => {
  // Sökülen host alert'leri modül kuyruğuna geri verir (test konusu bu): testler arasında sızmasın.
  cleanup();
  resetAlertQueueForTests();
  jest.useRealTimers();
  Object.defineProperty(Platform, 'OS', { configurable: true, get: () => originalOS });
});

describe('suspended (kapı açık)', () => {
  it('yeni alert sunulmaz, kuyrukta bekler; kapı kapanınca çıkar', () => {
    const { rerender } = render(<AlertDialogHost suspended />);
    act(() => appAlert('Bekleyen', undefined, [{ text: 'Tamam' }]));
    expect(screen.queryByText('Bekleyen')).toBeNull();

    rerender(<AlertDialogHost suspended={false} />);
    expect(screen.getByText('Bekleyen')).toBeTruthy();
  });

  it('kuyruk sırası korunur', () => {
    const { rerender } = render(<AlertDialogHost suspended />);
    act(() => {
      appAlert('Bir', undefined, [{ text: 'b1' }]);
      appAlert('İki', undefined, [{ text: 'b2' }]);
    });
    rerender(<AlertDialogHost suspended={false} />);
    expect(screen.getByText('Bir')).toBeTruthy();
    fireEvent.press(screen.getByText('b1'));
    act(() => jest.advanceTimersByTime(MODAL_CLOSE_DELAY_MS));
    expect(screen.getByText('İki')).toBeTruthy();
  });

  it('açık alert kapı gelince gizlenir ama kaybolmaz: kapı kapanınca yeniden çıkar', () => {
    const { rerender } = render(<AlertDialogHost />);
    act(() => appAlert('Açık', undefined, [{ text: 'Tamam' }]));
    expect(screen.getByText('Açık')).toBeTruthy();

    rerender(<AlertDialogHost suspended />);
    expect(screen.queryByText('Açık')).toBeNull();
    act(() => appAlert('Sonraki', undefined, [{ text: 's' }]));
    expect(screen.queryByText('Sonraki')).toBeNull();

    rerender(<AlertDialogHost suspended={false} />);
    expect(screen.getByText('Açık')).toBeTruthy(); // önce eski, sonra yeni
    fireEvent.press(screen.getByText('Tamam'));
    act(() => jest.advanceTimersByTime(MODAL_CLOSE_DELAY_MS));
    expect(screen.getByText('Sonraki')).toBeTruthy();
  });

  it('kapanış sürerken kapı gelirse sıradaki alert kapı kapanana dek açılmaz, onPress yine çalışır', () => {
    const onPress = jest.fn();
    const { rerender } = render(<AlertDialogHost />);
    act(() => {
      appAlert('A', undefined, [{ text: 'a', onPress }]);
      appAlert('B', undefined, [{ text: 'b' }]);
    });
    fireEvent.press(screen.getByText('a'));
    rerender(<AlertDialogHost suspended />);
    act(() => jest.advanceTimersByTime(MODAL_CLOSE_DELAY_MS * 3));
    expect(onPress).toHaveBeenCalledTimes(1); // host bağlı kaldığı için kaybolmadı
    expect(screen.queryByText('B')).toBeNull();

    rerender(<AlertDialogHost suspended={false} />);
    expect(screen.getByText('B')).toBeTruthy();
  });
});

describe('host sökülürse', () => {
  it('kapanış bekleyen düğmenin onPress\'i hemen çalışır (kaybolmaz)', () => {
    const onPress = jest.fn();
    const { unmount } = render(<AlertDialogHost />);
    act(() => appAlert('A', undefined, [{ text: 'a', onPress }]));
    fireEvent.press(screen.getByText('a'));
    expect(onPress).not.toHaveBeenCalled();

    unmount();
    expect(onPress).toHaveBeenCalledTimes(1);
    act(() => jest.advanceTimersByTime(MODAL_CLOSE_DELAY_MS * 5));
    expect(onPress).toHaveBeenCalledTimes(1); // zamanlayıcı temizlendi, çift çağrı yok
  });

  it('gösterilen ve bekleyen alert\'ler sırayla yeni host\'ta çıkar', () => {
    const first = render(<AlertDialogHost />);
    act(() => {
      appAlert('A', undefined, [{ text: 'a' }]);
      appAlert('B', undefined, [{ text: 'b' }]);
    });
    expect(screen.getByText('A')).toBeTruthy();
    first.unmount();

    render(<AlertDialogHost />);
    expect(screen.getByText('A')).toBeTruthy();
    fireEvent.press(screen.getByText('a'));
    act(() => jest.advanceTimersByTime(MODAL_CLOSE_DELAY_MS));
    expect(screen.getByText('B')).toBeTruthy();
  });

  it('sökülürken onPress içinden açılan alert de kaybolmaz', () => {
    const first = render(<AlertDialogHost />);
    act(() =>
      appAlert('A', undefined, [{ text: 'a', onPress: () => appAlert('C', undefined, [{ text: 'c' }]) }]),
    );
    fireEvent.press(screen.getByText('a'));
    first.unmount();

    render(<AlertDialogHost />);
    expect(screen.getByText('C')).toBeTruthy();
  });
});
