import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
import { router } from 'expo-router';
import { DistanceSalesConsent } from '../DistanceSalesConsent';

beforeEach(() => jest.clearAllMocks());

it('kutu durumu erişilebilirlikte, dokununca onToggle', () => {
  const onToggle = jest.fn();
  renderWithProviders(<DistanceSalesConsent testID="box" checked={false} onToggle={onToggle} />);
  const box = screen.getByTestId('box');
  expect(box.props.accessibilityState).toEqual({ checked: false });
  fireEvent.press(box);
  expect(onToggle).toHaveBeenCalledTimes(1);
  expect(screen.getByText('Mesafeli satış sözleşmesini okudum ve onaylıyorum')).toBeOnTheScreen();
});

it('"Sözleşmeyi oku" mesafeli satış sözleşmesi sayfasını açar', () => {
  renderWithProviders(<DistanceSalesConsent checked onToggle={jest.fn()} />);
  fireEvent.press(screen.getByText('Sözleşmeyi oku'));
  expect(router.push).toHaveBeenCalledWith('/distance-sales');
});
