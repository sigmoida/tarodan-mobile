/**
 * İade kanıtı — seçici `pickerQuality()` ile açılır ve yerel URI'yi (önekli) + boyutları
 * korur; her fotoğraf yüklemeden önce ortak hazırlamadan geçer, hazırlanmış dosya iOS
 * FormData biçiminde yüklenir.
 */
import React from 'react';
import { act, renderHook } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';

jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(async () => ({ granted: true })),
  launchImageLibraryAsync: jest.fn(),
  MediaTypeOptions: { Images: 'Images' },
}));
const mockWithPrepared = jest.fn(
  async (file: { name: string }, fn: (f: unknown) => Promise<unknown>, _opts?: unknown) =>
    fn({ uri: `file:///cache/ImageManipulator/${file.name}`, name: file.name, type: 'image/jpeg', temporary: true }),
);
jest.mock('@/lib/media', () => ({
  ...jest.requireActual('@/lib/media'),
  withPreparedImage: (file: { name: string }, fn: (f: unknown) => Promise<unknown>, opts?: unknown) =>
    mockWithPrepared(file, fn, opts),
}));
const mockUpload = jest.fn(async (f: { name: string }) => ({ data: { url: `https://x/${f.name}` } }));
jest.mock('@/lib/api', () => ({
  mediaApi: { uploadRefundEvidence: (f: { name: string }) => mockUpload(f) },
}));
jest.mock('@/services/sentry', () => ({ captureException: jest.fn() }));

import { pickEvidencePhotos } from '../_lib/pickEvidence';
import { useUploadRefundEvidence } from '../_hooks/useUploadRefundEvidence';
import { pickerQuality } from '@/lib/media';

const launch = ImagePicker.launchImageLibraryAsync as jest.Mock;

it('seçici pickerQuality ile açılır; dosyalar önekli URI + boyutla döner', async () => {
  launch.mockResolvedValue({
    canceled: false,
    assets: [{ uri: 'file:///tmp/a.heic', fileName: 'a.heic', mimeType: 'image/heic', width: 4032, height: 3024 }],
  });
  await expect(pickEvidencePhotos(3)).resolves.toEqual([
    { uri: 'file:///tmp/a.heic', name: 'a.heic', type: 'image/heic', width: 4032, height: 3024 },
  ]);
  expect(launch).toHaveBeenCalledWith(expect.objectContaining({ selectionLimit: 3, quality: pickerQuality() }));
});

it('her kanıt fotoğrafı hazırlanıp yüklenir; URL\'ler sırayla döner', async () => {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const { result } = renderHook(() => useUploadRefundEvidence('o1'), { wrapper });
  const files = [
    { uri: 'file:///tmp/a.heic', name: 'a.jpg', type: 'image/heic', width: 4032, height: 3024 },
    { uri: 'file:///tmp/b.jpg', name: 'b.jpg', type: 'image/jpeg', width: 4032, height: 3024 },
  ];
  let urls: string[] = [];
  await act(async () => {
    urls = await result.current.mutateAsync(files);
  });
  expect(urls).toEqual(['https://x/a.jpg', 'https://x/b.jpg']);
  expect(mockWithPrepared.mock.calls.map(([f]) => f)).toEqual(files);
  // Hazırlanmış (cache) dosya, iOS FormData biçiminde (önek yok).
  expect(mockUpload).toHaveBeenCalledWith({
    uri: '/cache/ImageManipulator/a.jpg',
    name: 'a.jpg',
    type: 'image/jpeg',
  });
});
