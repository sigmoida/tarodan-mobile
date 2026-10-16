/** Vitrin tüm primitive'leri çökmeden çizer (duman testi). */
import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Showcase } from '../_components/Showcase';
import { SheetShowcase } from '../_components/SheetShowcase';
import { LoadingShowcase } from '../_components/LoadingShowcase';

describe('Showcase', () => {
  it('bütün bölümler çizilir', () => {
    render(<Showcase />);
    for (const title of ['Button', 'IconButton', 'Badge', 'Chip / Stepper', 'Alert', 'ChipTabs', 'Form', 'Geri bildirim']) {
      expect(screen.getByText(title)).toBeTruthy();
    }
  });
});

describe('LoadingShowcase', () => {
  it('Yükleme bölümü: göstergeler + iskeletler; useDelayedLoading demosu kısa yüklemede göstergesiz', () => {
    jest.useFakeTimers();
    render(<LoadingShowcase />);
    expect(screen.getByText('Yükleme')).toBeTruthy();
    // 3 ton × 3 boyut + 3 Button + 1 IconButton.
    expect(screen.getAllByTestId('loading-indicator')).toHaveLength(9);
    fireEvent.press(screen.getByText('Yükle 100 ms'));
    act(() => {
      jest.advanceTimersByTime(100);
    });
    expect(screen.getByText(/gösterge: false/)).toBeTruthy();
    fireEvent.press(screen.getByText('Yükle 1,5 sn'));
    act(() => {
      jest.advanceTimersByTime(200);
    });
    expect(screen.getByText(/isLoading: true · gösterge: true/)).toBeTruthy();
    act(() => {
      jest.advanceTimersByTime(2000);
    });
    expect(screen.getByText('İçerik')).toBeTruthy();
    jest.useRealTimers();
  });
});

describe('SheetShowcase', () => {
  it('ActionSheet "Sil" eylemi appAlert dialogunu sheet kapandıktan SONRA açar', () => {
    jest.useFakeTimers();
    const { appAlert } = jest.requireMock('@/ui');
    render(<SheetShowcase />);
    expect(screen.getByText('Alttan açılan paneller')).toBeTruthy();
    fireEvent.press(screen.getByText('ActionSheet'));
    fireEvent.press(screen.getByText('Sil'));
    expect(appAlert).not.toHaveBeenCalled();
    // Kapanış animasyonu → native Modal kapanır → (iOS onDismiss yedeği) eylem.
    act(() => {
      jest.advanceTimersByTime(600);
    });
    expect(appAlert).not.toHaveBeenCalled();
    act(() => {
      jest.advanceTimersByTime(2000);
    });
    expect(appAlert).toHaveBeenCalledWith('Silinsin mi?', expect.any(String), expect.any(Array));
    jest.useRealTimers();
  });
});
