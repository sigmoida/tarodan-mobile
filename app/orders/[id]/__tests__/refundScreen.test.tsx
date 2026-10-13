/**
 * İade talebi EKRANI (`orders/[id]/refund`) — eski RefundRequestModal sözleşmeleri ekrana taşındı:
 * - payload ve doğrulama aynı (`_lib/schema.ts`): vazgeçmede kanıt/açıklama isteğe bağlı,
 *   kusur nedeninde zorunlu; eksikse istek gitmez, hata alan altında.
 * - Kanıt yüklemesi hepsi-ya-da-hiçbiri; başarısızsa hata kanıt alanında, talep gitmez.
 * - Başarı: ekrandan geri çık (önce) + `toast.success`; hata: `toast.error`, ekran kalır.
 * - Kirli formdan geri çıkış (geri oku / Android geri) onay ister; temiz form serbest.
 */
import React from 'react';
import { act, screen, fireEvent, waitFor, within } from '@testing-library/react-native';
import { appAlert, toast } from '@/ui';
import { renderWithProviders } from '@/test-utils';
import i18n from '@/i18n/config';
import {
  backMock,
  canGoBackMock,
  emitBeforeRemove,
  navigationDispatchMock,
  resetRouterMocks,
} from '@/test-utils/router-mock';

jest.mock('expo-router', () => ({
  ...require('@/test-utils/router-mock').routerMock,
  useLocalSearchParams: () => ({ id: 'order-1' }),
}));
jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
  MediaTypeOptions: { Images: 'Images' },
}));
jest.mock('@/lib/api', () => ({
  api: { get: jest.fn() },
  refundsApi: { create: jest.fn() },
  mediaApi: { uploadRefundEvidence: jest.fn() },
  timingRulesApi: { getPolicy: jest.fn(() => new Promise(() => {})) },
}));
jest.mock('@/services/sentry', () => ({ captureException: jest.fn(), addBreadcrumb: jest.fn(), setUser: jest.fn() }));

import * as ImagePicker from 'expo-image-picker';
import { api, mediaApi, refundsApi } from '@/lib/api';
import * as schemaModule from '../_lib/schema';
import RefundRequestScreen from '../refund';

const getMock = api.get as jest.Mock;
const createMock = refundsApi.create as jest.Mock;
const uploadMock = mediaApi.uploadRefundEvidence as jest.Mock;
const permMock = ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock;
const launchMock = ImagePicker.launchImageLibraryAsync as jest.Mock;
const alertMock = appAlert as jest.Mock;

const LONG = 'Kutunun bir köşesi ezik, aynası kırık geldi.';

function order(overrides: Record<string, unknown> = {}) {
  return {
    id: 'order-1',
    orderNumber: 'ORD-1',
    status: 'delivered',
    product: { id: 'p1', title: 'Deri Ceket' },
    seller: { id: 's1', displayName: 'Mehmet' },
    isBuyer: true,
    payment: { status: 'completed' },
    ...overrides,
  };
}

let successSpy: jest.SpyInstance;
let errorSpy: jest.SpyInstance;

beforeEach(() => {
  jest.clearAllMocks();
  resetRouterMocks();
  canGoBackMock.mockReturnValue(true);
  getMock.mockResolvedValue({ data: { data: order() } });
  createMock.mockResolvedValue({ data: {} });
  uploadMock.mockResolvedValue({ data: { url: 'https://cdn/evidence.jpg' } });
  permMock.mockResolvedValue({ granted: true });
  launchMock.mockResolvedValue({
    canceled: false,
    assets: [{ uri: 'file:///photo.jpg', fileName: 'photo.jpg', mimeType: 'image/jpeg' }],
  });
  successSpy = jest.spyOn(toast, 'success').mockImplementation(() => 'id');
  errorSpy = jest.spyOn(toast, 'error').mockImplementation(() => 'id');
});
afterEach(() => {
  successSpy.mockRestore();
  errorSpy.mockRestore();
});

async function renderScreen() {
  renderWithProviders(<RefundRequestScreen />);
  await screen.findByTestId('refund-submit-button');
}
const submit = () =>
  act(async () => {
    fireEvent.press(screen.getByTestId('refund-submit-button'));
  });

it('başlık ekran barında; gönder alt çubukta', async () => {
  await renderScreen();
  expect(screen.getByText('İade Talebi Oluştur')).toBeOnTheScreen();
  expect(within(screen.getByTestId('page-shell-footer')).getByText('Talep Oluştur')).toBeOnTheScreen();
});

it('vazgeçme (varsayılan): talep doğrudan gider, önce geri çıkılır sonra başarı toast', async () => {
  await renderScreen();
  await submit();

  await waitFor(() => expect(createMock).toHaveBeenCalledTimes(1));
  expect(createMock).toHaveBeenCalledWith('order-1', { reason: 'changed_mind' });
  await waitFor(() => expect(successSpy).toHaveBeenCalledWith('İade talebi oluşturuldu'));
  expect(backMock).toHaveBeenCalledTimes(1);
  expect(backMock.mock.invocationCallOrder[0]).toBeLessThan(successSpy.mock.invocationCallOrder[0]);
});

