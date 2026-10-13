/**
 * "Koleksiyona ekle" sheet'i: sanal liste, satıra basınca sheet ÖNCE kapanır, ekleme ardından
 * (sonuç toast); "Yeni koleksiyon" kapanıştan sonra mevcut `collections/new` ekranına gider
 * (ürün route param ile); oluşturma hakkı yoksa buton gizli.
 */
import React, { useState } from 'react';
import { Modal } from 'react-native';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ router: { push: (...a: unknown[]) => mockPush(...a) } }));

jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  collectionsApi: { getMyCollections: jest.fn(), addItem: jest.fn() },
}));
jest.mock('@/ui', () => ({
  ...jest.requireActual('@/ui'),
  appAlert: jest.fn(),
  toast: Object.assign(jest.fn(), { success: jest.fn(), error: jest.fn() }),
}));

let mockLimits: Record<string, unknown> | undefined = { canCreateCollections: true };
jest.mock('@/stores/authStore', () => ({
  useAuthStore: (sel: (s: unknown) => unknown) => sel({ user: { id: 'u1' }, limits: mockLimits }),
}));

import { collectionsApi } from '@/lib/api';
import { toast } from '@/ui';
import AddToCollectionModal from '../AddToCollectionModal';

const getMine = collectionsApi.getMyCollections as jest.Mock;
const addItem = collectionsApi.addItem as jest.Mock;

const COLLECTIONS = [
  { id: 'c1', name: 'Ferrari', itemCount: 3, isPublic: true },
  { id: 'c2', name: 'Porsche', itemCount: 0, isPublic: false },
];

function Harness({ onSuccess }: { onSuccess?: (n: string) => void }) {
  const [open, setOpen] = useState(true);
  return <AddToCollectionModal visible={open} onDismiss={() => setOpen(false)} productId="p1" onSuccess={onSuccess} />;
}

/** Native Modal kapandı (iOS `onDismiss`): kapanış-sonrası kuyruk çalışır. */
const nativeDismiss = () =>
  act(() => {
    screen.UNSAFE_getByType(Modal).props.onDismiss?.();
  });

beforeEach(() => {
  mockPush.mockClear();
  getMine.mockReset();
  addItem.mockReset();
  (toast.success as jest.Mock).mockClear();
  (toast.error as jest.Mock).mockClear();
  mockLimits = { canCreateCollections: true };
  getMine.mockResolvedValue({ data: { collections: COLLECTIONS } });
});

describe('AddToCollectionModal (BottomSheet)', () => {
  it('koleksiyonları sanal listede gösterir', async () => {
    renderWithProviders(<Harness />);
    expect(await screen.findByText('Ferrari')).toBeOnTheScreen();
    expect(screen.getByText('Porsche')).toBeOnTheScreen();
    expect(screen.getByTestId('add-to-collection-list')).toBeOnTheScreen();
  });

  it('satıra basınca önce kapanır; ekleme kapanış SONRASI, başarıda onSuccess(ad)', async () => {
    addItem.mockResolvedValue({ data: {} });
    const onSuccess = jest.fn();
    renderWithProviders(<Harness onSuccess={onSuccess} />);
    fireEvent.press(await screen.findByTestId('add-to-collection-row-c1'));
    expect(addItem).not.toHaveBeenCalled();
    nativeDismiss();
    await waitFor(() => expect(addItem).toHaveBeenCalledWith('c1', { productId: 'p1' }));
    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith('Ferrari'));
  });

  it('ekleme hatası: toast.error (modal içi ModalMessage yok)', async () => {
    addItem.mockRejectedValue({ response: { data: { message: 'Zaten ekli' } } });
    renderWithProviders(<Harness />);
    fireEvent.press(await screen.findByTestId('add-to-collection-row-c2'));
    nativeDismiss();
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Zaten ekli'));
  });

  it('"Yeni koleksiyon": kapanıştan sonra collections/new ekranına ürün param ile gider', async () => {
    renderWithProviders(<Harness />);
    await screen.findByText('Ferrari');
    fireEvent.press(screen.getByTestId('add-to-collection-new'));
    expect(mockPush).not.toHaveBeenCalled();
    nativeDismiss();
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/collections/new', params: { addProductId: 'p1' } });
  });

  it('koleksiyon oluşturma hakkı yoksa "Yeni koleksiyon" gizli', async () => {
    mockLimits = { canCreateCollections: false };
    renderWithProviders(<Harness />);
    await screen.findByText('Ferrari');
    expect(screen.queryByTestId('add-to-collection-new')).toBeNull();
  });

  it('koleksiyon yoksa boş durum gösterir', async () => {
    getMine.mockResolvedValue({ data: { collections: [] } });
    renderWithProviders(<Harness />);
    expect(await screen.findByTestId('add-to-collection-empty')).toBeOnTheScreen();
  });

  it('liste hatası: ErrorState + yeniden dene', async () => {
    getMine.mockRejectedValueOnce(new Error('boom'));
    renderWithProviders(<Harness />);
    expect(await screen.findByTestId('add-to-collection-error')).toBeOnTheScreen();
    getMine.mockResolvedValue({ data: { collections: COLLECTIONS } });
    fireEvent.press(screen.getByText('Tekrar Dene'));
    expect(await screen.findByText('Ferrari')).toBeOnTheScreen();
  });
});
