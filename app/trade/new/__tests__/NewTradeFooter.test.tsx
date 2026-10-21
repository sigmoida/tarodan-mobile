/**
 * Takas teklifi sihirbazının sabit alt barı: ilan yokken bar yok; seçim yokken ilerleme/gönderme pasif
 * (API en az 1 teklif edilen + 1 istenen ürün ister — CreateTradeDto ArrayMinSize(1)).
 */
import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils';
import { NewTradeFooter, newTradeFooterVisible } from '../_components/NewTradeSteps';
import type { NewTradeController } from '../_hooks/useNewTrade';

jest.mock('expo-router', () => require('@/test-utils/router-mock').routerMock);

const item = { id: 'p1', title: 'Ferrari', price: 100 };
const make = (over: Partial<NewTradeController>): NewTradeController =>
  ({
    step: 1,
    setStep: jest.fn(),
    loadingMyProducts: false,
    myProducts: [item],
    selectedMyItems: [],
    selectedTheirItems: [],
    handleSubmit: jest.fn(),
    goToReview: jest.fn(),
    submitPending: false,
    ...over,
  }) as unknown as NewTradeController;

const disabled = (id: string) => !!screen.getByTestId(id).props.accessibilityState?.disabled;

describe('NewTradeFooter', () => {
  it('1. adımda ilan yoksa (ya da yükleniyorsa) alt bar çizilmez; diğer adımlarda hep var', () => {
    expect(newTradeFooterVisible(make({ myProducts: [] }))).toBe(false);
    expect(newTradeFooterVisible(make({ loadingMyProducts: true }))).toBe(false);
    expect(newTradeFooterVisible(make({}))).toBe(true);
    expect(newTradeFooterVisible(make({ step: 2, myProducts: [] }))).toBe(true);
  });

  it('1. adım: 0 seçiliyken "Devam" pasif, seçim olunca 2. adıma geçer', () => {
    const f = make({});
    const { rerender } = renderWithProviders(<NewTradeFooter f={f} />);
    expect(disabled('new-trade-step1-continue')).toBe(true);
    const g = make({ selectedMyItems: [item] as never });
    rerender(<NewTradeFooter f={g} />);
    expect(disabled('new-trade-step1-continue')).toBe(false);
    fireEvent.press(screen.getByTestId('new-trade-step1-continue'));
    expect(g.setStep).toHaveBeenCalledWith(2);
  });

  it('3. adım: teklif edilen ürün yoksa gönder pasif', () => {
    renderWithProviders(<NewTradeFooter f={make({ step: 3, selectedTheirItems: [item] as never })} />);
    expect(disabled('new-trade-submit')).toBe(true);
  });

  it('step 2: "Continue" goes through the controller guard (blocked while the cash is refused)', () => {
    const f = make({ step: 2, selectedTheirItems: [item] as never });
    renderWithProviders(<NewTradeFooter f={f} />);
    fireEvent.press(screen.getByTestId('new-trade-step2-continue'));
    expect(f.goToReview).toHaveBeenCalledTimes(1);
    expect(f.setStep).not.toHaveBeenCalled();
  });
});
