/**
 * Profil fotoğrafı — seçici `pickerQuality()` ile açılır; yüklemeden önce `avatar` profiliyle
 * (sunucu 300×300 kırpıyor, sınır 2 MB → ≤600 px) hazırlanır, hazırlanmış dosya yüklenir.
 */
import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';

jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn(),
  MediaTypeOptions: { Images: 'Images' },
}));
const mockWithPrepared = jest.fn(
  async (_file: unknown, fn: (f: unknown) => Promise<unknown>, _opts?: unknown) =>
    fn({ uri: 'file:///cache/ImageManipulator/p.jpg', name: 'p.jpg', type: 'image/jpeg', temporary: true }),
);
jest.mock('@/lib/media', () => ({
  ...jest.requireActual('@/lib/media'),
  withPreparedImage: (file: unknown, fn: (f: unknown) => Promise<unknown>, opts?: unknown) =>
    mockWithPrepared(file, fn, opts),
}));
const mockUploadAvatar = jest.fn(async (..._a: unknown[]) => ({ data: { key: 'avatars/u1.jpg' } }));
const mockUpdateProfile = jest.fn(async (..._a: unknown[]) => ({ data: {} }));
jest.mock('@/lib/api', () => ({
  mediaApi: { uploadAvatar: (...a: unknown[]) => mockUploadAvatar(...a) },
  userApi: { updateProfile: (...a: unknown[]) => mockUpdateProfile(...a) },
}));
jest.mock('@/stores/authStore', () => ({ useAuthStore: () => ({ user: { avatar: null } }) }));
jest.mock('../_hooks/useRefreshAccount', () => ({ useRefreshAccount: () => async () => ({ avatar: 'x' }) }));

import { useUploadAvatar } from '../_hooks/useUploadAvatar';
import { IMAGE_PROFILES, pickerQuality } from '@/lib/media';

it('seçilen fotoğraf avatar profiliyle hazırlanır, hazırlanmış dosya yüklenir', async () => {
  (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
    canceled: false,
    assets: [{ uri: 'file:///tmp/me.heic', fileName: 'me.heic', mimeType: 'image/heic', width: 3000, height: 3000 }],
  });
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const { result } = renderHook(() => useUploadAvatar(), { wrapper });
  await act(async () => {
    await result.current.pick();
  });
  expect(ImagePicker.launchImageLibraryAsync).toHaveBeenCalledWith(
    expect.objectContaining({ allowsEditing: true, aspect: [1, 1], quality: pickerQuality() }),
  );
  await waitFor(() => expect(mockUpdateProfile).toHaveBeenCalledWith({ avatarUrl: 'avatars/u1.jpg' }));
  expect(mockWithPrepared).toHaveBeenCalledWith(
    { uri: 'file:///tmp/me.heic', name: 'me.heic', type: 'image/heic', width: 3000, height: 3000 },
    expect.any(Function),
    IMAGE_PROFILES.avatar,
  );
  expect(mockUploadAvatar).toHaveBeenCalledWith({
    uri: 'file:///cache/ImageManipulator/p.jpg',
    name: 'avatar.jpg',
    type: 'image/jpeg',
  });
});
