/**
 * Ortak kopyala düğmesi (web `components/ui/CopyButton` karşılığı) + tek pano
 * yardımcısı `@/lib/clipboard`. RN çekirdek `Clipboard` mock'lanır.
 */
import React from 'react';
import { Clipboard } from 'react-native';
import { act, fireEvent, screen } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils';
import { theme, toast } from '@/ui';
import { copyToClipboard } from '@/lib/clipboard';
import { CopyButton, COPY_CONFIRM_MS } from '../CopyButton';

const setString = jest.fn();

beforeEach(() => {
  setString.mockReset();
  jest.spyOn(Clipboard, 'setString').mockImplementation(setString);
  jest.spyOn(toast, 'success').mockImplementation(() => 1);
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});

describe('copyToClipboard', () => {
  it('değeri RN Clipboard ile panoya yazar', () => {
    expect(copyToClipboard('79174212154116')).toBe(true);
    expect(setString).toHaveBeenCalledWith('79174212154116');
  });

  it('boş değeri yazmaz', () => {
    expect(copyToClipboard('')).toBe(false);
    expect(copyToClipboard(null)).toBe(false);
    expect(setString).not.toHaveBeenCalled();
  });

  it('native modül hata verirse false döner (çökmez)', () => {
    setString.mockImplementation(() => {
      throw new Error('no native module');
    });
    expect(copyToClipboard('x')).toBe(false);
  });
});

describe('CopyButton', () => {
  it('basınca kopyalar, toast gösterir, 1,5 sn tik sonra panoya döner', () => {
    jest.useFakeTimers();
    renderWithProviders(<CopyButton testID="copy" value="PKG-1" successMessage="Kopyalandı!" />);

    const btn = screen.getByTestId('copy');
    expect(btn.props.accessibilityLabel).toBe('Kopyala');
    expect(screen.UNSAFE_queryAllByProps({ color: theme.colors.success[600] })).toHaveLength(0);

    fireEvent.press(btn);
    expect(setString).toHaveBeenCalledWith('PKG-1');
    expect(toast.success).toHaveBeenCalledWith('Kopyalandı!');
    // Onay: ikon success renginde (tik).
    expect(screen.UNSAFE_queryAllByProps({ color: theme.colors.success[600] }).length).toBeGreaterThan(0);

    act(() => {
      jest.advanceTimersByTime(COPY_CONFIRM_MS);
    });
    expect(screen.UNSAFE_queryAllByProps({ color: theme.colors.success[600] })).toHaveLength(0);
  });

  it('pano yazılamazsa toast göstermez', () => {
    setString.mockImplementation(() => {
      throw new Error('no native module');
    });
    renderWithProviders(<CopyButton testID="copy" value="PKG-1" successMessage="Kopyalandı!" />);
    fireEvent.press(screen.getByTestId('copy'));
    expect(toast.success).not.toHaveBeenCalled();
  });
});