it('sunucu hatası: toast.error (string mesaj), ekran kalır, geri çıkılmaz', async () => {
  createMock.mockRejectedValueOnce({ response: { data: { message: 'Pencere kapandı' } } });
  await renderScreen();
  await submit();

  await waitFor(() => expect(errorSpy).toHaveBeenCalledWith('Pencere kapandı'));
  expect(successSpy).not.toHaveBeenCalled();
  expect(backMock).not.toHaveBeenCalled();
  expect(screen.getByTestId('refund-submit-button')).toBeOnTheScreen();
});

it('sunucu dizi mesajında yedek metin (orders paritesi)', async () => {
  createMock.mockRejectedValueOnce({ response: { data: { message: ['a', 'b'] } } });
  await renderScreen();
  await submit();
  await waitFor(() => expect(errorSpy).toHaveBeenCalledWith('İade talebi oluşturulamadı'));
});

it('kusur nedeni: etiketler zorunlu olur; eksik alanla istek gitmez, hatalar canlı', async () => {
  await renderScreen();
  expect(screen.getByText('Açıklama (isteğe bağlı)')).toBeOnTheScreen();
  expect(screen.getByText('Kanıt Fotoğrafı (isteğe bağlı)')).toBeOnTheScreen();

  fireEvent.press(screen.getByText('Hasarlı geldi'));
  expect(screen.getByText('Açıklama *')).toBeOnTheScreen();
  expect(screen.getByText('Kanıt fotoğrafları (maks 5) *')).toBeOnTheScreen();

  await submit();
  expect(await screen.findByText('Açıklama en az 20 karakter olmalıdır')).toBeOnTheScreen();
  expect(screen.getByTestId('refund-evidence-hint')).toHaveTextContent(
    'Bu sebep için en az bir kanıt fotoğrafı gereklidir',
  );
  expect(createMock).not.toHaveBeenCalled();
  expect(backMock).not.toHaveBeenCalled();

  // Vazgeçmeye dönünce kanıt/açıklama kuralı kalkar.
  await act(async () => {
    fireEvent.press(screen.getByText('Vazgeçtim / fikrim değişti'));
  });
  expect(screen.queryByText('Açıklama en az 20 karakter olmalıdır')).toBeNull();
  expect(screen.getByTestId('refund-evidence-hint')).not.toHaveTextContent(
    'Bu sebep için en az bir kanıt fotoğrafı gereklidir',
  );
});

it('şema yalnız t değişince yeniden kurulur (her tuşta değil)', async () => {
  const spy = jest.spyOn(schemaModule, 'refundRequestSchema');
  await renderScreen();
  const builds = spy.mock.calls.length;
  expect(builds).toBeGreaterThan(0);

  fireEvent.changeText(screen.getByTestId('refund-description-input'), 'a');
  fireEvent.changeText(screen.getByTestId('refund-description-input'), 'ab');
  fireEvent.press(screen.getByText('Hasarlı geldi'));

  expect(spy.mock.calls.length).toBe(builds);
  spy.mockRestore();
});

it('çok adetli siparişte adet seçilir ve kısmi iade adedi gönderilir', async () => {
  getMock.mockResolvedValue({ data: { data: order({ quantity: 3 }) } });
  await renderScreen();
  expect(screen.getByTestId('refund-qty-value')).toHaveTextContent('1');
  fireEvent.press(screen.getByTestId('refund-qty-inc'));
  expect(screen.getByTestId('refund-qty-value')).toHaveTextContent('2');
  await submit();
  await waitFor(() =>
    expect(createMock).toHaveBeenCalledWith('order-1', { reason: 'changed_mind', refundQuantity: 2 }),
  );
});

it('galeri izni yoksa mesaj kanıt alanının altında (diyalog yok)', async () => {
  permMock.mockResolvedValueOnce({ granted: false });
  await renderScreen();
  await act(async () => {
    fireEvent.press(screen.getByLabelText('Fotoğraf ekle'));
  });
  expect(screen.getByTestId('refund-evidence-hint')).toHaveTextContent(i18n.t('order.galleryPermissionBody'));
  expect(alertMock).not.toHaveBeenCalled();
});

