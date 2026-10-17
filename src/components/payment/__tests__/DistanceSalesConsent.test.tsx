import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
import { router } from 'expo-router';
import { DistanceSalesConsent } from '../DistanceSalesConsent';

beforeEach(() => jest.clearAllMocks());

it('kutu `@/ui` Checkbox: durum erişilebilirlikte, dokununca onToggle', () => {
  const onToggle = jest.fn();
  renderWithProviders(<DistanceSalesConsent testID="box" checked={false} onToggle={onToggle} />);
  const box = screen.getByTestId('box');
  expect(box.props.accessibilityRole).toBe('checkbox');
  expect(box.props.accessibilityState).toMatchObject({ checked: false });
  fireEvent.press(box);
  expect(onToggle).toHaveBeenCalledTimes(1);
  expect(screen.getByText('Mesafeli Satış Sözleşmesi')).toBeOnTheScreen();
});

it('metindeki sözleşme adı sözleşme sayfasını açar, onayı değiştirmez; "Sözleşmeyi oku" yok', () => {
  const onToggle = jest.fn();
  renderWithProviders(<DistanceSalesConsent checked onToggle={onToggle} />);
  expect(screen.queryByText('Sözleşmeyi oku')).toBeNull();
  fireEvent.press(screen.getByTestId('distance-sales-link'));
  expect(router.push).toHaveBeenCalledWith('/distance-sales');
  expect(onToggle).not.toHaveBeenCalled();
});

it('işaretliyken Checkbox işaretli görünür', () => {
  renderWithProviders(<DistanceSalesConsent testID="box" checked onToggle={jest.fn()} />);
  expect(screen.getByTestId('box').props.accessibilityState).toMatchObject({ checked: true });
});
