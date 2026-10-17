/**
 * Koleksiyona ürün ekle — ilan satırının seçim kutusu: standart `CheckboxIndicator`, erişilebilir
 * checkbox rolü, ≥ 44pt dokunma alanı; kutu ekle/çıkar yapar, sol blok ürüne gider.
 */
import React from 'react';
import { screen, fireEvent } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils';
import { CheckboxIndicator, theme } from '@/ui';
import { ListingPickerRow } from '../add-items/_components/ListingPickerRow';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ router: { push: (...a: unknown[]) => mockPush(...a) } }));

const listing = {
  id: 'l-1',
  title: 'Çok uzun bir ilan başlığı '.repeat(6),
  price: 1250,
  status: 'active',
  images: [{ url: 'https://example.com/a.jpg' }],
};

describe('ListingPickerRow', () => {
  beforeEach(() => mockPush.mockClear());

  it('seçili değil: boş kutu, checkbox rolü, 44pt dokunma alanı; dokununca onToggle', () => {
    const onToggle = jest.fn();
    renderWithProviders(<ListingPickerRow listing={listing} added={false} busy={false} onToggle={onToggle} />);

    const toggle = screen.getByTestId('add-items-toggle-l-1');
    expect(toggle.props.accessibilityRole).toBe('checkbox');
    expect(toggle.props.accessibilityState).toMatchObject({ checked: false });
    const slop = toggle.props.hitSlop;
    expect(20 + slop * 2).toBeGreaterThanOrEqual(theme.minTouchTarget);
    expect(screen.UNSAFE_getByType(CheckboxIndicator).props).toMatchObject({ checked: false, size: 20 });

    fireEvent.press(toggle);
    expect(onToggle).toHaveBeenCalledWith(listing);
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('seçili: dolu kutu; etiket sabit (durum accessibilityState ile), sol blok etiket + ipucu taşır', () => {
    renderWithProviders(<ListingPickerRow listing={listing} added busy={false} onToggle={jest.fn()} />);

    const toggle = screen.getByTestId('add-items-toggle-l-1');
    expect(toggle.props.accessibilityState).toMatchObject({ checked: true });
    expect(toggle.props.accessibilityLabel).toBe(`Koleksiyona Ekle: ${listing.title}`);
    expect(screen.UNSAFE_getByType(CheckboxIndicator).props.checked).toBe(true);
    const open = screen.getByLabelText(listing.title);
    expect(open.props.accessibilityHint).toBe('Ürün sayfasını açar');
  });

  it('bekleyen istek: kutu yerine yükleme göstergesi, dokunuş yok sayılır', () => {
    const onToggle = jest.fn();
    renderWithProviders(<ListingPickerRow listing={listing} added busy onToggle={onToggle} />);

    const toggle = screen.getByTestId('add-items-toggle-l-1');
    expect(toggle.props.accessibilityState).toMatchObject({ checked: true, disabled: true, busy: true });
    expect(screen.UNSAFE_queryByType(CheckboxIndicator)).toBeNull();
    expect(screen.getByLabelText('Yükleniyor')).toBeOnTheScreen();
    fireEvent.press(toggle);
    expect(onToggle).not.toHaveBeenCalled();
  });

  it('uzun başlık iki satırla kırpılır; sol blok ürüne gider', () => {
    renderWithProviders(<ListingPickerRow listing={listing} added={false} busy={false} onToggle={jest.fn()} />);
    const title = screen.getByText(listing.title);
    expect(title.props.numberOfLines).toBe(2);
    fireEvent.press(title);
    expect(mockPush).toHaveBeenCalledWith('/product/l-1');
  });
});
