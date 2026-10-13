/**
 * İlan formu seçicileri (`PickerModal`) artık `SelectSheet` üstünde: arama sheet içinde,
 * Android geri tuşu (`onRequestClose`) kapatır, seçim `onSelect(item)` + kapanış.
 */
import React from 'react';
import { Modal } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { PickerModal } from '../_components/PickerModal';

const BRANDS = [
  { id: 'b1', name: 'Hot Wheels' },
  { id: 'b2', name: 'Matchbox' },
  { id: 'b3', name: 'Majorette' },
];

function setup(overrides: Partial<React.ComponentProps<typeof PickerModal>> = {}) {
  const onClose = jest.fn();
  const onSelect = jest.fn();
  render(
    <PickerModal
      visible
      onClose={onClose}
      title="Marka seç"
      data={BRANDS}
      onSelect={onSelect}
      selectedId="b2"
      keyExtractor={(b: { id: string }) => b.id}
      labelExtractor={(b: { name: string }) => b.name}
      testID="picker-brand"
      {...overrides}
    />,
  );
  return { onClose, onSelect };
}

describe('PickerModal (SelectSheet)', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  it('seçili satır işaretli; satıra basınca onSelect(item) ve kapanır', () => {
    const { onClose, onSelect } = setup();
    expect(screen.getByText('Marka seç')).toBeTruthy();
    expect(screen.getByTestId('picker-brand-option-b2').props.accessibilityState).toMatchObject({ checked: true });
    fireEvent.press(screen.getByText('Majorette'));
    expect(onSelect).toHaveBeenCalledWith(BRANDS[2]);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('Android geri tuşu (onRequestClose) sheet’i kapatır', () => {
    const { onClose } = setup();
    screen.UNSAFE_getByType(Modal).props.onRequestClose();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('onSearchChange verilince aranabilir; harf duyarsız süzer, boş sonuçta özel boş metin', () => {
    setup({ searchValue: '', onSearchChange: jest.fn(), emptyText: 'Marka bulunamadı' });
    fireEvent.changeText(screen.getByTestId('picker-brand-search'), 'ma');
    expect(screen.getByText('Matchbox')).toBeTruthy();
    expect(screen.getByText('Majorette')).toBeTruthy();
    expect(screen.queryByText('Hot Wheels')).toBeNull();
    fireEvent.changeText(screen.getByTestId('picker-brand-search'), 'zzz');
    expect(screen.getByText('Marka bulunamadı')).toBeTruthy();
  });

  it('arama verilmediyse arama kutusu çizilmez', () => {
    setup();
    expect(screen.queryByTestId('picker-brand-search')).toBeNull();
  });

  it('loading iken spinner, liste yok', () => {
    setup({ loading: true });
    expect(screen.getByTestId('picker-brand-loading')).toBeTruthy();
    expect(screen.queryByText('Matchbox')).toBeNull();
  });

  it('yüzlerce satırda sabit satır yüksekliğiyle getItemLayout verilir', () => {
    const many = Array.from({ length: 400 }, (_, i) => ({ id: `m${i}`, name: `Model ${i}` }));
    setup({ data: many, selectedId: '' });
    const getItemLayout = screen.getByTestId('picker-brand-list').props.getItemLayout as (
      d: unknown,
      i: number,
    ) => { length: number };
    expect(getItemLayout(null, 399).length).toBe(48);
  });

  it('kapalıyken içerik bağlanmaz', () => {
    setup({ visible: false });
    expect(screen.queryByText('Marka seç')).toBeNull();
  });
});
