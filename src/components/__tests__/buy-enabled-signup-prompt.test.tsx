/**
 * [D-2.7] DİKKAT: Android artık iOS gibi kapalı (CAN_BUY_DIGITAL=false iki
 * platformda; bkz. src/lib/__tests__/digitalGate.platforms.test.tsx). Bu test
 * 'satın alma AÇIK' dalını (CAN_BUY_DIGITAL mock: true) korur — IAP / Play
 * Billing eklenip kapı açılırsa geçerli olacak davranış. Metindeki 'Android'
 * ifadeleri tarihsel: 'satın alma açık platform' olarak okunmalı.
 * Android eşi (bkz. ios-signup-prompt.test.tsx): trade/collections
 * varyantlarında "Premium Ol" düğmesi Android'de DEĞİŞMEDEN kalmalı.
 */
import React from 'react';
import { render, screen } from '@testing-library/react-native';

jest.mock('@/lib/purchases', () => ({
  ...jest.requireActual('@/lib/purchases'),
  CAN_BUY_DIGITAL: true,
}));

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => false) },
}));

import { SignupPrompt } from '../SignupPrompt';

describe('Android: SignupPrompt — trade/collections varyantları', () => {
  it('trade: "Premium Ol" düğmesi yerinde', () => {
    render(<SignupPrompt visible onDismiss={jest.fn()} type="trade" />);
    expect(screen.getByText('Premium Ol')).toBeTruthy();
  });

  it('collections: "Premium Ol" düğmesi yerinde', () => {
    render(<SignupPrompt visible onDismiss={jest.fn()} type="collections" />);
    expect(screen.getByText('Premium Ol')).toBeTruthy();
  });
});
