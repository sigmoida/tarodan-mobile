/**
 * Geri okunun ÖLÜ olmadığını çivileyen test.
 *
 * Taban `ScreenHeader` (`@/ui`) oku her zaman çizer ama `disabled={!onBack}`
 * der. 16 ekran `onBack` geçmiyordu; ok görünüyor, basılıyor, hiçbir şey
 * olmuyordu — kullanıcı ekranda kilitli kalıyordu (dil ayarlarında elle
 * yakalandı). Uygulama sarmalayıcısı varsayılanı `router.back()` yapıyor.
 */
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { ScreenHeader } from '../ScreenHeader';

const mockBack = jest.fn();
let mockCanGoBack = true;

jest.mock('expo-router', () => ({
  router: {
    back: () => mockBack(),
    canGoBack: () => mockCanGoBack,
  },
}));

beforeEach(() => {
  mockBack.mockClear();
  mockCanGoBack = true;
});

describe('ScreenHeader — geri oku', () => {
  it('onBack geçilmese de geri gider (asıl kusur buydu)', () => {
    render(<ScreenHeader title="Dil" />);
    fireEvent.press(screen.getByLabelText('Geri'));
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('ekranın kendi onBack’i varsa router’a DOKUNMAZ', () => {
    const own = jest.fn();
    render(<ScreenHeader title="Dil" onBack={own} />);
    fireEvent.press(screen.getByLabelText('Geri'));
    expect(own).toHaveBeenCalledTimes(1);
    expect(mockBack).not.toHaveBeenCalled();
  });

  it('geri gidilecek yer yoksa ok devre dışı kalır — sahte bir söz verilmez', () => {
    mockCanGoBack = false;
    render(<ScreenHeader title="Dil" />);
    fireEvent.press(screen.getByLabelText('Geri'));
    expect(mockBack).not.toHaveBeenCalled();
  });
});