describe('kanıt yüklemesi', () => {
  async function fillFaultClaim() {
    fireEvent.press(screen.getByText('Hasarlı geldi'));
    fireEvent.changeText(screen.getByTestId('refund-description-input'), LONG);
    fireEvent.press(screen.getByLabelText('Fotoğraf ekle'));
    await waitFor(() => expect(screen.getAllByTestId('refund-evidence-thumb')).toHaveLength(1));
  }

  it.each([
    ['URL döndürmeyen yükleme', () => uploadMock.mockResolvedValueOnce({ data: {} })],
    ['boş URL', () => uploadMock.mockResolvedValueOnce({ data: { url: '' } })],
    ['reddedilen yükleme', () => uploadMock.mockRejectedValueOnce(new Error('network'))],
  ])('%s: hata kanıt alanında, talep gitmez, ekran kalır', async (_label, arrange) => {
    arrange();
    await renderScreen();
    await fillFaultClaim();

    await submit();

    expect(screen.getByTestId('refund-evidence-hint')).toHaveTextContent(
      'Kanıt fotoğrafları yüklenemedi. Lütfen tekrar deneyin.',
    );
    expect(uploadMock).toHaveBeenCalledTimes(1);
    expect(createMock).not.toHaveBeenCalled();
    expect(backMock).not.toHaveBeenCalled();
    // Seçilen fotoğraf kaybolmaz — kullanıcı yeniden deneyebilir.
    expect(screen.getAllByTestId('refund-evidence-thumb')).toHaveLength(1);
  });

  it("bir fotoğraf URL'siz gelirse diğerinin URL'siyle de gönderilmez (hepsi ya da hiçbiri)", async () => {
    launchMock.mockResolvedValueOnce({
      canceled: false,
      assets: [
        { uri: 'file:///a.jpg', fileName: 'a.jpg', mimeType: 'image/jpeg' },
        { uri: 'file:///b.jpg', fileName: 'b.jpg', mimeType: 'image/jpeg' },
      ],
    });
    uploadMock.mockResolvedValueOnce({ data: { url: 'https://cdn/a.jpg' } }).mockResolvedValueOnce({ data: {} });
    await renderScreen();
    fireEvent.press(screen.getByText('Hasarlı geldi'));
    fireEvent.changeText(screen.getByTestId('refund-description-input'), LONG);
    fireEvent.press(screen.getByLabelText('Fotoğraf ekle'));
    await waitFor(() => expect(screen.getAllByTestId('refund-evidence-thumb')).toHaveLength(2));

    await submit();

    expect(screen.getByTestId('refund-evidence-hint')).toHaveTextContent(
      'Kanıt fotoğrafları yüklenemedi. Lütfen tekrar deneyin.',
    );
    expect(createMock).not.toHaveBeenCalled();
  });

  it('yükleme sürerken kullanıcı vazgeçip çıkarsa talep GÖNDERİLMEZ', async () => {
    let resolveUpload!: (v: unknown) => void;
    uploadMock.mockReturnValueOnce(new Promise((r) => (resolveUpload = r)));
    const view = renderWithProviders(<RefundRequestScreen />);
    await screen.findByTestId('refund-submit-button');
    await fillFaultClaim();
    await submit();
    expect(uploadMock).toHaveBeenCalledTimes(1);

    view.unmount();
    await act(async () => resolveUpload({ data: { url: 'https://cdn/x.jpg' } }));
    expect(createMock).not.toHaveBeenCalled();
    expect(backMock).not.toHaveBeenCalled();
  });

  it("yükleme başarılıysa URL'lerle gönderilir; yükleme talepten ÖNCE", async () => {
    await renderScreen();
    await fillFaultClaim();

    await submit();

    await waitFor(() => expect(createMock).toHaveBeenCalledTimes(1));
    expect(createMock).toHaveBeenCalledWith('order-1', {
      reason: 'damaged',
      description: LONG,
      evidencePhotoUrls: ['https://cdn/evidence.jpg'],
    });
    expect(uploadMock.mock.invocationCallOrder[0]).toBeLessThan(createMock.mock.invocationCallOrder[0]);
    await waitFor(() => expect(backMock).toHaveBeenCalledTimes(1));
  });
});

describe('kaydedilmemiş içerik koruması', () => {
  it('temiz form: geri çıkış serbest (onay yok)', async () => {
    await renderScreen();
    expect(emitBeforeRemove().prevented).toBe(false);
    expect(alertMock).not.toHaveBeenCalled();
  });

  it('kirli form: geri çıkış (geri oku / Android geri) onay ister; "Değişiklikleri Sil" çıkar', async () => {
    await renderScreen();
    fireEvent.changeText(screen.getByTestId('refund-description-input'), 'yarım kalan metin');

    const { prevented, action } = emitBeforeRemove();
    expect(prevented).toBe(true);
    expect(alertMock).toHaveBeenCalledTimes(1);
    const buttons = alertMock.mock.calls[0][2] as { text: string; onPress?: () => void }[];
    buttons.find((b) => b.text === i18n.t('common.discardChanges'))!.onPress!();
    expect(navigationDispatchMock).toHaveBeenCalledWith(action);
  });

  it('başarılı gönderimden sonra çıkış onaysız', async () => {
    await renderScreen();
    fireEvent.changeText(screen.getByTestId('refund-description-input'), 'not');
    await submit();
    await waitFor(() => expect(backMock).toHaveBeenCalledTimes(1));
    expect(emitBeforeRemove().prevented).toBe(false);
  });
});

it('sipariş bulunamazsa boş durum', async () => {
  getMock.mockRejectedValue(new Error('404'));
  renderWithProviders(<RefundRequestScreen />);
  expect(await screen.findByText('Sipariş bulunamadı')).toBeOnTheScreen();
});
