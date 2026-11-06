/**
 * Contract fixture test for tarodan-ops `contracts/deltas/2026-11-06-collection-custom-item-image.md`
 * (mobile action P1): a custom item's picture is uploaded with `POST /media/upload?folder=collections`
 * and the returned `url` goes, unchanged, as `customImageUrl` on `POST /collections/:id/items`; without a
 * picture the key is not sent; the new 400 `server.collection.invalidImageUrl` and the 403
 * `server.collection.editForbidden` show the server's localised `message` and keep the form. The bodies
 * are written from the delta, not measured (the API change is not on staging yet).
 */
import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react-native';
import * as ImagePicker from 'expo-image-picker';
import { renderWithProviders, backMock, canGoBackMock } from '@/test-utils';
import { toast } from '@/ui';

jest.mock('expo-router', () => ({
  ...jest.requireActual<typeof import('@/test-utils/router-mock')>('@/test-utils/router-mock').routerMock,
  useLocalSearchParams: () => ({ id: 'c1' }),
}));
jest.mock('expo-image-picker', () => ({
  MediaTypeOptions: { Images: 'Images' },
  launchImageLibraryAsync: jest.fn(),
}));
// Preparation (resize, temp files) is native work; the upload gets the picked file as it is.
jest.mock('@/lib/media', () => ({
  ...jest.requireActual('@/lib/media'),
  withPreparedImage: (file: unknown, upload: (f: unknown) => unknown) => upload(file),
}));
jest.mock('@/lib/api', () => ({
  productsApi: { getMyListings: jest.fn(), getFilters: jest.fn() },
  carModelsApi: { findByBrand: jest.fn() },
  collectionsApi: { getOne: jest.fn(), addItem: jest.fn(), removeItem: jest.fn() },
  mediaApi: { uploadCollectionImage: jest.fn() },
}));
jest.mock('@/services/sentry', () => ({ captureException: jest.fn() }));

import { collectionsApi, mediaApi, productsApi } from '@/lib/api';
import { captureException } from '@/services/sentry';
import AddCollectionItemsScreen from '../add-items';

const addItem = collectionsApi.addItem as jest.Mock;
const uploadImage = mediaApi.uploadCollectionImage as jest.Mock;

/** `POST /media/upload?folder=collections` answers, as the delta describes them (own public root). */
const UPLOAD_URL = 'https://cdn.example.test/staging/collections/user/7c0e2a4b-1d3f-4e5a-9b6c-8d7e6f5a4b3c/1730880000000-Ab_c-1.jpg';
const SECOND_UPLOAD_URL = 'https://cdn.example.test/staging/collections/user/7c0e2a4b-1d3f-4e5a-9b6c-8d7e6f5a4b3c/1730880000999-x.jpg';

/** The delta's 400 and 403 bodies (axios error shape). */
const invalidImageUrl = {
  isAxiosError: true,
  response: {
    status: 400,
    data: {
      statusCode: 400,
      message: 'Görsel geçersiz. Lütfen görseli yeniden yükleyin.',
      error: 'Bad Request',
      i18nKey: 'server.collection.invalidImageUrl',
    },
  },
};
const editForbidden = {
  isAxiosError: true,
  response: {
    status: 403,
    data: {
      statusCode: 403,
      message: 'Bu koleksiyonu düzenleme yetkiniz yok',
      error: 'Forbidden',
      i18nKey: 'server.collection.editForbidden',
    },
  },
};

let successSpy: jest.SpyInstance;
let errorSpy: jest.SpyInstance;

beforeEach(() => {
  (productsApi.getMyListings as jest.Mock).mockReset().mockResolvedValue({ data: { data: [] } });
  (productsApi.getFilters as jest.Mock).mockReset().mockResolvedValue({
    data: { brands: [], scales: [], manufacturers: [], materials: [] },
  });
  (collectionsApi.getOne as jest.Mock).mockReset().mockResolvedValue({ data: { items: [] } });
  addItem.mockReset().mockResolvedValue({ data: { id: 'item-1' } });
  uploadImage.mockReset().mockResolvedValue({ data: { url: UPLOAD_URL, key: 'staging/collections/user/x/a.jpg' } });
  (ImagePicker.launchImageLibraryAsync as jest.Mock).mockReset().mockResolvedValue({
    canceled: false,
    assets: [{ uri: 'file:///tmp/pick.jpg', fileName: 'pick.jpg', mimeType: 'image/jpeg', width: 800, height: 600, fileSize: 1000 }],
  });
  (captureException as jest.Mock).mockClear();
  backMock.mockClear();
  canGoBackMock.mockReturnValue(true);
  successSpy = jest.spyOn(toast, 'success').mockImplementation(() => 'id');
  errorSpy = jest.spyOn(toast, 'error').mockImplementation(() => 'id');
});
afterEach(() => {
  successSpy.mockRestore();
  errorSpy.mockRestore();
});

