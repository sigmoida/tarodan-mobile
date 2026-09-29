/**
 * Düğme verilmeyen appAlert'lerde (≈139 çağrı) varsayılan düğme sabit Türkçe
 * "Tamam" idi — İngilizce cihazda (App Review) karışık dil. Arayüz diliyle çözülür.
 */
import React from 'react';
import { act, render, screen } from '@testing-library/react-native';
import i18n from '@/i18n/config';
import { AlertDialogHost, appAlert } from '../AlertDialog';

afterAll(() => i18n.changeLanguage('tr'));

it.each([
  ['en', 'OK'],
  ['tr', 'Tamam'],
])('%s: varsayılan düğme %s', async (lang, label) => {
  await i18n.changeLanguage(lang);
  render(<AlertDialogHost />);
  act(() => appAlert('Başlık', 'Mesaj'));
  expect(await screen.findByText(label)).toBeTruthy();
});
