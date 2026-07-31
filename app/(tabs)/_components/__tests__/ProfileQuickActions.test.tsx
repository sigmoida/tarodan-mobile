/**
 * I2 regresyonu: "Kurumsal Başvuru" hızlı erişim öğesi yalnızca kurumsal
 * hesaplarda (companyName + taxId) görünmeli. Bireysel kullanıcılarda tıklayınca
 * useBusinessApplication 400/404 alıyor ve üç boş sekme gösteriliyordu.
 */
import React from 'react';
import { screen } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils';
import { ProfileQuickActions } from '../ProfileSections';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

it('bireysel hesapta "Kurumsal Başvuru" öğesini göstermez', () => {
  renderWithProviders(<ProfileQuickActions isBusiness={false} />);
  expect(screen.queryByTestId('settings-business-application')).toBeNull();
});

it('kurumsal hesapta "Kurumsal Başvuru" öğesini gösterir', () => {
  renderWithProviders(<ProfileQuickActions isBusiness />);
  expect(screen.getByTestId('settings-business-application')).toBeTruthy();
});
