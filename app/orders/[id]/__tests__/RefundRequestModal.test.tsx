/**
 * RefundRequestModal — kendi `useZodForm` + şema + mutasyonunun sahibi (CLAUDE.md §6/§7).
 *
 * - iOS: mutasyonun geri bildirimi açık bir ui-native Modal'ın üstüne çıkmasın diye
 *   modal mutasyondan ÖNCE kapanır.
 * - Kapatınca neden, açıklama, adet ve kanıt fotoğrafları sıfırlanır.
 * - Şema yalnız `t` değişince yeniden kurulur (memo).
 */
import React, { useState } from 'react';
import { Pressable, Text } from 'react-native';
import { act, screen, fireEvent, waitFor, within } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils';
import i18n from '@/i18n/config';

jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
  MediaTypeOptions: { Images: 'Images' },
}));
jest.mock('@/lib/api', () => ({
  refundsApi: { create: jest.fn() },
  mediaApi: { uploadRefundEvidence: jest.fn() },
}));
jest.mock('@/services/sentry', () => ({ captureException: jest.fn(), addBreadcrumb: jest.fn(), setUser: jest.fn() }));

import * as ImagePicker from 'expo-image-picker';
import { mediaApi, refundsApi } from '@/lib/api';
import * as schemaModule from '../_lib/schema';
import * as refundHook from '../_hooks/useDoRefundRequest';
import { RefundRequestModal } from '../_modals/RefundRequestModal';
import { FALLBACK_TIMING_POLICY, timingMessageValues } from '@/lib/shared/timingPolicy';

const createMock = refundsApi.create as jest.Mock;
const uploadMock = mediaApi.uploadRefundEvidence as jest.Mock;
const permMock = ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock;
const launchMock = ImagePicker.launchImageLibraryAsync as jest.Mock;

const TITLE = 'İade Talebi Oluştur';
const LONG = 'Kutunun bir köşesi ezik, aynası kırık geldi.';

function Harness({ onClose, notify = jest.fn() }: { onClose?: () => void; notify?: jest.Mock }) {
  const [visible, setVisible] = useState(true);
  return (
    <>
      <Pressable testID="open-refund" onPress={() => setVisible(true)}>
        <Text>aç</Text>
      </Pressable>
      <RefundRequestModal
        visible={visible}
        onClose={() => {
          onClose?.();
          setVisible(false);
        }}
        orderId="order-1"
        orderQuantity={1}
        notify={notify}
        timingValues={timingMessageValues(FALLBACK_TIMING_POLICY)}
      />
    </>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  createMock.mockResolvedValue({ data: {} });
  uploadMock.mockResolvedValue({ data: { url: 'https://cdn/evidence.jpg' } });
  permMock.mockResolvedValue({ granted: true });
  launchMock.mockResolvedValue({
    canceled: false,
    assets: [{ uri: 'file:///photo.jpg', fileName: 'photo.jpg', mimeType: 'image/jpeg' }],
  });
});

it('gönderim: talep gider, modal kapanır, başarı snackbar ekranda', async () => {
  const onClose = jest.fn();
  const notify = jest.fn();
  renderWithProviders(<Harness onClose={onClose} notify={notify} />);

  fireEvent.press(screen.getByText('Talep Oluştur'));

  await waitFor(() => expect(createMock).toHaveBeenCalledTimes(1));
  expect(createMock).toHaveBeenCalledWith('order-1', { reason: 'changed_mind' });
  expect(screen.queryByText(TITLE)).toBeNull();
  await waitFor(() => expect(notify).toHaveBeenCalledWith('İade talebiniz oluşturuldu.', 'success'));
});

it('onClose, mutate çağrısından ÖNCE çalışır', async () => {
  const mutate = jest.fn();
  const spy = jest
    .spyOn(refundHook, 'useDoRefundRequest')
    .mockReturnValue({ mutate, isPending: false } as unknown as ReturnType<typeof refundHook.useDoRefundRequest>);
  const onClose = jest.fn();
  renderWithProviders(<Harness onClose={onClose} />);

  fireEvent.press(screen.getByText('Talep Oluştur'));

  await waitFor(() => expect(mutate).toHaveBeenCalledTimes(1));
  expect(onClose).toHaveBeenCalledTimes(1);
  expect(onClose.mock.invocationCallOrder[0]).toBeLessThan(mutate.mock.invocationCallOrder[0]);
  spy.mockRestore();
});

it('kapatınca neden, açıklama ve kanıt sıfırlanır', async () => {
  renderWithProviders(<Harness />);

  fireEvent.press(screen.getByText('Hasarlı geldi'));
  fireEvent.changeText(screen.getByTestId('refund-description-input'), LONG);
  fireEvent.press(screen.getByLabelText('Fotoğraf ekle'));
  await waitFor(() => expect(screen.getAllByTestId('refund-evidence-thumb')).toHaveLength(1));

  fireEvent.press(screen.getByText('Vazgeç'));
  expect(screen.queryByText(TITLE)).toBeNull();

  fireEvent.press(screen.getByTestId('open-refund'));
  expect(screen.getByText(TITLE)).toBeOnTheScreen();
  expect(within(screen.getByRole('radio', { checked: true })).queryByText('Hasarlı geldi')).toBeNull();
  expect(screen.getByText('Kanıt Fotoğrafı (isteğe bağlı)')).toBeOnTheScreen();
  expect(screen.getByTestId('refund-description-input').props.value).toBe('');
  expect(screen.queryAllByTestId('refund-evidence-thumb')).toHaveLength(0);
  expect(createMock).not.toHaveBeenCalled();
});

