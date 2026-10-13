/**
 * DateField iOS: spinner alttan açılan BottomSheet'te; [Vazgeç] değeri değiştirmez, [Tamam] yazar.
 */
import React from 'react';
import { Platform } from 'react-native';
import { fireEvent, render, screen, within } from '@testing-library/react-native';
import { DateField } from '@/ui';

jest.mock('@react-native-community/datetimepicker', () => {
  const { View } = jest.requireActual('react-native');
  const React = jest.requireActual('react');
  return {
    __esModule: true,
    default: (props: { onChange: (e: unknown, d?: Date) => void }) =>
      React.createElement(View, {
        testID: 'native-date-picker',
        onTouchEnd: () => props.onChange({ type: 'set' }, new Date(2001, 4, 9)),
      }),
  };
});

describe('DateField (iOS)', () => {
  it('jest platformu iOS', () => {
    expect(Platform.OS).toBe('ios');
  });

  it('dokununca sheet açılır; Tamam seçilen günü "YYYY-MM-DD" yazar', () => {
    const onChange = jest.fn();
    render(<DateField label="Doğum tarihi" value="1990-01-01" onChange={onChange} testID="birth" />);
    expect(screen.queryByTestId('birth-sheet')).toBeNull();
    fireEvent.press(screen.getByTestId('birth'));
    const sheet = screen.getByTestId('birth-sheet');
    expect(within(sheet).getByText('Doğum tarihi')).toBeTruthy();
    fireEvent(screen.getByTestId('native-date-picker'), 'touchEnd');
    // Footer sheet'in sabit alt çubuğunda.
    const footer = screen.getByTestId('birth-sheet-footer');
    fireEvent.press(within(footer).getByTestId('birth-confirm'));
    expect(onChange).toHaveBeenCalledWith('2001-05-09');
  });

  it('Vazgeç taslağı atar', () => {
    const onChange = jest.fn();
    render(<DateField label="Doğum tarihi" value="1990-01-01" onChange={onChange} testID="birth" />);
    fireEvent.press(screen.getByTestId('birth'));
    fireEvent(screen.getByTestId('native-date-picker'), 'touchEnd');
    fireEvent.press(within(screen.getByTestId('birth-sheet-footer')).getByText('Vazgeç'));
    expect(onChange).not.toHaveBeenCalled();
  });
});
