/**
 * Performans kilidi: yazılan metin `MessageInputBar`'ın kendi state'i. Tuş vuruşu thread
 * controller'ını ve mesaj listesini yeniden çizmez → `parseMessageContent` (balon başına
 * ayrıştırma) yazarken hiç çağrılmaz. Gönderim başarılıysa input temizlenir, filtre/hata
 * durumunda metin kalır.
 */
import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils';
import { resetRouterMocks } from '@/test-utils/router-mock';

jest.mock('expo-router', () => ({
  ...jest.requireActual('@/test-utils/router-mock').routerMock,
  useFocusEffect: jest.fn(),
  useLocalSearchParams: () => ({ threadId: 't1' }),
}));

jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
  MediaTypeOptions: { Images: 'Images' },
}));

jest.mock('@/lib/api', () => ({
  mediaApi: { uploadMessageImage: jest.fn() },
}));

jest.mock('@/stores/authStore', () => ({
  useAuthStore: (sel?: (state: Record<string, unknown>) => unknown) => {
    const state = { user: { id: 'me' }, limits: { maxMessagesPerDay: 50 }, token: 't' };
    return sel ? sel(state) : state;
  },
}));

const mockStore = {
  getOtherParticipant: (t: { participant2: unknown }) => t.participant2,
  setCurrentThreadId: jest.fn(),
};
jest.mock('@/stores/messagesStore', () => ({
  useMessagesStore: Object.assign(
    (sel?: (s: typeof mockStore) => unknown) => (sel ? sel(mockStore) : mockStore),
    { getState: () => mockStore },
  ),
}));

const mockParse = jest.fn();
jest.mock('@/utils/contentFilter', () => {
  const actual = jest.requireActual('@/utils/contentFilter');
  return {
    ...actual,
    parseMessageContent: (...args: unknown[]) => {
      mockParse(...args);
      return actual.parseMessageContent(...args);
    },
  };
});

const mockThread = {
  id: 't1',
  participant1Id: 'me',
  participant2Id: 'u2',
  participant1: { id: 'me', displayName: 'Ben' },
  participant2: { id: 'u2', displayName: 'Ayşe' },
  product: { id: 'p1', title: 'Deri Ceket' },
  unreadCount: 0,
};
const now = new Date().toISOString();
// Referans kararlı (React Query yapısal paylaşımı gibi).
const mockMessagesResult = {
  data: [
    { id: 'm1', threadId: 't1', senderId: 'u2', receiverId: 'me', content: 'Selam', status: 'read', createdAt: now, updatedAt: now },
    { id: 'm2', threadId: 't1', senderId: 'me', receiverId: 'u2', content: 'Merhaba', status: 'read', createdAt: now, updatedAt: now },
  ],
  isLoading: false,
};
const mockThreadResult = { data: mockThread };

const mockSendMessage = jest.fn();
jest.mock('@/hooks/messaging', () => ({
  useThreadQuery: () => mockThreadResult,
  useMessagesQuery: () => mockMessagesResult,
  useSendMessage: () => ({ mutateAsync: mockSendMessage }),
  useMarkAsRead: () => jest.fn(),
  useDailyMessageLimit: () => ({ canSend: true, limit: 50, remaining: 50, refetch: jest.fn() }),
}));

import MessageThreadScreen from '../index';

describe('mesaj thread — yazarken render yalıtımı', () => {
  beforeEach(() => {
    resetRouterMocks();
    mockParse.mockClear();
    mockSendMessage.mockReset().mockResolvedValue(true);
  });

  it('tuş vuruşları mesaj balonlarını yeniden ayrıştırmaz', () => {
    renderWithProviders(<MessageThreadScreen />);
    const input = screen.getByPlaceholderText('Mesajınızı yazın');
    const before = mockParse.mock.calls.length;
    expect(before).toBeGreaterThan(0);

    fireEvent.changeText(input, 'M');
    fireEvent.changeText(input, 'Me');
    fireEvent.changeText(input, 'Mer');

    expect(mockParse.mock.calls.length).toBe(before);
    expect(screen.getByDisplayValue('Mer')).toBeTruthy();
  });

  it('başarılı gönderimde input temizlenir', async () => {
    renderWithProviders(<MessageThreadScreen />);
    fireEvent.changeText(screen.getByPlaceholderText('Mesajınızı yazın'), 'Selamlar');
    fireEvent.press(screen.getByTestId('message-send'));
    await waitFor(() =>
      expect(mockSendMessage).toHaveBeenCalledWith({ threadId: 't1', content: 'Selamlar' }),
    );
    await waitFor(() => expect(screen.queryByDisplayValue('Selamlar')).toBeNull());
  });

  it('gönderim hata verirse metin korunur', async () => {
    mockSendMessage.mockRejectedValueOnce(new Error('x'));
    renderWithProviders(<MessageThreadScreen />);
    fireEvent.changeText(screen.getByPlaceholderText('Mesajınızı yazın'), 'Selamlar');
    fireEvent.press(screen.getByTestId('message-send'));
    await waitFor(() => expect(mockSendMessage).toHaveBeenCalled());
    expect(screen.getByDisplayValue('Selamlar')).toBeTruthy();
  });
});
