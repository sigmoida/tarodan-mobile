/**
 * `cancelable` varsayılanı (Android geri tuşu / arka plan): `cancel` stilli düğme varsa ya da tek
 * düğmeliyse kapatılabilir; kapatma iptal (yoksa tek) düğmeye basmak sayılır. Açık
 * `cancelable: false` korunur.
 *
 * `confirm()` (web ConfirmProvider imzası): Promise<boolean>, diyalog TAMAMEN kapandıktan sonra
 * çözülür (ModalFreeze sözleşmesi); iptal / geri / arka plan → false.
 */
import React from 'react';
import { Modal as RNModal, Platform } from 'react-native';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react-native';
import { AlertDialogHost, appAlert, confirm, isAlertCancelable, resetAlertQueueForTests } from '../AlertDialog';
import { MODAL_CLOSE_DELAY_MS } from '../../lib/modal-timing';

const setPlatform = (os: 'ios' | 'android') => {
  Object.defineProperty(Platform, 'OS', { configurable: true, get: () => os });
};
const originalOS = Platform.OS;

beforeEach(() => {
  jest.useFakeTimers();
  setPlatform('android'); // kapanış sabit süreyle biter (iOS onDismiss beklemez)
});
afterEach(() => {
  cleanup();
  resetAlertQueueForTests();
  jest.useRealTimers();
  setPlatform(originalOS as 'ios' | 'android');
});

const modal = () => screen.UNSAFE_getByType(RNModal);
const backPress = () => act(() => modal().props.onRequestClose());
const settle = () => act(() => jest.advanceTimersByTime(MODAL_CLOSE_DELAY_MS * 2));

describe('cancelable varsayılanı', () => {
  it('isAlertCancelable: iptal düğmesi ya da tek düğme → true; aksi false; açık değer korunur', () => {
    expect(isAlertCancelable([{ text: 'Tamam' }])).toBe(true);
    expect(isAlertCancelable([{ text: 'İptal', style: 'cancel' }, { text: 'Sil', style: 'destructive' }])).toBe(true);
    expect(isAlertCancelable([{ text: 'A' }, { text: 'B' }])).toBe(false);
    expect(isAlertCancelable([{ text: 'Tamam' }], { cancelable: false })).toBe(false);
    expect(isAlertCancelable([{ text: 'A' }, { text: 'B' }], { cancelable: true })).toBe(true);
  });

  it('geri tuşu = iptal düğmesi: iptalin onPress\'i kapanış bitince, onay hiç çalışmaz', () => {
    const onCancel = jest.fn();
    const onDelete = jest.fn();
    render(<AlertDialogHost />);
    act(() =>
      appAlert('Silinsin mi?', undefined, [
        { text: 'İptal', style: 'cancel', onPress: onCancel },
        { text: 'Sil', style: 'destructive', onPress: onDelete },
      ]),
    );
    backPress();
    expect(modal().props.visible).toBe(false);
    expect(onCancel).not.toHaveBeenCalled();
    settle();
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onDelete).not.toHaveBeenCalled();
  });

  it('tek düğmeli bilgi: arka plana dokunmak düğmeye basmak gibi (onaylayan akış takılmaz) + onDismiss', () => {
    const onOk = jest.fn();
    const onDismiss = jest.fn();
    render(<AlertDialogHost />);
    act(() => appAlert('Kaydedildi', undefined, [{ text: 'Tamam', onPress: onOk }], { onDismiss }));
    fireEvent.press(screen.getByTestId('alert-dialog-backdrop'));
    settle();
    expect(onOk).toHaveBeenCalledTimes(1);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('cancelable:false (ödeme belirsizliği): geri tuşu ve arka plan kapatmaz', () => {
    const onOk = jest.fn();
    render(<AlertDialogHost />);
    act(() => appAlert('Bağlantı sorunu', 'Ödeme durumu kontrol ediliyor', [{ text: 'Tamam', onPress: onOk }], { cancelable: false }));
    backPress();
    fireEvent.press(screen.getByTestId('alert-dialog-backdrop'));
    settle();
    expect(modal().props.visible).toBe(true);
    expect(onOk).not.toHaveBeenCalled();
  });

  it('iptalsiz 2 düğme (seçim) varsayılan kapatılamaz', () => {
    render(<AlertDialogHost />);
    act(() => appAlert('Seç', undefined, [{ text: 'A' }, { text: 'B' }]));
    backPress();
    settle();
    expect(modal().props.visible).toBe(true);
  });
});

describe('confirm()', () => {
  const run = (opts: Parameters<typeof confirm>[0]) => {
    let result: boolean | undefined;
    act(() => {
      confirm(opts).then((v) => {
        result = v;
      });
    });
    return () => result;
  };
  const flush = async () => {
    settle();
    await act(async () => {
      await Promise.resolve();
    });
  };

  it('onay → true, YALNIZ diyalog kapandıktan sonra çözülür', async () => {
    render(<AlertDialogHost />);
    const result = run({ title: 'Silinsin mi?', message: 'Geri alınamaz', confirmLabel: 'Sil', destructive: true });
    expect(screen.getByText('Silinsin mi?')).toBeTruthy();
    expect(screen.getByText('İptal')).toBeTruthy(); // varsayılan iptal etiketi
    fireEvent.press(screen.getByText('Sil'));
    await act(async () => {
      await Promise.resolve();
    });
    expect(result()).toBeUndefined(); // kapanış bitmeden çözülmez
    await flush();
    expect(result()).toBe(true);
  });

  it('iptal → false', async () => {
    render(<AlertDialogHost />);
    const result = run({ title: 'Emin misiniz?' });
    expect(screen.getByText('Onayla')).toBeTruthy(); // varsayılan onay etiketi
    fireEvent.press(screen.getByText('İptal'));
    await flush();
    expect(result()).toBe(false);
  });

  it('geri tuşu / arka plan → false', async () => {
    render(<AlertDialogHost />);
    const result = run({ title: 'Emin misiniz?', cancelLabel: 'Vazgeç' });
    backPress();
    await flush();
    expect(result()).toBe(false);
  });
});
