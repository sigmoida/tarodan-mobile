/**
 * Listing edit route: the `[id]` param may be a `<slug>-<uuid>` segment; the form gets the bare uuid.
 */
import React from 'react';
import { screen } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils';

const PRODUCT_ID = '0b1e5c1a-7d2f-4e3a-9c4b-5d6e7f8a9b0c';
let mockRouteId: string | undefined = PRODUCT_ID;

jest.mock('expo-router', () => ({
  ...jest.requireActual<typeof import('@/test-utils/router-mock')>('@/test-utils/router-mock').routerMock,
  useLocalSearchParams: () => ({ id: mockRouteId }),
}));

const mockForm = jest.fn((_props: { mode: string; productId?: string }) => null);
jest.mock('@/components/listing/ListingForm', () => ({
  __esModule: true,
  default: (props: { mode: string; productId?: string }) => mockForm(props),
}));

import EditListingScreen from '../edit';

beforeEach(() => {
  mockForm.mockClear();
  mockRouteId = PRODUCT_ID;
});

describe('listing edit route', () => {
  it.each([
    ['a bare uuid', PRODUCT_ID],
    ['a slug-uuid segment', `ferrari-f40-${PRODUCT_ID}`],
    ['an upper-case uuid', PRODUCT_ID.toUpperCase()],
  ])('%s: the form gets the bare uuid', (_label, segment) => {
    mockRouteId = segment;
    renderWithProviders(<EditListingScreen />);
    expect(mockForm).toHaveBeenCalledWith({ mode: 'edit', productId: PRODUCT_ID });
  });

  it('shows "not found" and does not mount the form without a listing uuid', async () => {
    mockRouteId = 'garbage';
    renderWithProviders(<EditListingScreen />);
    expect(await screen.findByText('Ürün bulunamadı')).toBeOnTheScreen();
    expect(mockForm).not.toHaveBeenCalled();
  });
});
