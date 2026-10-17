/**
 * B-2.4 · Profilde salt-okunur "Kimlik bilgileri" (web `LegalIdentitySection`):
 * ad, soyad, maskeli TCKN; girilmemiş alan "Henüz girilmedi". Düzenleme yok.
 */
import React from 'react';
import { screen, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils';

jest.mock('@/lib/api', () => ({
  legalIdentityApi: { getStatus: jest.fn(), submit: jest.fn() },
}));

import { legalIdentityApi } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { LegalIdentityCard } from '../edit-profile/_components/LegalIdentityCard';

const mockGetStatus = legalIdentityApi.getStatus as jest.Mock;

beforeEach(() => {
  mockGetStatus.mockReset();
  useAuthStore.setState({ isAuthenticated: true, isLoading: false });
});

describe('B-2.4 · LegalIdentityCard', () => {
  it('kayıtlı kimliği salt-okunur ve TCKN maskeli gösterir', async () => {
    mockGetStatus.mockResolvedValue({
      data: {
        required: true,
        missing: [],
        legalFirstName: 'Ayşe Nur',
        legalLastName: 'Yılmaz',
        nationalIdMasked: '•••••••••46',
        suggestedNationalId: null,
      },
    });
    renderWithProviders(<LegalIdentityCard />);
    expect(await screen.findByText('Ayşe Nur')).toBeOnTheScreen();
    expect(screen.getByText('Yılmaz')).toBeOnTheScreen();
    expect(screen.getByText('•••••••••46')).toBeOnTheScreen();
    expect(screen.getByText('Kimlik bilgileri')).toBeOnTheScreen();
    expect(screen.queryByDisplayValue('Ayşe Nur')).toBeNull(); // input değil
  });

  it('eksik alan "Henüz girilmedi"; tam numara asla gösterilmez', async () => {
    mockGetStatus.mockResolvedValue({
      data: {
        required: true,
        missing: ['nationalId'],
        legalFirstName: 'Ayşe',
        legalLastName: 'Yılmaz',
        nationalIdMasked: null,
        suggestedNationalId: '10000000146',
      },
    });
    renderWithProviders(<LegalIdentityCard />);
    expect(await screen.findByText('Henüz girilmedi')).toBeOnTheScreen();
    expect(screen.queryByText('10000000146')).toBeNull();
  });

  it('durum alınamazsa kart çizilmez', async () => {
    mockGetStatus.mockRejectedValue({ response: { status: 404 } });
    const { queryClient } = renderWithProviders(<LegalIdentityCard />);
    await waitFor(() =>
      expect(queryClient.getQueryState(['legal-identity', 'me'])?.status).toBe('error'),
    );
    expect(screen.queryByTestId('legal-identity-card')).toBeNull();
  });
});
