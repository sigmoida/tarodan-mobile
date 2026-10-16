/** Hiç grup yoksa (savunma: Keşfet sabit olduğundan normalde olmaz) tek EmptyState gösterilir. */
import React from 'react';
import { render, screen } from '@testing-library/react-native';

jest.mock('expo-router', () => jest.requireActual('@/test-utils/router-mock').routerMock);
jest.mock('../_hooks/useCategoriesScreen', () => ({
  useCategoriesScreen: () => ({
    groups: [],
    group: null,
    title: '',
    tiles: [],
    canGoBack: false,
    parentTitle: '',
    isLoading: false,
    isRefetching: false,
    refetchAll: jest.fn(),
    retryGroup: jest.fn(),
    selectGroup: jest.fn(),
    back: jest.fn(),
    pressTile: jest.fn(),
    openHref: jest.fn(),
  }),
}));

import CategoriesScreen from '../index';

it('tamamen boş: EmptyState (ray ve ızgara yok)', () => {
  render(<CategoriesScreen />);
  expect(screen.getByTestId('empty-state')).toBeTruthy();
  expect(screen.getByText('Kategori bulunamadı')).toBeTruthy();
  expect(screen.queryByTestId('categories-rail')).toBeNull();
});
