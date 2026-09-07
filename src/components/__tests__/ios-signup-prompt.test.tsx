/**
 * iOS: `SignupPrompt`'un `trade`/`collections` varyantları — "Premium Ol"
 * birincil düğmesi ve "premium üye olmanız gerekiyor" açıklaması Guideline
 * 3.1.1 ihlaliydi (IMPORTANT 4, final code review). Gerçek (mock'lanmamış)
 * `react-i18next` kullanılıyor. Android eşi: android-signup-prompt.test.tsx.
 */
import React from 'react';
import { render, screen } from '@testing-library/react-native';

jest.mock('@/lib/purchases', () => ({
  ...jest.requireActual('@/lib/purchases'),
  CAN_BUY_DIGITAL: false,
}));

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => false) },
}));

import { SignupPrompt } from '../SignupPrompt';

describe('iOS: SignupPrompt — trade/collections varyantları', () => {
  it('trade: "Premium Ol" düğmesi ve tier adı yok; kayıt düğmesi çalışır', () => {
    render(<SignupPrompt visible onDismiss={jest.fn()} type="trade" />);
    expect(screen.queryByText('Premium Ol')).toBeNull();
    expect(screen.queryByText(/premium üye/i)).toBeNull();
    // Kayıt amacı hâlâ çalışıyor.
    expect(screen.getByText('Üye Ol')).toBeTruthy();
  });

  it('collections: "Premium Ol" düğmesi ve tier adı yok', () => {
    render(<SignupPrompt visible onDismiss={jest.fn()} type="collections" />);
    expect(screen.queryByText('Premium Ol')).toBeNull();
    expect(screen.queryByText(/premium üye/i)).toBeNull();
    expect(screen.getByText('Üye Ol')).toBeTruthy();
  });
});
