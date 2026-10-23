/**
 * Add items to a collection: when the seller's listings or the collection fail to load on the
 * first read, the screen shows ErrorState with a retry instead of "no active listings" (which
 * would push the seller to create a listing they already have).
 */
import React from 'react';
import { screen, fireEvent } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils';

jest.mock('expo-router', () => ({
  ...jest.requireActual<typeof import('@/test-utils/router-mock')>('@/test-utils/router-mock').routerMock,
  useLocalSearchParams: () => ({ id: 'c1' }),
}));

jest.mock('@/lib/api', () => ({
  productsApi: { getMyListings: jest.fn() },
  collectionsApi: { getOne: jest.fn(), addItem: jest.fn(), removeItem: jest.fn() },
}));

import { collectionsApi, productsApi } from '@/lib/api';
import AddCollectionItemsScreen from '../add-items';

const getMyListings = productsApi.getMyListings as jest.Mock;
const getOne = collectionsApi.getOne as jest.Mock;

beforeEach(() => {
  getMyListings.mockReset().mockResolvedValue({ data: { data: [] } });
  getOne.mockReset().mockResolvedValue({ data: { items: [] } });
});

describe('add items to a collection: load states', () => {
  it('no active listings: the empty state with the create-listing action', async () => {
    renderWithProviders(<AddCollectionItemsScreen />);
    expect(await screen.findByText('Eklenebilecek aktif ilanın yok')).toBeOnTheScreen();
  });

  it('listings fail to load: the error state with a retry, not the empty state', async () => {
    getMyListings.mockRejectedValueOnce(new Error('network'));
    renderWithProviders(<AddCollectionItemsScreen />);
    expect(await screen.findByText('Bir şeyler ters gitti')).toBeOnTheScreen();
    expect(screen.queryByText('Eklenebilecek aktif ilanın yok')).toBeNull();
    fireEvent.press(screen.getByText('Tekrar Dene'));
    expect(await screen.findByText('Eklenebilecek aktif ilanın yok')).toBeOnTheScreen();
    expect(getOne).toHaveBeenCalledTimes(1);
  });

  it('the collection fails to load: the error state too (rows would claim "not added")', async () => {
    getMyListings.mockResolvedValue({ data: { data: [{ id: 'l1', title: 'Model', status: 'active' }] } });
    getOne.mockRejectedValueOnce(new Error('network'));
    renderWithProviders(<AddCollectionItemsScreen />);
    expect(await screen.findByText('Bir şeyler ters gitti')).toBeOnTheScreen();
    expect(screen.queryByText('Model')).toBeNull();
    fireEvent.press(screen.getByText('Tekrar Dene'));
    expect(await screen.findByText('Model')).toBeOnTheScreen();
  });
});
