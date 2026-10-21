/**
 * "Show more" (`common.loadMore`) under the paged trade pickers: shown only while more pages
 * exist, locked while a page loads, and wired to the picker's `loadMore`.
 */
import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils';
import { ShowMoreButton } from '../_components/ShowMoreButton';
import { Step1MyItems, Step2TheirItems } from '../new/_components/NewTradeSteps';
import type { NewTradeController } from '../new/_hooks/useNewTrade';

jest.mock('expo-router', () => require('@/test-utils/router-mock').routerMock);

const disabled = (id: string) => !!screen.getByTestId(id).props.accessibilityState?.disabled;

describe('ShowMoreButton', () => {
  it('renders nothing once every page is loaded', () => {
    renderWithProviders(<ShowMoreButton hasMore={false} isLoadingMore={false} onPress={jest.fn()} testID="more" />);
    expect(screen.queryByTestId('more')).toBeNull();
  });

  it('shows the label and calls onPress while more pages exist', () => {
    const onPress = jest.fn();
    renderWithProviders(<ShowMoreButton hasMore isLoadingMore={false} onPress={onPress} testID="more" />);
    expect(screen.getByText('Daha fazla göster')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('more'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('is locked while the next page loads', () => {
    renderWithProviders(<ShowMoreButton hasMore isLoadingMore onPress={jest.fn()} testID="more" />);
    expect(disabled('more')).toBe(true);
  });
});

describe('new-trade steps', () => {
  const item = { id: 'p1', title: 'Ferrari', price: 100 };
  const make = (over: Partial<NewTradeController>): NewTradeController =>
    ({
      loadingMyProducts: false,
      loadingTheirProducts: false,
      myProducts: [item],
      theirProducts: [item],
      selectedMyItems: [],
      selectedTheirItems: [],
      myHasMore: true,
      theirHasMore: false,
      myLoadingMore: false,
      theirLoadingMore: false,
      loadMoreMine: jest.fn(),
      loadMoreTheirs: jest.fn(),
      cashDirection: 'offer',
      cashAmount: '',
      ...over,
    }) as unknown as NewTradeController;

  it('step 1 shows "Show more" under my listings and loads the next page', () => {
    const f = make({});
    renderWithProviders(<Step1MyItems f={f} />);
    fireEvent.press(screen.getByTestId('new-trade-my-show-more'));
    expect(f.loadMoreMine).toHaveBeenCalledTimes(1);
  });

  it('step 2 hides it when their list is complete, shows it otherwise', () => {
    const { rerender } = renderWithProviders(<Step2TheirItems f={make({})} />);
    expect(screen.queryByTestId('new-trade-their-show-more')).toBeNull();
    const f = make({ theirHasMore: true });
    rerender(<Step2TheirItems f={f} />);
    fireEvent.press(screen.getByTestId('new-trade-their-show-more'));
    expect(f.loadMoreTheirs).toHaveBeenCalledTimes(1);
  });
});
