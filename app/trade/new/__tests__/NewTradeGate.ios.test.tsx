/**
 * Kapsam genişletme (task-7-report.md'de gerekçeli): `NewTradeGate` iOS'ta
 * yalnız TEXT'i değil, ücretli-kademe özellik listesini ve yükseltme
 * düğmesini de gösteriyordu — copy rule'u metin kadar yüksek sesle ihlal
 * ediyordu. Başlık + nötr mesaj + "Geri Dön" kalır.
 */
jest.mock('@/lib/purchases', () => ({
  ...jest.requireActual('@/lib/purchases'),
  CAN_BUY_DIGITAL: false,
}));

import React from 'react';
import { screen } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils';

jest.mock('expo-router', () => require('@/test-utils/router-mock').routerMock);
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));

import { NewTradeGate } from '../_components/NewTradeGate';

const notPremiumController = { canTrade: false, isAuthenticated: true } as any;

it('iOS: ücretli kademe özellik listesi ve yükseltme düğmesi yok; başlık/mesaj/Geri kalır', () => {
  renderWithProviders(<NewTradeGate f={notPremiumController} />);
  expect(screen.getByText('trade.featureTitle')).toBeOnTheScreen();
  expect(screen.getByText('membership.featureUnavailableOnAccount')).toBeOnTheScreen();
  expect(screen.getByText('common.goBack')).toBeOnTheScreen();
  expect(screen.queryByText('membership.title')).toBeNull();
  expect(screen.queryByText('trade.premiumFeatureCreate')).toBeNull();
  expect(screen.queryByText('trade.premiumFeatureCounter')).toBeNull();
  expect(screen.queryByText('trade.premiumFeatureCash')).toBeNull();
  expect(screen.queryByText('trade.premiumFeatureProtection')).toBeNull();
});
