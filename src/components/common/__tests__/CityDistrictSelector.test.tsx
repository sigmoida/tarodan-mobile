/**
 * İl / ilçe seçici: iki ham pageSheet yerine aranabilir `SelectSheet`. Davranış aynı:
 * il seçilince ilçe sıfırlanır, il seçilmeden ilçe açılmaz, aynı il yeniden seçilirse ilçe korunur.
 */
import React from 'react';
import { Modal } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { CityDistrictSelector } from '../CityDistrictSelector';

function setup(props: Partial<React.ComponentProps<typeof CityDistrictSelector>> = {}) {
  const onChangeCity = jest.fn();
  const onChangeDistrict = jest.fn();
  render(
    <CityDistrictSelector
      city=""
      district=""
      onChangeCity={onChangeCity}
      onChangeDistrict={onChangeDistrict}
      {...props}
    />,
  );
  return { onChangeCity, onChangeDistrict };
}

describe('CityDistrictSelector (SelectSheet)', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  it('il alanına basınca aranabilir il sheet’i açılır; seçince il yazılır, ilçe sıfırlanır', () => {
    const { onChangeCity, onChangeDistrict } = setup();
    expect(screen.queryByTestId('city-sheet')).toBeNull();
    fireEvent.press(screen.getByTestId('city-select-trigger'));
    expect(screen.getByTestId('city-sheet')).toBeTruthy();
    fireEvent.changeText(screen.getByTestId('city-sheet-search'), 'ankara');
    expect(screen.queryByText('İstanbul')).toBeNull();
    fireEvent.press(screen.getByTestId('city-sheet-option-Ankara'));
    expect(onChangeCity).toHaveBeenCalledWith('Ankara');
    expect(onChangeDistrict).toHaveBeenCalledWith('');
  });

  it('aynı il yeniden seçilirse ilçe sıfırlanmaz', () => {
    const { onChangeCity, onChangeDistrict } = setup({ city: 'Ankara', district: 'Çankaya' });
    fireEvent.press(screen.getByTestId('city-select-trigger'));
    fireEvent.press(screen.getByTestId('city-sheet-option-Ankara'));
    expect(onChangeCity).not.toHaveBeenCalled();
    expect(onChangeDistrict).not.toHaveBeenCalled();
  });

  it('il seçilmeden ilçe sheet’i açılmaz', () => {
    setup();
    fireEvent.press(screen.getByTestId('district-select-trigger'));
    expect(screen.queryByTestId('district-sheet')).toBeNull();
  });

  it('ilçe sheet’i seçili ilin ilçelerini listeler; seçim onChangeDistrict çağırır', () => {
    const { onChangeDistrict } = setup({ city: 'Ankara' });
    fireEvent.press(screen.getByTestId('district-select-trigger'));
    expect(screen.getByTestId('district-sheet')).toBeTruthy();
    fireEvent.press(screen.getByTestId('district-sheet-option-Çankaya'));
    expect(onChangeDistrict).toHaveBeenCalledWith('Çankaya');
  });

  it('Android geri tuşu açık il sheet’ini kapatır', () => {
    setup();
    fireEvent.press(screen.getByTestId('city-select-trigger'));
    const modal = screen.UNSAFE_getAllByType(Modal).find((m) => m.props.visible === true);
    expect(modal).toBeTruthy();
    act(() => {
      modal!.props.onRequestClose();
    });
    act(() => {
      jest.advanceTimersByTime(2000);
    });
    expect(screen.queryByTestId('city-sheet')).toBeNull();
  });

  it('hideDistrict iken ilçe alanı çizilmez', () => {
    setup({ hideDistrict: true });
    expect(screen.queryByTestId('district-select-trigger')).toBeNull();
  });
});
