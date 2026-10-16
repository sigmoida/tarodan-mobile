import React from 'react';
import { act, renderHook } from '@testing-library/react-native';
import { AppState } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useMessagingSocket } from '../useMessagingSocket';

const mockSocket = { on: jest.fn(), off: jest.fn(), io: { on: jest.fn(), off: jest.fn() } };
let mockCurrent: typeof mockSocket | null = null;
const mockInstanceListeners = new Set<(s: unknown) => void>();
const mockConnect = jest.fn(() => {
  mockCurrent = mockSocket;
  mockInstanceListeners.forEach((l) => l(mockSocket));
  return mockSocket;
});
jest.mock('@/services/socket', () => ({
  connectSocket: () => mockConnect(),
  disconnectSocket: jest.fn(),
  getSocket: () => mockCurrent,
  onSocketInstanceChange: (l: (s: unknown) => void) => {
    mockInstanceListeners.add(l);
    return () => mockInstanceListeners.delete(l);
  },
}));
jest.mock('../useSocketAppLifecycle', () => ({ useSocketAppLifecycle: jest.fn() }));

const mockAuth = { token: 'tok', user: { id: 'me' } };
jest.mock('@/stores/authStore', () => ({
  useAuthStore: Object.assign((sel: (s: typeof mockAuth) => unknown) => sel(mockAuth), {
    getState: () => mockAuth,
  }),
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>
);

describe('useMessagingSocket — arka plan', () => {
  const original = AppState.currentState;
  afterEach(() => {
    (AppState as { currentState: string }).currentState = original;
    mockCurrent = null;
    jest.clearAllMocks();
  });

  it('arka plandayken token gelirse bağlanmaz; örnek sonradan oluşunca dinleyiciler bağlanır', () => {
    (AppState as { currentState: string }).currentState = 'background';
    renderHook(() => useMessagingSocket(), { wrapper });
    expect(mockConnect).not.toHaveBeenCalled();
    expect(mockSocket.on).not.toHaveBeenCalled();

    // Ön plana dönüşte yaşam döngüsü hook'u bağlanır → yeni örnek bildirilir.
    act(() => { mockConnect(); });
    expect(mockSocket.on).toHaveBeenCalledWith('message:new', expect.any(Function));
    expect(mockSocket.on).toHaveBeenCalledWith('notification:new', expect.any(Function));
  });

  it('ön plandayken bağlanır ve dinleyicileri bağlar', () => {
    (AppState as { currentState: string }).currentState = 'active';
    renderHook(() => useMessagingSocket(), { wrapper });
    expect(mockConnect).toHaveBeenCalledTimes(1);
    expect(mockSocket.on).toHaveBeenCalledWith('message:new', expect.any(Function));
  });
});
