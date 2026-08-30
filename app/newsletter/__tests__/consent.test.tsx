/**
 * P2 #12 — bülten aboneliğinde açık rıza.
 *
 * Ekran hiç onay kutusu göstermiyordu; `newsletter: true` sabit gidiyordu, yani
 * kullanıcıdan KVKK/ETK rızası ALINMADAN abone ediliyordu.
 *
 * ÖLÇÜM (2026-08-11): sunucu "ikisi de false → 400" kuralını UYGULAMIYOR —
 * yalnız `email` zorunlu ve `newsletter: false` ile bile abonelik başarılı
 * dönüyor. Yani kapı tamamen istemci tarafında; sunucuya güvenilemez.
 */
import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils';

jest.mock('expo-router', () => require('@/test-utils/router-mock').routerMock);

jest.mock('@/lib/api', () => ({
  guestApi: { post: jest.fn(() => Promise.resolve({ data: {} })) },
}));

import { guestApi } from '@/lib/api';
import NewsletterScreen from '../index';

const typeEmail = () =>
  fireEvent.changeText(screen.getByTestId('newsletter-email'), 'a@b.com');

describe('Bülten · açık rıza', () => {
  beforeEach(() => {
    (guestApi.post as jest.Mock).mockClear();
  });

  it('onay kutusu İŞARETSİZ başlar', () => {
    renderWithProviders(<NewsletterScreen />);
    expect(screen.getByTestId('newsletter-consent').props.accessibilityState.checked).toBe(false);
  });

  it('onay verilmeden abone olunamaz', async () => {
    renderWithProviders(<NewsletterScreen />);
    typeEmail();

    expect(screen.getByTestId('newsletter-submit')).toBeDisabled();
    await waitFor(() => expect(guestApi.post).not.toHaveBeenCalled());
  });

  it('onay verilince istek gider ve rıza gövdede taşınır', async () => {
    renderWithProviders(<NewsletterScreen />);
    typeEmail();
    fireEvent.press(screen.getByTestId('newsletter-consent'));

    await waitFor(() => expect(screen.getByTestId('newsletter-submit')).not.toBeDisabled());
    fireEvent.press(screen.getByTestId('newsletter-submit'));

    await waitFor(() => expect(guestApi.post).toHaveBeenCalled());
    const [, body] = (guestApi.post as jest.Mock).mock.calls[0];
    expect(body).toMatchObject({ email: 'a@b.com', newsletter: true });
  });
});
