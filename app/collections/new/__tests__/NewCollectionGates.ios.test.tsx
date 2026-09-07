/**
 * Kapsam genişletme (task-7-report.md'de gerekçeli): `PremiumGate` iOS'ta
 * yalnız TEXT'i değil, ücretli-kademe özellik listesini ve "Premium'a
 * Yükselt" düğmesini de gösteriyordu — copy rule'u metin kadar yüksek
 * sesle ihlal ediyordu. Başlık + nötr mesaj + "Geri Dön" kalır.
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

import { PremiumGate } from '../_components/NewCollectionGates';

it('iOS: ücretli kademe özellik listesi ve "Premium\'a Yükselt" düğmesi yok; başlık/mesaj/Geri kalır', () => {
  renderWithProviders(<PremiumGate />);
  expect(screen.getByText('membership.featureDigitalGarage')).toBeOnTheScreen();
  expect(screen.getByText('membership.featureUnavailableOnAccount')).toBeOnTheScreen();
  expect(screen.getByText('common.goBack')).toBeOnTheScreen();
  expect(screen.queryByText('membership.upgradeToPremium')).toBeNull();
  expect(screen.queryByText('collection.premiumFeatureUnlimited')).toBeNull();
  expect(screen.queryByText('collection.premiumFeatureShare')).toBeNull();
  expect(screen.queryByText('collection.premiumFeatureQr')).toBeNull();
  expect(screen.queryByText('collection.premiumFeatureShowcase')).toBeNull();
});
