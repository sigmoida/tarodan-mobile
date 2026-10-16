import React from 'react';
import { render, type RenderOptions } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

/**
 * Test için react-query client (retry kapalı, gcTime 0). `networkMode: 'always'` üretimle aynı
 * (`@/lib/query/client`): onlineManager çevrimdışıyken testte sorgu/mutasyon duraklamasın.
 */
export function makeTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, networkMode: 'always' },
      mutations: { retry: false, networkMode: 'always' },
    },
  });
}

/** Ekran/komponenti gerekli provider'larla render eder. SafeArea/icons jest.setup'ta global. */
export function renderWithProviders(
  ui: React.ReactElement,
  options?: { queryClient?: QueryClient } & Omit<RenderOptions, 'wrapper'>,
) {
  const queryClient = options?.queryClient ?? makeTestQueryClient();
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { queryClient, ...render(ui, { wrapper: Wrapper, ...options }) };
}
