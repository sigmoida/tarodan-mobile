/**
 * "Save this search" on the search screen (contract delta 2026-10-21-saved-searches): the button is
 * disabled for an empty search, a guest gets the sign-in prompt, the modal is prefilled with the
 * shared default name and saves the canonical query with its display-name labels, and the refusals
 * are told apart by `errorCode` (409 duplicate toast, 403 limit alert with the server `limit` and NO
 * upgrade button, a ban 403 adds nothing). The modal closes before the save fires.
 */
import React from 'react';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils';
import { resetRouterMocks, pushMock } from '@/test-utils/router-mock';
import { appAlert, toast } from '@/ui';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('@/ui', () => ({
  ...jest.requireActual('@/ui'),
  appAlert: jest.fn(),
  toast: Object.assign(jest.fn(), { success: jest.fn(), error: jest.fn(), dismiss: jest.fn() }),
}));

const mockParams: { current: Record<string, string> } = { current: {} };
jest.mock('expo-router', () => ({
  ...jest.requireActual('@/test-utils/router-mock').routerMock,
  useLocalSearchParams: () => mockParams.current,
}));

jest.mock('@/lib/api', () => ({
  productsApi: { getAll: jest.fn(async () => ({ data: { items: [], meta: { page: 1, totalPages: 1, total: 0 } } })) },
  searchApi: { autocompleteRich: jest.fn(), users: jest.fn() },
  savedSearchesApi: { create: jest.fn() },
}));
jest.mock('@/hooks/useProductFilterOptions', () => ({
  useProductFilterOptions: () => ({
    manufacturers: [],
    brands: [],
    categories: [],
    carModels: [],
    colors: [],
    customAttributes: [],
    isLoading: false,
  }),
}));
jest.mock('@/components/ProductFilterSheet', () => () => null);

import { savedSearchesApi } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { qk } from '@/lib/query';
import SearchScreen from '..';

const create = savedSearchesApi.create as jest.Mock;
const alertMock = appAlert as jest.Mock;
const toastMock = toast as unknown as jest.Mock & { error: jest.Mock; success: jest.Mock };

const refusal = (status: number, data: Record<string, unknown>) => ({ response: { status, data } });

/** Lets the queries and effects of the screen settle inside act. */
const settle = () =>
  act(async () => {
    await Promise.resolve();
  });

async function openSaveModal(params: Record<string, string>) {
  mockParams.current = params;
  const view = renderWithProviders(<SearchScreen />);
  await settle();
  fireEvent.press(screen.getByTestId('save-search-button'));
  return view;
}

async function submit(name?: string) {
  if (name !== undefined) fireEvent.changeText(screen.getByTestId('save-search-name'), name);
  await act(async () => {
    fireEvent.press(screen.getByTestId('save-search-submit'));
  });
}

