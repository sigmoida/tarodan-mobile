/**
 * Messages on wide windows (`_lib/layout`): expanded and wider windows show master–detail (the
 * thread list on the left, the selected conversation on the right, selected in place); medium
 * windows and phones keep pushing `/messages/[threadId]`.
 */
import React from 'react';
import { Dimensions, StyleSheet } from 'react-native';
import { act, fireEvent, screen, within } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils';
import { pushMock, resetRouterMocks } from '@/test-utils/router-mock';
import { isMessagesMasterDetail } from '../_lib/layout';

jest.mock('expo-router', () => ({
  ...require('@/test-utils/router-mock').routerMock,
  useFocusEffect: jest.fn(),
  useLocalSearchParams: () => ({}),
}));
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));
jest.mock('@/services/socket', () => ({ getSocket: () => null, onSocketInstanceChange: () => () => undefined }));
jest.mock('@/hooks/useBlockUser', () => ({
  useBlockStatus: () => ({ isBlocked: false }),
  useBlockUser: () => ({ requestBlock: jest.fn(), requestUnblock: jest.fn(), pending: false }),
}));

const mockAuth = { isAuthenticated: true, user: { id: 'me' }, limits: { maxMessagesPerDay: 50 }, token: 't' };
jest.mock('@/stores/authStore', () => ({
  useAuthStore: (sel?: (s: unknown) => unknown) => (sel ? sel(mockAuth) : mockAuth),
}));

const mockThread = (id: string, name: string) => ({
  id,
  participant1Id: 'me',
  participant2Id: `u-${id}`,
  participant1: { id: 'me', displayName: 'Ben' },
  participant2: { id: `u-${id}`, displayName: name },
  product: { id: `p-${id}`, title: `Ürün ${id}` },
  lastMessage: { content: 'Merhaba', senderId: `u-${id}`, createdAt: new Date().toISOString() },
  unreadCount: 0,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});
const mockThreads = [mockThread('t1', 'Ayşe'), mockThread('t2', 'Mehmet')];

// Built inside the factory: jest hoists it above the module's own declarations.
jest.mock('@/stores/messagesStore', () => {
  const state = {
    getOtherParticipant: (t: { participant2: unknown }) => t.participant2,
    setCurrentThreadId: jest.fn(),
  };
  const useMessagesStore = Object.assign(
    (sel?: (s: typeof state) => unknown) => (sel ? sel(state) : state),
    { getState: () => state },
  );
  return { useMessagesStore };
});

const mockThreadQuery = jest.fn();
jest.mock('@/hooks/messaging', () => ({
  useThreadsQuery: () => ({ data: mockThreads, isLoading: false, isFetched: true, refetch: jest.fn() }),
  useUnreadCountQuery: () => ({ data: 0 }),
  useThreadQuery: (id: string) => mockThreadQuery(id),
  useMessagesQuery: () => ({ data: [], isLoading: false }),
  useSendMessage: () => ({ mutateAsync: jest.fn() }),
  useMarkAsRead: () => jest.fn(),
  useDailyMessageLimit: () => ({
    ...jest.requireActual('@/lib/messaging/dailyLimit').viewDailyLimit({ remaining: 50, limit: 50 }),
    isLoading: false,
    refetch: jest.fn(),
  }),
}));

import MessagesScreen from '..';

const setWindow = (width: number, height: number) =>
  Dimensions.set({
    window: { width, height, scale: 2, fontScale: 2 },
    screen: { width, height, scale: 2, fontScale: 2 },
  });

describe('isMessagesMasterDetail', () => {
  it('is on for expanded and wider windows only', () => {
    expect([390, 626, 820, 839].map(isMessagesMasterDetail)).toEqual([false, false, false, false]);
    expect([840, 1032, 1180, 1366].map(isMessagesMasterDetail)).toEqual([true, true, true, true]);
  });
});

describe('messages master–detail', () => {
  beforeEach(() => {
    resetRouterMocks();
    mockThreadQuery.mockImplementation((id: string) => ({ data: mockThreads.find((t) => t.id === id) ?? null }));
  });
  afterEach(() => {
    screen.unmount();
    setWindow(375, 667);
  });

  it.each([
    [390, 844],
    [820, 1180],
  ])('%d pt: one list; a thread is pushed as its own screen', (w, h) => {
    setWindow(w, h);
    renderWithProviders(<MessagesScreen />);
    expect(screen.queryByTestId('messages-master-detail')).toBeNull();
    fireEvent.press(screen.getByText('Ayşe'));
    expect(pushMock).toHaveBeenCalledWith('/messages/t1');
  });

  it('1032 pt: list left, placeholder right; selecting a thread renders it on the right without pushing', () => {
    setWindow(1032, 1376);
    renderWithProviders(<MessagesScreen />);
    expect(screen.getByTestId('messages-master-detail')).toBeOnTheScreen();
    const pane = () => within(screen.getByTestId('messages-detail-pane'));
    expect(pane().getByText('message.selectConversationTitle')).toBeOnTheScreen();

    fireEvent.press(screen.getByTestId('thread-row-t2'));
    expect(pushMock).not.toHaveBeenCalled();
    expect(pane().queryByText('message.selectConversationTitle')).toBeNull();
    // The conversation (header with the other party, input bar) sits in the right-hand pane.
    expect(pane().getAllByText('Mehmet').length).toBeGreaterThan(0);
    expect(pane().getByTestId('message-send')).toBeOnTheScreen();
    expect(mockThreadQuery).toHaveBeenLastCalledWith('t2');
    // No back arrow in the pane; the open row is marked.
    expect(pane().queryByTestId('screen-header-back')).toBeNull();
    const row = StyleSheet.flatten(screen.getByTestId('thread-row-t2').props.style);
    expect(row.backgroundColor).toBeDefined();

    fireEvent.press(screen.getByTestId('thread-row-t1'));
    expect(mockThreadQuery).toHaveBeenLastCalledWith('t1');
    expect(pane().getAllByText('Ayşe').length).toBeGreaterThan(0);
  });

  it('narrowing from 1032 to 820 pt with a thread open pushes that thread instead of dropping it', () => {
    setWindow(1032, 1376);
    renderWithProviders(<MessagesScreen />);
    fireEvent.press(screen.getByTestId('thread-row-t2'));
    expect(pushMock).not.toHaveBeenCalled();
    act(() => setWindow(820, 1180));
    expect(screen.queryByTestId('messages-master-detail')).toBeNull();
    expect(pushMock).toHaveBeenCalledTimes(1);
    expect(pushMock).toHaveBeenCalledWith('/messages/t2');
    // Widening again does not reopen a stale selection.
    act(() => setWindow(1032, 1376));
    expect(within(screen.getByTestId('messages-detail-pane')).getByText('message.selectConversationTitle')).toBeOnTheScreen();
  });
});
