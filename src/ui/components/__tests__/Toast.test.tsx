import React from 'react';
import { act, render, screen } from '@testing-library/react-native';
import { Snackbar, toast, ToastHost } from '@/ui';
import { resetToastForTests } from '../Toast';

describe('toast (web react-hot-toast karşılığı)', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    resetToastForTests();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('toast.success gösterilir, 2 sn sonra kapanır', () => {
    render(<ToastHost />);
    act(() => {
      toast.success('Kaydedildi');
    });
    expect(screen.getByText('Kaydedildi')).toBeTruthy();
    expect(screen.getByText('Ionicons:checkmark-circle')).toBeTruthy();
    act(() => {
      jest.advanceTimersByTime(2100);
    });
    expect(screen.queryByText('Kaydedildi')).toBeNull();
  });

  it('yenisi eskisinin yerini alır; error 4 sn', () => {
    render(<ToastHost />);
    act(() => {
      toast('Bilgi');
      toast.error('Olmadı');
    });
    expect(screen.queryByText('Bilgi')).toBeNull();
    expect(screen.getByText('Olmadı')).toBeTruthy();
    act(() => {
      jest.advanceTimersByTime(3000);
    });
    expect(screen.getByText('Olmadı')).toBeTruthy();
  });

  it('host bağlanmadan atılan son mesaj bağlanınca görünür', () => {
    toast('Erken');
    render(<ToastHost />);
    expect(screen.getByText('Erken')).toBeTruthy();
  });

  it('mevcut Snackbar kullanımı (koyu şerit) aynen çalışır', () => {
    render(
      <Snackbar visible onDismiss={jest.fn()} variant="success">
        Tamam
      </Snackbar>,
    );
    expect(screen.getByText('Tamam')).toBeTruthy();
  });
});
