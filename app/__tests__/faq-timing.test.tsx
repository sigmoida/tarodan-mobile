/**
 * Parite A-3.1 · SSS'deki süreler politika değerinden (`GET /timing-rules`)
 * gelir — iade penceresi sabit 14 gün (`legalFacts.RETURN_REQUEST_DAYS`)
 * değil; hazırlık süresi sabit "3 iş günü" değil.
 */
import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => false) },
}));

jest.mock('@/lib/api', () => ({
  timingRulesApi: { getPolicy: jest.fn() },
}));
import { timingRulesApi } from '@/lib/api';
import FAQScreen from '../faq';

const policyMock = timingRulesApi.getPolicy as jest.Mock;

beforeEach(() => policyMock.mockReset());

it('iade penceresi cevabı admin değerini gösterir (30 gün)', async () => {
  policyMock.mockResolvedValue({
    data: {
      returnWindowDays: { value: 30, unit: 'days' },
      preparingDeadlineDays: { value: 5, unit: 'days' },
    },
  });
  renderWithProviders(<FAQScreen />);
  fireEvent.press(await screen.findByText('İade süresi ne kadar?'));
  expect(
    await screen.findByText('Ürün teslim tarihinden itibaren 30 gün içinde iade talebi oluşturabilirsiniz.'),
  ).toBeOnTheScreen();

  fireEvent.press(screen.getByText('Kargo süresi ne kadar?'));
  expect(screen.getByText(/^Satıcı 5 iş günü içinde kargoyu teslim eder\./)).toBeOnTheScreen();
});

it('politika yüklenemezse geri düşüş (14 gün)', async () => {
  policyMock.mockRejectedValue(new Error('offline'));
  renderWithProviders(<FAQScreen />);
  fireEvent.press(await screen.findByText('İade süresi ne kadar?'));
  expect(
    await screen.findByText('Ürün teslim tarihinden itibaren 14 gün içinde iade talebi oluşturabilirsiniz.'),
  ).toBeOnTheScreen();
});
