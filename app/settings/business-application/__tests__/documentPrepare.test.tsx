/**
 * İşletme belgesi — fotoğraf `document` profiliyle (≤2400 px, okunaklı) hazırlanıp yüklenir;
 * PDF'e dokunulmaz. 10 MB sınırı: küçültülemeyen dosyada (PDF) hemen, fotoğrafta hazırlama
 * atlandıysa uygulanır; küçültülen büyük fotoğraf yüklenir.
 */
import React from 'react';
import { act, renderHook } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as DocumentPicker from 'expo-document-picker';

jest.mock('expo-document-picker', () => ({ getDocumentAsync: jest.fn() }));
let mockPreparedTemporary = true;
const mockWithPrepared = jest.fn(
  async (file: { uri: string; name: string; type: string }, fn: (f: unknown) => Promise<unknown>, _opts?: unknown) =>
    fn(
      file.type === 'application/pdf' || !mockPreparedTemporary
        ? file
        : { uri: 'file:///cache/ImageManipulator/p.jpg', name: 'p.jpg', type: 'image/jpeg', temporary: true },
    ),
);
jest.mock('@/lib/media', () => ({
  ...jest.requireActual('@/lib/media'),
  withPreparedImage: (file: { uri: string; name: string; type: string }, fn: (f: unknown) => Promise<unknown>, opts?: unknown) =>
    mockWithPrepared(file, fn, opts),
}));
const mockUpload = jest.fn(async (..._a: unknown[]) => ({ data: {} }));
jest.mock('@/lib/api', () => ({ sellerDocumentsApi: { upload: (...a: unknown[]) => mockUpload(...a) } }));

import { useDocumentUpload } from '../_hooks/useDocumentUpload';
import { IMAGE_PROFILES } from '@/lib/media';
import { appAlert } from '@/ui';

const mockAlert = appAlert as jest.Mock;

const MB = 1024 * 1024;
const getDocument = DocumentPicker.getDocumentAsync as jest.Mock;

function setup() {
  const client = new QueryClient();
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return renderHook(() => useDocumentUpload(), { wrapper });
}

const pick = (asset: Record<string, unknown>) => getDocument.mockResolvedValue({ canceled: false, assets: [asset] });

beforeEach(() => {
  mockWithPrepared.mockClear();
  mockUpload.mockClear();
  mockPreparedTemporary = true;
});

it('belge fotoğrafı document profiliyle hazırlanır; hazırlanmış dosya yüklenir (12 MB → küçültülür, reddedilmez)', async () => {
  pick({ uri: 'file:///cache/DocumentPicker/levha.jpg', name: 'levha.jpg', mimeType: 'image/jpeg', size: 12 * MB });
  const { result } = setup();
  await act(async () => {
    await result.current.pickAndUpload('tax_plate');
  });
  expect(mockWithPrepared).toHaveBeenCalledWith(
    { uri: 'file:///cache/DocumentPicker/levha.jpg', name: 'levha.jpg', type: 'image/jpeg', size: 12 * MB },
    expect.any(Function),
    IMAGE_PROFILES.document,
  );
  expect(mockUpload).toHaveBeenCalledWith(
    'tax_plate',
    expect.objectContaining({ uri: 'file:///cache/ImageManipulator/p.jpg', name: 'p.jpg', type: 'image/jpeg' }),
    undefined,
  );
  expect(mockAlert).not.toHaveBeenCalled();
});

it('PDF olduğu gibi yüklenir', async () => {
  pick({ uri: 'file:///cache/DocumentPicker/s.pdf', name: 's.pdf', mimeType: 'application/pdf', size: MB });
  const { result } = setup();
  await act(async () => {
    await result.current.pickAndUpload('contract');
  });
  expect(mockUpload).toHaveBeenCalledWith(
    'contract',
    expect.objectContaining({ uri: 'file:///cache/DocumentPicker/s.pdf', name: 's.pdf', type: 'application/pdf' }),
    undefined,
  );
});

it('10 MB üstü PDF hiç hazırlanmadan reddedilir', async () => {
  pick({ uri: 'file:///cache/DocumentPicker/s.pdf', name: 's.pdf', mimeType: 'application/pdf', size: 11 * MB });
  const { result } = setup();
  await act(async () => {
    await result.current.pickAndUpload('contract');
  });
  expect(mockWithPrepared).not.toHaveBeenCalled();
  expect(mockUpload).not.toHaveBeenCalled();
  expect(mockAlert).toHaveBeenCalledTimes(1);
});

it('büyük fotoğrafta hazırlama atlandıysa (küçültülemedi) yüklenmez, "çok büyük" uyarısı', async () => {
  mockPreparedTemporary = false;
  pick({ uri: 'file:///cache/DocumentPicker/big.jpg', name: 'big.jpg', mimeType: 'image/jpeg', size: 12 * MB });
  const { result } = setup();
  await act(async () => {
    await result.current.pickAndUpload('tax_plate');
  });
  expect(mockUpload).not.toHaveBeenCalled();
  expect(mockAlert).toHaveBeenCalledTimes(1);
});