describe('search · save this search', () => {
  beforeEach(() => {
    resetRouterMocks();
    create.mockReset();
    alertMock.mockClear();
    toastMock.mockClear();
    toastMock.error.mockClear();
    toastMock.success.mockClear();
    useAuthStore.setState({ isAuthenticated: true });
  });

  it('an empty search cannot be saved: the button is disabled and no modal opens', async () => {
    mockParams.current = {};
    renderWithProviders(<SearchScreen />);
    await settle();
    const button = screen.getByTestId('save-search-button');
    expect(button).toBeDisabled();
    fireEvent.press(button);
    expect(screen.queryByTestId('save-search-name')).toBeNull();
    expect(alertMock).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });

  it('a sort alone is still an empty search', async () => {
    mockParams.current = { sortBy: 'price_asc' };
    renderWithProviders(<SearchScreen />);
    await settle();
    expect(screen.getByTestId('save-search-button')).toBeDisabled();
  });

  it('a guest gets the sign-in prompt, not the modal; "Login" opens the login screen', async () => {
    useAuthStore.setState({ isAuthenticated: false });
    await openSaveModal({ tradeOnly: 'true' });

    expect(screen.queryByTestId('save-search-name')).toBeNull();
    expect(alertMock).toHaveBeenCalledTimes(1);
    const [title, message, buttons] = alertMock.mock.calls[0];
    expect(title).toBe('Aramayı kaydet');
    expect(message).toBe('Aramanızı kaydetmek için giriş yapın');
    const login = buttons.find((b: { text: string }) => b.text === 'Giriş Yap' || b.text === 'Login');
    expect(login).toBeTruthy();
    login.onPress();
    expect(pushMock).toHaveBeenCalledWith('/(auth)/login');
    expect(create).not.toHaveBeenCalled();
  });

  it('the name is prefilled with the shared default name; the canonical query and labels are saved', async () => {
    create.mockResolvedValue({ data: { id: 's1' } });
    const { queryClient } = await openSaveModal({
      search: 'bmw',
      categoryId: 'c1',
      category: 'Diecast',
      tradeOnly: 'true',
      sortBy: 'price_asc',
    });
    const invalidate = jest.spyOn(queryClient, 'invalidateQueries');

    expect(screen.getByTestId('save-search-name').props.value).toBe('bmw · Diecast');
    await submit();

    await waitFor(() => expect(create).toHaveBeenCalledTimes(1));
    expect(create).toHaveBeenCalledWith({
      name: 'bmw · Diecast',
      // `page` / `limit` are dropped; flags only as true; the sort is part of a search.
      query: { search: 'bmw', categoryId: 'c1', tradeOnly: true, sortBy: 'price_asc' },
      labels: { categoryId: 'Diecast' },
    });
    // The modal closed before the save fired (iOS modal rule).
    expect(screen.queryByTestId('save-search-name')).toBeNull();
    await waitFor(() => expect(toastMock.success).toHaveBeenCalledWith('Arama kaydedildi'));
    expect(invalidate).toHaveBeenCalledWith({ queryKey: qk.user.savedSearches });
  });

  it('a double tap on Save sends one request (the dialog is still tappable while it closes)', async () => {
    create.mockResolvedValue({ data: { id: 's1' } });
    await openSaveModal({ tradeOnly: 'true' });
    const submitButton = screen.getByTestId('save-search-submit');
    await act(async () => {
      fireEvent.press(submitButton);
      fireEvent.press(submitButton);
    });
    await waitFor(() => expect(toastMock.success).toHaveBeenCalledTimes(1));
    expect(create).toHaveBeenCalledTimes(1);

    // Opening the dialog again allows the next save.
    fireEvent.press(screen.getByTestId('save-search-button'));
    await submit();
    await waitFor(() => expect(create).toHaveBeenCalledTimes(2));
  });

  it('a blank name lets the API derive its own (no name in the body)', async () => {
    create.mockResolvedValue({ data: { id: 's1' } });
    await openSaveModal({ tradeOnly: 'true' });
    await submit('   ');
    await waitFor(() => expect(create).toHaveBeenCalledTimes(1));
    expect(create.mock.calls[0][0]).toEqual({ query: { tradeOnly: true }, labels: {} });
  });

  it('a name over the limit stays in the modal with a message and is not saved', async () => {
    await openSaveModal({ tradeOnly: 'true' });
    await submit('x'.repeat(61));
    expect(create).not.toHaveBeenCalled();
    expect(await screen.findByText('En fazla 60 karakter olabilir')).toBeOnTheScreen();
    expect(screen.getByTestId('save-search-name')).toBeOnTheScreen();
  });

  it('409 SAVED_SEARCH_DUPLICATE: an "already saved" toast, no alert', async () => {
    create.mockRejectedValue(
      refusal(409, { errorCode: 'SAVED_SEARCH_DUPLICATE', message: 'Bu arama zaten kayıtlı.' }),
    );
    await openSaveModal({ tradeOnly: 'true' });
    await submit();
    await waitFor(() => expect(toastMock).toHaveBeenCalledWith('Bu arama zaten kayıtlı.'));
    expect(alertMock).not.toHaveBeenCalled();
    expect(toastMock.error).not.toHaveBeenCalled();
  });

  it('403 SAVED_SEARCH_LIMIT: a neutral alert with the server limit and NO upgrade button', async () => {
    create.mockRejectedValue(refusal(403, { errorCode: 'SAVED_SEARCH_LIMIT', limit: 7, message: 'x' }));
    await openSaveModal({ tradeOnly: 'true' });
    await submit();

    await waitFor(() => expect(alertMock).toHaveBeenCalledTimes(1), { timeout: 2000 });
    const [title, message, buttons] = alertMock.mock.calls[0];
    expect(title).toBe('Kayıtlı arama limiti');
    expect(message).toBe('Kayıtlı arama limitinize ulaştınız (7 arama).');
    // Only the default OK button: no upgrade / premium action, no price (ADR 0003).
    expect(buttons).toBeUndefined();
    expect(String(message)).not.toMatch(/premium|₺|yükselt/i);
    expect(toastMock.error).not.toHaveBeenCalled();
  });

  it('403 USER_BANNED is not read as the limit: no alert, no toast (the client redirects)', async () => {
    create.mockRejectedValue(refusal(403, { errorCode: 'USER_BANNED', message: 'banned' }));
    await openSaveModal({ tradeOnly: 'true' });
    await submit();
    await waitFor(() => expect(create).toHaveBeenCalled());
    await act(async () => {
      await new Promise((r) => setTimeout(r, 600));
    });
    expect(alertMock).not.toHaveBeenCalled();
    expect(toastMock.error).not.toHaveBeenCalled();
    expect(toastMock).not.toHaveBeenCalled();
  });

  it('any other error is a toast with the server message', async () => {
    create.mockRejectedValue(refusal(400, { message: 'Kaydetmek için bir arama yapın veya filtre seçin.' }));
    await openSaveModal({ tradeOnly: 'true' });
    await submit();
    await waitFor(() =>
      expect(toastMock.error).toHaveBeenCalledWith('Kaydetmek için bir arama yapın veya filtre seçin.'),
    );
    expect(alertMock).not.toHaveBeenCalled();
  });

  it('a network error falls back to "could not save"', async () => {
    create.mockRejectedValue(new Error('Network Error'));
    await openSaveModal({ tradeOnly: 'true' });
    await submit();
    await waitFor(() => expect(toastMock.error).toHaveBeenCalled());
  });
});
