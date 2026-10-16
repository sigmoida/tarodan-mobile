/**
 * Eşleşmeyen rota: kabuksuz "Unmatched Route" yerine PageShell + boş durum +
 * ana sayfaya dönüş (sekme köküne `dismissTo` — ikinci `(tabs)` yok).
 */
import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import i18n from '@/i18n/config';
import { renderWithProviders } from '@/test-utils';
import { dismissToMock } from '@/test-utils/router-mock';

jest.mock('expo-router', () => jest.requireActual('@/test-utils/router-mock').routerMock);

import NotFoundScreen from '../+not-found';

it('boş durum + "Ana sayfaya git" sekme köküne döner', async () => {
  await i18n.changeLanguage('tr');
  renderWithProviders(<NotFoundScreen />);
  expect(screen.getByTestId('not-found-empty')).toBeOnTheScreen();
  expect(screen.getByText(i18n.t('error.pageNotFound'))).toBeOnTheScreen();
  fireEvent.press(screen.getByText(i18n.t('error.goHome')));
  expect(dismissToMock).toHaveBeenCalledWith('/(tabs)');
});