it('kusur nedeninde eksik alanla istek gitmez, modal açık kalır ve hatalar görünür', async () => {
  const onClose = jest.fn();
  renderWithProviders(<Harness onClose={onClose} />);

  fireEvent.press(screen.getByText('Hasarlı geldi'));
  fireEvent.press(screen.getByText('Talep Oluştur'));

  expect(await screen.findByText('Açıklama en az 20 karakter olmalıdır')).toBeOnTheScreen();
  expect(screen.getByTestId('refund-evidence-hint')).toHaveTextContent(
    'Bu sebep için en az bir kanıt fotoğrafı gereklidir',
  );
  expect(onClose).not.toHaveBeenCalled();
  expect(createMock).not.toHaveBeenCalled();

  // Hatalar canlı: vazgeçmeye dönünce kanıt/açıklama kuralı kalkar.
  await act(async () => {
    fireEvent.press(screen.getByText('Vazgeçtim / fikrim değişti'));
  });
  expect(screen.queryByText('Açıklama en az 20 karakter olmalıdır')).toBeNull();
  expect(screen.getByTestId('refund-evidence-hint')).not.toHaveTextContent(
    'Bu sebep için en az bir kanıt fotoğrafı gereklidir',
  );
});

it('şema yalnız t değişince yeniden kurulur (her tuşta değil)', () => {
  const spy = jest.spyOn(schemaModule, 'refundRequestSchema');
  renderWithProviders(<Harness />);
  const builds = spy.mock.calls.length;
  expect(builds).toBeGreaterThan(0);

  fireEvent.changeText(screen.getByTestId('refund-description-input'), 'a');
  fireEvent.changeText(screen.getByTestId('refund-description-input'), 'ab');
  fireEvent.press(screen.getByText('Hasarlı geldi'));

  expect(spy.mock.calls.length).toBe(builds);
  spy.mockRestore();
});

/**
 * İnceleme 1 · URL döndürmeyen kanıt yüklemesi eskiden sessizce eleniyordu;
 * talep kanıtsız gidip sunucudan `400 evidenceRequired` alıyordu. Artık yükleme
 * hatası sayılır: hata modalın içinde görünür ve talep gönderilmez.
 */
describe('kanıt yüklemesi', () => {
  // Yükleme → setError zinciri asenkron; act içinde boşaltılır.
  const submit = () =>
    act(async () => {
      fireEvent.press(screen.getByText('Talep Oluştur'));
    });

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
  ])('%s: hata modalda, talep gitmez, modal açık kalır', async (_label, arrange) => {
    arrange();
    const onClose = jest.fn();
    renderWithProviders(<Harness onClose={onClose} />);
    await fillFaultClaim();

    await submit();

    expect(screen.getByTestId('refund-evidence-hint')).toHaveTextContent(
      'Kanıt fotoğrafları yüklenemedi. Lütfen tekrar deneyin.',
    );
    expect(uploadMock).toHaveBeenCalledTimes(1);
    expect(createMock).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByText(TITLE)).toBeOnTheScreen();
    // Seçilen fotoğraf kaybolmaz — kullanıcı yeniden deneyebilir.
    expect(screen.getAllByTestId('refund-evidence-thumb')).toHaveLength(1);
  });

  it('bir fotoğraf URL\'siz gelirse diğerinin URL\'siyle de gönderilmez (hepsi ya da hiçbiri)', async () => {
    launchMock.mockResolvedValueOnce({
      canceled: false,
      assets: [
        { uri: 'file:///a.jpg', fileName: 'a.jpg', mimeType: 'image/jpeg' },
        { uri: 'file:///b.jpg', fileName: 'b.jpg', mimeType: 'image/jpeg' },
      ],
    });
    uploadMock.mockResolvedValueOnce({ data: { url: 'https://cdn/a.jpg' } }).mockResolvedValueOnce({ data: {} });
    renderWithProviders(<Harness />);
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

  it('yükleme başarılıysa URL\'lerle gönderilir; modal talepten ÖNCE kapanır', async () => {
    const onClose = jest.fn();
    renderWithProviders(<Harness onClose={onClose} />);
    await fillFaultClaim();

    await submit();

    await waitFor(() => expect(createMock).toHaveBeenCalledTimes(1));
    expect(createMock).toHaveBeenCalledWith('order-1', {
      reason: 'damaged',
      description: LONG,
      evidencePhotoUrls: ['https://cdn/evidence.jpg'],
    });
    expect(onClose.mock.invocationCallOrder[0]).toBeLessThan(createMock.mock.invocationCallOrder[0]);
    expect(uploadMock.mock.invocationCallOrder[0]).toBeLessThan(onClose.mock.invocationCallOrder[0]);
  });
});

/** İnceleme 7 · Zorunlu/isteğe bağlı etiketlerin ikisi de katalogdan (string birleştirme yok). */
describe('alan etiketleri', () => {
  it('kusur nedeninde zorunlu etiketler, vazgeçmede isteğe bağlı etiketler', () => {
    renderWithProviders(<Harness />);
    expect(screen.getByText('Açıklama (isteğe bağlı)')).toBeOnTheScreen();
    expect(screen.getByText('Kanıt Fotoğrafı (isteğe bağlı)')).toBeOnTheScreen();

    fireEvent.press(screen.getByText('Hasarlı geldi'));
    expect(screen.getByText('Açıklama *')).toBeOnTheScreen();
    expect(screen.getByText('Kanıt fotoğrafları (maks 5) *')).toBeOnTheScreen();
  });

  it('zorunlu etiket anahtarları iki dilde de var', () => {
    const en = i18n.getFixedT('en');
    expect(en('order.descriptionRequiredLabel')).toBe('Description *');
    expect(en('order.evidencePhotosRequiredLabel', { max: 5 })).toBe('Evidence photos (max 5) *');
    expect(en('order.descriptionOptionalLabel')).toBe('Description (optional)');
  });
});
