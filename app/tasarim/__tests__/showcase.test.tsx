/** Vitrin tüm primitive'leri çökmeden çizer (duman testi). */
import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Showcase } from '../_components/Showcase';
import { SheetShowcase } from '../_components/SheetShowcase';

describe('Showcase', () => {
  it('bütün bölümler çizilir', () => {
    render(<Showcase />);
    for (const title of ['Button', 'IconButton', 'Badge', 'Chip / Stepper', 'Alert', 'ChipTabs', 'Form', 'Geri bildirim']) {
      expect(screen.getByText(title)).toBeTruthy();
    }
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
