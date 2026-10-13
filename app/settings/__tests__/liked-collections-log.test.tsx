/**
 * `logger.debug` argümanı release'te de hesaplanır (seviye filtresi çağrıdan SONRA). Yanıtın
 * tamamını `JSON.stringify` etmek hem gereksiz iş hem de gövde sızıntısıydı: yalnız sayı loglanır.
 */
import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { makeTestQueryClient } from '@/test-utils';

jest.mock('expo-router', () => ({ ...require('@/test-utils/router-mock').routerMock, useFocusEffect: jest.fn() }));
jest.mock('@/stores/authStore', () => ({
  useAuthStore: () => ({ isAuthenticated: true }),
}));
jest.mock('@/lib/api', () => ({
  collectionsApi: { getLikedCollections: jest.fn(), unlike: jest.fn() },
}));
jest.mock('@/services/logger', () => ({
  logger: { debug: jest.fn(), error: jest.fn(), info: jest.fn(), warn: jest.fn() },
  safeError: (e: unknown) => ({ message: String(e) }),
}));

import { collectionsApi } from '@/lib/api';
import { logger } from '@/services/logger';
import { useLikedCollections } from '../liked-collections/_hooks/useLikedCollections';

it('yanıt gövdesi stringify edilmez; debug günlüğüne yalnız sayı gider', async () => {
  const body = { collections: [{ id: 'c1', title: 'Gizli başlık' }, { id: 'c2', title: 'Diğer' }] };
  (collectionsApi.getLikedCollections as jest.Mock).mockResolvedValue({ data: body });
  const stringify = jest.spyOn(JSON, 'stringify');

  const client = makeTestQueryClient();
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const { result } = renderHook(() => useLikedCollections(), { wrapper });
  await waitFor(() => expect(result.current.collections).toHaveLength(2));

  expect(logger.debug).toHaveBeenCalledWith('Liked collections response', { count: 2 });
  expect(JSON.stringify(((logger.debug as jest.Mock).mock.calls))).not.toContain('Gizli başlık');
  expect(stringify.mock.calls.some(([v]) => v === body)).toBe(false);
  stringify.mockRestore();
});
