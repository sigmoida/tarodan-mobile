import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils/render';
import UsernameScreen from '../index';
import { userApi } from '@/lib/api';

jest.mock('@/lib/api', () => ({
  userApi: { claimUsername: jest.fn(() => Promise.resolve({ data: { username: 'kaan.merakli', usernameClaimed: true } })) },
}));

jest.mock('expo-router', () => ({ router: { back: jest.fn() } }));

const mockUser = { username: '', usernameClaimed: false };
jest.mock('@/stores/authStore', () => ({
  useAuthStore: (sel?: (state: any) => unknown) => {
    const state: any = ({ user: mockUser, updateUser: jest.fn() });
    return sel ? sel(state) : state;
  },
}));

// Not: brief testi düz `render` ile yazıyordu; useClaimUsername useMutation kullandığı
// için QueryClientProvider gerekiyor (aksi halde "No QueryClient set" hatası). Repo'nun
// kendi test-utils yardımcısı (`renderWithProviders`) kullanıldı — assertion/testID'ler aynı.
const renderScreen = () => renderWithProviders(<UsernameScreen />);

describe('Kullanıcı adı talebi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUser.username = '';
    mockUser.usernameClaimed = false;
  });

  it('kalıcı olduğu açıkça yazılır', () => {
    const { getByTestId } = renderScreen();
    expect(getByTestId('username-permanent-warning')).toBeTruthy();
  });

  it('geçersiz kullanıcı adı gönderilmez', async () => {
    const { getByTestId } = renderScreen();
    fireEvent.changeText(getByTestId('username-input'), 'AA');
    fireEvent.press(getByTestId('username-submit'));
    await waitFor(() => expect(userApi.claimUsername).not.toHaveBeenCalled());
  });

  it('geçerli kullanıcı adı gönderilir', async () => {
    const { getByTestId } = renderScreen();
    fireEvent.changeText(getByTestId('username-input'), 'kaan.merakli');
    fireEvent.press(getByTestId('username-submit'));
    await waitFor(() => expect(userApi.claimUsername).toHaveBeenCalledWith('kaan.merakli'));
  });

  // §5 yakınsaması: kural artık `@/utils/validation`'daki tek `usernameSchema`.
  // Karışık büyük/küçük giriş ALANDA küçük harfe çevrilir — kullanıcı kalıcı
  // handle'ını gördüğü gibi gönderir (sessiz dönüşüm yok).
  it('karışık büyük/küçük giriş alanda küçük harfe çevrilir ve öyle gönderilir', async () => {
    const { getByTestId } = renderScreen();
    const input = getByTestId('username-input');
    fireEvent.changeText(input, 'Kaan.Merakli');
    expect(input.props.value).toBe('kaan.merakli');

    fireEvent.press(getByTestId('username-submit'));
    await waitFor(() => expect(userApi.claimUsername).toHaveBeenCalledWith('kaan.merakli'));
  });

  it('kullanıcı adı alınmışsa form gösterilmez', () => {
    mockUser.username = 'kaan.merakli';
    mockUser.usernameClaimed = true;
    const { queryByTestId, getByTestId } = renderScreen();
    expect(queryByTestId('username-input')).toBeNull();
    expect(getByTestId('username-claimed')).toBeTruthy();
  });
});
