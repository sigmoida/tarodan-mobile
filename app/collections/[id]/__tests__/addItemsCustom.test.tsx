/**
 * Add to a collection: the "Özel Ürün" (custom item) segment, like the web modal's second tab.
 * Segment switch, form validation, submit (upload on submit, then the add call with the uploaded
 * URL, toast, query refresh, back), and the upload / API / catalog error states.
 */
import React from 'react';
import { screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import * as ImagePicker from 'expo-image-picker';
import { renderWithProviders } from '@/test-utils';
import { toast } from '@/ui';
import { qk } from '@/lib/query';

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

import { collectionsApi, mediaApi, productsApi, carModelsApi } from '@/lib/api';
import { ImagePrepareError } from '@/lib/media';
import { captureException } from '@/services/sentry';
import { backMock, canGoBackMock } from '@/test-utils';
import AddCollectionItemsScreen from '../add-items';

const getMyListings = productsApi.getMyListings as jest.Mock;
const getFilters = productsApi.getFilters as jest.Mock;
const findByBrand = carModelsApi.findByBrand as jest.Mock;
const getOne = collectionsApi.getOne as jest.Mock;
const addItem = collectionsApi.addItem as jest.Mock;
const uploadImage = mediaApi.uploadCollectionImage as jest.Mock;
const pickImage = ImagePicker.launchImageLibraryAsync as jest.Mock;

const IMAGE_URL = 'https://cdn.example.test/collections/user-1/new.jpg';
const FILTERS = {
  brands: [
    { id: 'b1', name: 'Ferrari', slug: 'ferrari' },
    { id: 'b2', name: 'Porsche', slug: 'porsche' },
  ],
  scales: ['1:18', '1:43'],
  manufacturers: [{ id: 'm1', name: 'BBR', slug: 'bbr' }],
  materials: [{ slug: 'diecast', label: 'Diecast' }],
};

let successSpy: jest.SpyInstance;
let errorSpy: jest.SpyInstance;

beforeEach(() => {
  getMyListings.mockReset().mockResolvedValue({ data: { data: [{ id: 'l1', title: 'Benim ilanım', status: 'active', price: 10 }] } });
  getOne.mockReset().mockResolvedValue({ data: { items: [] } });
  getFilters.mockReset().mockResolvedValue({ data: FILTERS });
  findByBrand.mockReset().mockResolvedValue({ data: [{ id: 'cm1', name: 'F40', slug: 'f40' }] });
  addItem.mockReset().mockResolvedValue({ data: { id: 'item-1' } });
  uploadImage.mockReset().mockResolvedValue({ data: { url: IMAGE_URL } });
  pickImage.mockReset().mockResolvedValue({
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

async function openCustom() {
  const view = renderWithProviders(<AddCollectionItemsScreen />);
  fireEvent.press(await screen.findByText('Özel Ürün'));
  await screen.findByPlaceholderText('Ürün ismi');
  return view;
}

/** Opens a select, waits for it to be enabled, and picks an option. */
async function choose(field: string, value: string) {
  await waitFor(() => expect(screen.getByTestId(`custom-item-${field}`).props.accessibilityState?.disabled).toBeFalsy());
  fireEvent.press(screen.getByTestId(`custom-item-${field}`));
  fireEvent.press(await screen.findByTestId(`custom-item-${field}-sheet-option-${value}`));
}

const submit = () => fireEvent.press(screen.getByTestId('custom-item-submit'));

describe('add to a collection: segments', () => {
  it('starts on "İlanlarım" (listings + search); "Özel Ürün" shows the form and back again', async () => {
    renderWithProviders(<AddCollectionItemsScreen />);
    expect(await screen.findByText('Benim ilanım')).toBeOnTheScreen();
    expect(screen.getByPlaceholderText('İlanlarında ara...')).toBeOnTheScreen();
    expect(screen.queryByTestId('custom-item-submit')).toBeNull();

    fireEvent.press(screen.getByText('Özel Ürün'));
    expect(await screen.findByPlaceholderText('Ürün ismi')).toBeOnTheScreen();
    expect(screen.getByTestId('custom-item-submit')).toBeOnTheScreen();
    expect(screen.queryByText('Benim ilanım')).toBeNull();

    fireEvent.press(screen.getByText('İlanlarım'));
    expect(await screen.findByText('Benim ilanım')).toBeOnTheScreen();
    expect(screen.queryByTestId('custom-item-submit')).toBeNull();
  });

  it('both segments are buttons and the active one is selected', async () => {
    renderWithProviders(<AddCollectionItemsScreen />);
    await screen.findByText('Benim ilanım');
    const listings = screen.getByRole('button', { name: 'İlanlarım' });
    const custom = screen.getByRole('button', { name: 'Özel Ürün' });
    expect(listings.props.accessibilityState).toMatchObject({ selected: true });
    expect(custom.props.accessibilityState).toMatchObject({ selected: false });
  });

  it('what was typed survives a trip to the other segment', async () => {
    await openCustom();
    fireEvent.changeText(screen.getByPlaceholderText('Ürün ismi'), 'Ferrari F40');
    fireEvent.press(screen.getByText('İlanlarım'));
    await screen.findByText('Benim ilanım');
    fireEvent.press(screen.getByText('Özel Ürün'));
    expect(await screen.findByDisplayValue('Ferrari F40')).toBeOnTheScreen();
  });
});

describe('custom item form: validation', () => {
  it('an empty title shows the required message and nothing is sent', async () => {
    await openCustom();
    submit();
    expect(await screen.findByText('Bu alan zorunludur')).toBeOnTheScreen();
    expect(addItem).not.toHaveBeenCalled();
    expect(uploadImage).not.toHaveBeenCalled();
  });

  it('a year outside 1900..2100 or with other characters shows a field error before submit', async () => {
    await openCustom();
    fireEvent.changeText(screen.getByPlaceholderText('Ürün ismi'), 'Model');
    const year = screen.getByPlaceholderText('2026');

    fireEvent.changeText(year, '1800');
    submit();
    expect(await screen.findByText('En az 1900 olmalıdır')).toBeOnTheScreen();

    fireEvent.changeText(year, '2200');
    submit();
    expect(await screen.findByText('En fazla 2100 olabilir')).toBeOnTheScreen();

    fireEvent.changeText(year, '1967.');
    submit();
    expect(await screen.findByText('Geçerli bir değer girin')).toBeOnTheScreen();
    expect(addItem).not.toHaveBeenCalled();
  });
});

describe('custom item form: submit', () => {
  it('uploads the picked image on submit, then adds the item with the uploaded URL, toasts, refreshes and goes back', async () => {
    const { queryClient } = await openCustom();
    const invalidate = jest.spyOn(queryClient, 'invalidateQueries');

    fireEvent.changeText(screen.getByPlaceholderText('Ürün ismi'), '  Ferrari F40 ');
    fireEvent.changeText(screen.getByPlaceholderText('Ürün hakkında detaylı bilgi'), 'Kırmızı');
    fireEvent.changeText(screen.getByPlaceholderText('2026'), '1987');

    // Picking only previews: nothing is uploaded yet.
    fireEvent.press(screen.getByTestId('custom-item-image-pick'));
    await waitFor(() => expect(screen.getByTestId('custom-item-image-clear')).toBeOnTheScreen());
    expect(uploadImage).not.toHaveBeenCalled();

    await choose('brand', 'Ferrari');
    await waitFor(() => expect(findByBrand).toHaveBeenCalledWith('ferrari'));
    await choose('model', 'F40');
    await choose('scale', '1:18');

    submit();

    await waitFor(() => expect(addItem).toHaveBeenCalledTimes(1));
    expect(uploadImage).toHaveBeenCalledTimes(1);
    expect(uploadImage.mock.calls[0]![0]).toMatchObject({ uri: 'file:///tmp/pick.jpg', type: 'image/jpeg' });
    expect(addItem).toHaveBeenCalledWith('c1', {
      customTitle: 'Ferrari F40',
      customDescription: 'Kırmızı',
      customBrand: 'Ferrari',
      customModel: 'F40',
      customYear: 1987,
      customScale: '1:18',
      customImageUrl: IMAGE_URL,
    });
    // The upload finished before the item was created.
    expect(uploadImage.mock.invocationCallOrder[0]!).toBeLessThan(addItem.mock.invocationCallOrder[0]!);

    await waitFor(() => expect(successSpy).toHaveBeenCalledWith('Ürün koleksiyona eklendi'));
    expect(invalidate).toHaveBeenCalledWith({ queryKey: qk.collections.detail('c1') });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: qk.collections.mine });
    expect(backMock).toHaveBeenCalledTimes(1);
  });

  it('without an image nothing is uploaded and the body is the title alone', async () => {
    await openCustom();
    fireEvent.changeText(screen.getByPlaceholderText('Ürün ismi'), 'Benim modelim');
    submit();
    await waitFor(() => expect(addItem).toHaveBeenCalledWith('c1', { customTitle: 'Benim modelim' }));
    expect(uploadImage).not.toHaveBeenCalled();
  });

  it('cancelling the picker keeps the form without an image; Remove drops a picked one', async () => {
    await openCustom();
    pickImage.mockResolvedValueOnce({ canceled: true, assets: null });
    fireEvent.press(screen.getByTestId('custom-item-image-pick'));
    await act(async () => undefined);
    expect(screen.queryByTestId('custom-item-image-clear')).toBeNull();

    fireEvent.press(screen.getByTestId('custom-item-image-pick'));
    fireEvent.press(await screen.findByTestId('custom-item-image-clear'));
    expect(screen.queryByTestId('custom-item-image-clear')).toBeNull();
    fireEvent.changeText(screen.getByPlaceholderText('Ürün ismi'), 'Model');
    submit();
    await waitFor(() => expect(addItem).toHaveBeenCalledWith('c1', { customTitle: 'Model' }));
    expect(uploadImage).not.toHaveBeenCalled();
  });

  it('changing the brand clears the model; the model waits for a brand', async () => {
    await openCustom();
    expect(screen.getByText('Önce marka seçin')).toBeOnTheScreen();
    await choose('brand', 'Ferrari');
    await choose('model', 'F40');
    expect(screen.getAllByText('F40').length).toBeGreaterThan(0);

    await choose('brand', 'Porsche');
    await waitFor(() => expect(findByBrand).toHaveBeenCalledWith('porsche'));
    // The Ferrari model is gone: the field is back to its placeholder.
    await waitFor(() => expect(screen.queryByText('F40')).toBeNull());
    fireEvent.changeText(screen.getByPlaceholderText('Ürün ismi'), 'Model');
    submit();
    await waitFor(() => expect(addItem).toHaveBeenCalled());
    expect(addItem.mock.calls[0]![1]).toEqual({ customTitle: 'Model', customBrand: 'Porsche' });
  });

  it('the segments are locked while the item is being added', async () => {
    let finish!: (value: unknown) => void;
    addItem.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    await openCustom();
    fireEvent.changeText(screen.getByPlaceholderText('Ürün ismi'), 'Model');
    submit();
    await waitFor(() => expect(addItem).toHaveBeenCalled());
    fireEvent.press(screen.getByText('İlanlarım'));
    expect(screen.getByPlaceholderText('Ürün ismi')).toBeOnTheScreen();
    expect(screen.queryByText('Benim ilanım')).toBeNull();
    await act(async () => finish({ data: {} }));
  });
});

describe('custom item form: submit guards', () => {
  it('a double tap adds one item and uploads once (the button is not disabled yet on the second tap)', async () => {
    await openCustom();
    fireEvent.changeText(screen.getByPlaceholderText('Ürün ismi'), 'Model');
    fireEvent.press(screen.getByTestId('custom-item-image-pick'));
    await screen.findByTestId('custom-item-image-clear');

    submit();
    submit();

    await waitFor(() => expect(successSpy).toHaveBeenCalledTimes(1));
    expect(addItem).toHaveBeenCalledTimes(1);
    expect(uploadImage).toHaveBeenCalledTimes(1);
    expect(backMock).toHaveBeenCalledTimes(1);
  });

  it('a failed add can be submitted again (the guard is released)', async () => {
    addItem.mockRejectedValueOnce({ isAxiosError: true, response: { status: 400, data: { message: 'Hayır' } } });
    await openCustom();
    fireEvent.changeText(screen.getByPlaceholderText('Ürün ismi'), 'Model');
    submit();
    await waitFor(() => expect(errorSpy).toHaveBeenCalledWith('Hayır'));
    submit();
    await waitFor(() => expect(addItem).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(successSpy).toHaveBeenCalledTimes(1));
  });

  it('leaving the screen while the item is added: the toast still shows, but no second back', async () => {
    let finish!: (value: unknown) => void;
    addItem.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    const { unmount } = await openCustom();
    fireEvent.changeText(screen.getByPlaceholderText('Ürün ismi'), 'Model');
    submit();
    await waitFor(() => expect(addItem).toHaveBeenCalled());

    // The owner went back to the detail screen; the add finishes there.
    unmount();
    await act(async () => finish({ data: {} }));

    await waitFor(() => expect(successSpy).toHaveBeenCalledTimes(1));
    expect(backMock).not.toHaveBeenCalled();
  });
});

describe('custom item form: error states', () => {
  it('a picture that cannot be prepared: localized copy, not the English technical text; reported; nothing added', async () => {
    uploadImage.mockRejectedValue(new ImagePrepareError('failed'));
    await openCustom();
    fireEvent.changeText(screen.getByPlaceholderText('Ürün ismi'), 'Ferrari F40');
    fireEvent.press(screen.getByTestId('custom-item-image-pick'));
    await screen.findByTestId('custom-item-image-clear');
    submit();

    await waitFor(() => expect(errorSpy).toHaveBeenCalledWith('Ürünler eklenemedi'));
    expect(addItem).not.toHaveBeenCalled();
    expect(captureException).toHaveBeenCalledTimes(1);
    expect((captureException as jest.Mock).mock.calls[0]![0]).toBeInstanceOf(ImagePrepareError);
    expect(screen.getByDisplayValue('Ferrari F40')).toBeOnTheScreen();
  });

  it('upload fails: the server message in a toast, the item is not created, the form keeps its values', async () => {
    uploadImage.mockRejectedValue({ isAxiosError: true, response: { status: 422, data: { message: 'Görsel uygunsuz bulundu' } } });
    await openCustom();
    fireEvent.changeText(screen.getByPlaceholderText('Ürün ismi'), 'Ferrari F40');
    fireEvent.press(screen.getByTestId('custom-item-image-pick'));
    await screen.findByTestId('custom-item-image-clear');
    submit();

    await waitFor(() => expect(errorSpy).toHaveBeenCalledWith('Görsel uygunsuz bulundu'));
    expect(addItem).not.toHaveBeenCalled();
    expect(successSpy).not.toHaveBeenCalled();
    expect(backMock).not.toHaveBeenCalled();
    expect(screen.getByDisplayValue('Ferrari F40')).toBeOnTheScreen();
    expect(screen.getByTestId('custom-item-image-clear')).toBeOnTheScreen();
    // A 4xx is an expected refusal, not a Sentry event.
    expect(captureException).not.toHaveBeenCalled();
  });

  it('an upload answer without a URL is an error, not an item without its picture', async () => {
    uploadImage.mockResolvedValue({ data: {} });
    await openCustom();
    fireEvent.changeText(screen.getByPlaceholderText('Ürün ismi'), 'Model');
    fireEvent.press(screen.getByTestId('custom-item-image-pick'));
    await screen.findByTestId('custom-item-image-clear');
    submit();
    await waitFor(() => expect(errorSpy).toHaveBeenCalledWith('Ürünler eklenemedi'));
    expect(addItem).not.toHaveBeenCalled();
  });

  it('the add call is refused: the server message; the form stays; a retry does not upload twice after a 5xx', async () => {
    addItem.mockRejectedValueOnce({ isAxiosError: true, response: { status: 503, data: {} } });
    await openCustom();
    fireEvent.changeText(screen.getByPlaceholderText('Ürün ismi'), 'Model');
    fireEvent.press(screen.getByTestId('custom-item-image-pick'));
    await screen.findByTestId('custom-item-image-clear');
    submit();
    await waitFor(() => expect(errorSpy).toHaveBeenCalledTimes(1));
    expect(errorSpy.mock.calls[0]![0]).toContain('Ürünler eklenemedi');
    expect(captureException).toHaveBeenCalledTimes(1);
    expect(backMock).not.toHaveBeenCalled();

    submit();
    await waitFor(() => expect(addItem).toHaveBeenCalledTimes(2));
    expect(uploadImage).toHaveBeenCalledTimes(1);
    expect(addItem.mock.calls[1]![1]).toMatchObject({ customImageUrl: IMAGE_URL });
    await waitFor(() => expect(successSpy).toHaveBeenCalled());
  });

  it('after a 4xx from the add call the picture is uploaded again (the stored URL may be the reason)', async () => {
    addItem.mockRejectedValueOnce({ isAxiosError: true, response: { status: 400, data: { message: 'Görsel geçersiz' } } });
    await openCustom();
    fireEvent.changeText(screen.getByPlaceholderText('Ürün ismi'), 'Model');
    fireEvent.press(screen.getByTestId('custom-item-image-pick'));
    await screen.findByTestId('custom-item-image-clear');
    submit();
    await waitFor(() => expect(errorSpy).toHaveBeenCalledWith('Görsel geçersiz'));
    submit();
    await waitFor(() => expect(addItem).toHaveBeenCalledTimes(2));
    expect(uploadImage).toHaveBeenCalledTimes(2);
  });

  it('the catalog fails to load: an inline retry in place of the selects; title and image still work', async () => {
    getFilters.mockRejectedValueOnce(new Error('network'));
    await openCustom();
    expect(await screen.findByTestId('custom-item-options-error')).toBeOnTheScreen();
    expect(screen.queryByTestId('custom-item-brand')).toBeNull();
    fireEvent.changeText(screen.getByPlaceholderText('Ürün ismi'), 'Model');
    expect(screen.getByTestId('custom-item-image-pick')).toBeOnTheScreen();

    fireEvent.press(screen.getByText('Tekrar Dene'));
    expect(await screen.findByTestId('custom-item-brand')).toBeOnTheScreen();
    expect(screen.queryByTestId('custom-item-options-error')).toBeNull();
  });

  it('an empty scale or material facet says "no options defined" and is disabled (nothing is invented)', async () => {
    getFilters.mockResolvedValue({ data: { ...FILTERS, scales: [], materials: [] } });
    await openCustom();
    await waitFor(() => expect(screen.getAllByText('Bu alan için seçenek tanımlanmamış')).toHaveLength(2));
  });
});
