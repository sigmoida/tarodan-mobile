/**
 * Kablo testi (review fix, bkz. final-fix-report.md #1). `useAutoScroll.test.tsx`
 * hook'un İÇ mantığını kilitliyor (near-bottom karar, force-scroll tüketimi) —
 * ama T1'in eklediği iki KABLO hiçbir testte geçmiyordu:
 *   - `MessageList.tsx:140` → `onScroll={f.handleScroll}`
 *   - `useMessageThread.ts:159` → gönderme akışı `forceScrollToBottom()` çağırır
 *
 * Somut regresyon: biri `onScroll` prop'unu MessageList'ten silerse
 * `distanceFromBottomRef` sonsuza dek 0 kalır (`useAutoScroll.ts:22`) →
 * `isNearBottom` her zaman `true` olur → B3 hatası (okurken listenin dibe
 * yapışması) sessizce geri döner, ama `useAutoScroll.test.tsx` hâlâ yeşil kalır
 * çünkü o dosya `handleScroll`'u DOĞRUDAN çağırıyor, JSX'in onu FlatList'e
 * gerçekten bağlayıp bağlamadığını değil.
 *
 * Bu dosya `useAutoScroll`'u mock'layarak "hangi fonksiyon referansı nereye
 * geçildi" sorusuna odaklanır — gerçek near-bottom mantığını YENİDEN test
 * etmiyor (o iş `useAutoScroll.test.tsx`'te), yalnızca kabloyu kilitliyor.
 */
import React from 'react';
import { FlatList } from 'react-native';
import { screen, fireEvent, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils';
import { resetRouterMocks } from '@/test-utils/router-mock';

jest.mock('expo-router', () => ({
  ...require('@/test-utils/router-mock').routerMock,
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
  useAuthStore: (sel?: (state: any) => unknown) => {
    const state: any = ({ user: { id: 'me' }, limits: { maxMessagesPerDay: 50 } });
    return sel ? sel(state) : state;
  },
}));

const mockStore = {
  getOtherParticipant: (t: any) => t.participant2,
  canSendMessage: () => true,
  setCurrentThreadId: jest.fn(),
  dailyMessageCount: 0,
};
const useMessagesStoreMock: any = (sel?: any) => (sel ? sel(mockStore) : mockStore);
useMessagesStoreMock.getState = () => mockStore;
jest.mock('@/stores/messagesStore', () => ({
  useMessagesStore: useMessagesStoreMock,
}));

const mockCurrentThread = {
  id: 't1',
  participant1Id: 'me',
  participant2Id: 'u2',
  participant1: { id: 'me', displayName: 'Ben' },
  participant2: { id: 'u2', displayName: 'Ayşe' },
  product: { id: 'p1', title: 'Deri Ceket' },
  unreadCount: 0,
};
const mockMessage = {
  id: 'm1',
  threadId: 't1',
  senderId: 'u2',
  receiverId: 'me',
  content: 'Selam',
  status: 'read',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const mockSendMessage = jest.fn();
const mockMarkAsRead = jest.fn();
jest.mock('@/hooks/messaging', () => ({
  useThreadQuery: () => ({ data: mockCurrentThread }),
  useMessagesQuery: () => ({ data: [mockMessage], isLoading: false }),
  useSendMessage: () => ({ mutateAsync: mockSendMessage }),
  useMarkAsRead: () => ({ mutate: mockMarkAsRead }),
}));

// useAutoScroll'un iç mantığı useAutoScroll.test.tsx'te zaten kilitli; burada
// mock'layıp döndürdüğü fonksiyon referanslarının gerçekten NEREYE geçildiğini
// doğruluyoruz (bkz. dosya başı açıklama).
const mockHandleScroll = jest.fn();
const mockHandleContentSizeChange = jest.fn();
const mockForceScrollToBottom = jest.fn();
jest.mock('../_hooks/useAutoScroll', () => ({
  useAutoScroll: () => ({
    handleScroll: mockHandleScroll,
    handleContentSizeChange: mockHandleContentSizeChange,
    forceScrollToBottom: mockForceScrollToBottom,
  }),
}));

import MessageThreadScreen from '../index';

describe('mesaj thread — auto-scroll kabloları (review fix #1)', () => {
  beforeEach(() => {
    resetRouterMocks();
    mockSendMessage.mockReset().mockResolvedValue(true);
    mockMarkAsRead.mockReset();
    mockHandleScroll.mockClear();
    mockHandleContentSizeChange.mockClear();
    mockForceScrollToBottom.mockClear();
  });

  it("MessageList, FlatList'e useAutoScroll'un handler'larını onScroll/onContentSizeChange olarak geçirir (MessageList.tsx:138-141)", () => {
    renderWithProviders(<MessageThreadScreen />);
    const list = screen.UNSAFE_getByType(FlatList);

    // Regresyon: `onScroll={f.handleScroll}` silinirse bu artık mockHandleScroll'a
    // EŞİT olmaz (undefined kalır) → distanceFromBottomRef sonsuza dek 0 kalır.
    expect(list.props.onScroll).toBe(mockHandleScroll);
    expect(list.props.onContentSizeChange).toBe(mockHandleContentSizeChange);
    // Aynı satırdaki sertleştirme (review fix #4): throttle 16 olmalı.
    expect(list.props.scrollEventThrottle).toBe(16);
  });

  it("mesaj gönderme akışı forceScrollToBottom'ı çağırır (useMessageThread.ts:159)", async () => {
    renderWithProviders(<MessageThreadScreen />);
    fireEvent.changeText(screen.getByPlaceholderText('Mesajınızı yazın...'), 'Merhaba');
    fireEvent.press(screen.UNSAFE_getByProps({ name: 'send' }).parent);

    await waitFor(() => expect(mockSendMessage).toHaveBeenCalled());
    // Regresyon: handleSend içindeki forceScrollToBottom() çağrısı silinirse bu
    // hiç tetiklenmez → kullanıcı yukarıda okurken kendi mesajı gönderilince dibe kaymaz.
    expect(mockForceScrollToBottom).toHaveBeenCalled();
  });
});
