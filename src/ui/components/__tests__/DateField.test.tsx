/**
 * DateField iOS: spinner alttan açılan BottomSheet'te; [Vazgeç] değeri değiştirmez, [Tamam] yazar.
 */
import React from 'react';
import { Platform } from 'react-native';
import { fireEvent, render, screen, within } from '@testing-library/react-native';
import { DateField } from '@/ui';
import { defaultMinimumDate } from '../DateField';

// Props of the latest native picker render, so tests can assert what the wrapper sends.
let mockPickerProps: { minimumDate?: Date; maximumDate?: Date; value: Date } | null = null;

jest.mock('@react-native-community/datetimepicker', () => {
  const { View } = jest.requireActual('react-native');
  const React = jest.requireActual('react');
  return {
    __esModule: true,
    default: (props: {
      onChange: (e: unknown, d?: Date) => void;
      minimumDate?: Date;
      maximumDate?: Date;
      value: Date;
    }) => {
      mockPickerProps = props;
      return React.createElement(View, {
        testID: 'native-date-picker',
        onTouchEnd: () => props.onChange({ type: 'set' }, new Date(2001, 4, 9)),
      });
    },
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

describe('defaultMinimumDate', () => {
  it('is today minus 100 years at local start of day (web DatePicker window)', () => {
    const min = defaultMinimumDate(new Date(2026, 9, 19, 15, 30));
    expect(min).toEqual(new Date(1926, 9, 19));
  });
});

describe.each(['android', 'ios'] as const)('DateField minimumDate (%s)', (os) => {
  beforeEach(() => {
    mockPickerProps = null;
    jest.replaceProperty(Platform, 'OS', os);
  });
  afterEach(() => jest.restoreAllMocks());

  const openPicker = (props: Partial<React.ComponentProps<typeof DateField>>) => {
    render(<DateField label="Birth" onChange={jest.fn()} testID="birth" {...props} />);
    fireEvent.press(screen.getByTestId('birth'));
    expect(mockPickerProps).not.toBeNull();
    return mockPickerProps!;
  };

  it('sends the default minimum when the caller gives none (Android pre-1970 clamp)', () => {
    const maximumDate = new Date(2008, 0, 1);
    const picker = openPicker({ maximumDate });
    expect(picker.minimumDate).toEqual(defaultMinimumDate());
    expect(picker.minimumDate!.getTime()).toBeLessThan(new Date(1970, 0, 1).getTime());
    expect(picker.maximumDate).toBe(maximumDate);
  });

  it('keeps an explicit minimum', () => {
    const minimumDate = new Date(2020, 5, 1);
    expect(openPicker({ minimumDate }).minimumDate).toBe(minimumDate);
  });

  it('opens on a pre-1970 value and keeps it', () => {
    const picker = openPicker({ value: '1950-03-07', maximumDate: new Date(2008, 0, 1) });
    expect(picker.value).toEqual(new Date(1950, 2, 7));
  });
});

describe('DateField pre-1970 round trip (iOS)', () => {
  it('shows a 1950 value and writes the same day back on confirm', () => {
    const onChange = jest.fn();
    render(<DateField label="Birth" value="1950-03-07" onChange={onChange} testID="birth" />);
    fireEvent.press(screen.getByTestId('birth'));
    fireEvent.press(within(screen.getByTestId('birth-sheet-footer')).getByTestId('birth-confirm'));
    expect(onChange).toHaveBeenCalledWith('1950-03-07');
  });
});