async function fillForm({ withImage }: { withImage: boolean }) {
  renderWithProviders(<AddCollectionItemsScreen />);
  fireEvent.press(await screen.findByText('Özel Ürün'));
  fireEvent.changeText(await screen.findByPlaceholderText('Ürün ismi'), 'Ferrari F40');
  fireEvent.changeText(screen.getByPlaceholderText('Ürün hakkında detaylı bilgi'), 'Kırmızı');
  fireEvent.changeText(screen.getByPlaceholderText('2026'), '1987');
  if (withImage) {
    fireEvent.press(screen.getByTestId('custom-item-image-pick'));
    await screen.findByTestId('custom-item-image-clear');
  }
}

const submit = () => fireEvent.press(screen.getByTestId('custom-item-submit'));
/** The add body as it goes over the wire (axios JSON-encodes it: `undefined` keys drop out). */
const wireBody = (call: number) => JSON.parse(JSON.stringify(addItem.mock.calls[call]![1]));

describe('contract 2026-11-06: custom item image', () => {
  it('sends the upload url byte for byte as customImageUrl, in a JSON body (no multipart image)', async () => {
    await fillForm({ withImage: true });
    submit();
    await waitFor(() => expect(addItem).toHaveBeenCalledTimes(1));

    expect(uploadImage).toHaveBeenCalledTimes(1);
    const body = addItem.mock.calls[0]![1];
    expect(body).not.toBeInstanceOf(FormData);
    expect(body.customImageUrl).toBe(UPLOAD_URL);
    expect(wireBody(0)).toEqual({
      customTitle: 'Ferrari F40',
      customDescription: 'Kırmızı',
      customYear: 1987,
      customImageUrl: UPLOAD_URL,
    });
    await waitFor(() => expect(successSpy).toHaveBeenCalled());
  });

  it('without a picture the key is not sent at all (not an empty string)', async () => {
    await fillForm({ withImage: false });
    submit();
    await waitFor(() => expect(addItem).toHaveBeenCalledTimes(1));
    expect(uploadImage).not.toHaveBeenCalled();
    expect(Object.keys(wireBody(0))).not.toContain('customImageUrl');
  });

  it('400 invalidImageUrl: the server message, the form keeps its values, a retry uploads again and sends that url', async () => {
    addItem.mockRejectedValueOnce(invalidImageUrl);
    await fillForm({ withImage: true });
    submit();

    await waitFor(() => expect(errorSpy).toHaveBeenCalledWith('Görsel geçersiz. Lütfen görseli yeniden yükleyin.'));
    expect(successSpy).not.toHaveBeenCalled();
    expect(backMock).not.toHaveBeenCalled();
    // An expected refusal (4xx), not a Sentry event.
    expect(captureException).not.toHaveBeenCalled();
    // Every value stays, the picked picture too.
    expect(screen.getByDisplayValue('Ferrari F40')).toBeOnTheScreen();
    expect(screen.getByDisplayValue('Kırmızı')).toBeOnTheScreen();
    expect(screen.getByDisplayValue('1987')).toBeOnTheScreen();
    expect(screen.getByTestId('custom-item-image-clear')).toBeOnTheScreen();

    uploadImage.mockResolvedValueOnce({ data: { url: SECOND_UPLOAD_URL } });
    submit();
    await waitFor(() => expect(addItem).toHaveBeenCalledTimes(2));
    expect(uploadImage).toHaveBeenCalledTimes(2);
    expect(wireBody(1).customImageUrl).toBe(SECOND_UPLOAD_URL);
    await waitFor(() => expect(successSpy).toHaveBeenCalledTimes(1));
    expect(backMock).toHaveBeenCalledTimes(1);
  });

  it('403 editForbidden: the server message, nothing reported, the form stays', async () => {
    addItem.mockRejectedValueOnce(editForbidden);
    await fillForm({ withImage: false });
    submit();

    await waitFor(() => expect(errorSpy).toHaveBeenCalledWith('Bu koleksiyonu düzenleme yetkiniz yok'));
    expect(captureException).not.toHaveBeenCalled();
    expect(backMock).not.toHaveBeenCalled();
    expect(screen.getByDisplayValue('Ferrari F40')).toBeOnTheScreen();
  });
});
