/**
 * Örnek komponent testi (RNTL) — Maestro'da dövüştüğümüz teklif validasyonunun
 * saniyenin altında, simülatör/backend olmadan, modal içeriği sorgulanabilir hâlde testi.
 * Strateji: docs/superpowers/specs/mobile-test-strategy.md
 */
import React from 'react';
import { appAlert, toast } from '@/ui';
import {  } from 'react-native';
import { screen, fireEvent, waitFor } from '@testing-library/react-native';
import MakeOfferModal from '../MakeOfferModal';
import { renderWithProviders } from '../../../test-utils';

// API'yi mock'la — ağ yok, deterministik.
jest.mock('@/lib/api', () => ({
  offersApi: { create: jest.fn(() => Promise.resolve({ data: { id: 'offer-1' } })) },
  publicSettingsApi: { getPublicSettings: jest.fn(() => Promise.resolve({ data: {} })) },
}));
import { offersApi, publicSettingsApi } from '@/lib/api';

// Maestro kapısı tek kaynaktan (`@/config/maestro`) okunur; testte değiştirilebilir.
let mockIsMaestro = false;
jest.mock('@/config/maestro', () => ({
  get IS_MAESTRO() {
    return mockIsMaestro;
  },
}));

const createMock = offersApi.create as jest.Mock;
const settingsMock = publicSettingsApi.getPublicSettings as jest.Mock;

function renderModal(props: Partial<React.ComponentProps<typeof MakeOfferModal>> = {}) {
  const onDismiss = jest.fn();
  const onSuccess = jest.fn();
  renderWithProviders(
    <MakeOfferModal
      visible
      onDismiss={onDismiss}
      onSuccess={onSuccess}
      productId="prod-1"
      productTitle="Test Ürünü"
      listPrice={390}
      {...props}
    />,
  );
  return { onDismiss, onSuccess };
}

describe('MakeOfferModal', () => {
  beforeEach(() => {
    createMock.mockClear();
    (appAlert as jest.Mock).mockImplementation(() => {});
  });

  it('tutar klavyesi: normalde numeric, IS_MAESTRO açıkken default (return tuşu için)', () => {
    mockIsMaestro = false;
    const first = renderWithProviders(
      <MakeOfferModal visible onDismiss={jest.fn()} productId="p" productTitle="T" listPrice={390} />,
    );
    expect(screen.getByTestId('offer-amount-input').props.keyboardType).toBe('numeric');
    first.unmount();

    mockIsMaestro = true;
    renderModal();
    expect(screen.getByTestId('offer-amount-input').props.keyboardType).toBe('default');
    mockIsMaestro = false;
  });

  it('boş tutarda Teklif Gönder devre dışı', () => {
    renderModal();
    expect(screen.getByTestId('offer-submit-button')).toBeDisabled();
  });

  it('geçerli tutar girilince buton aktifleşir ve teklif gönderilir', async () => {
    const { onSuccess } = renderModal();
    fireEvent.changeText(screen.getByTestId('offer-amount-input'), '200');
    expect(screen.getByTestId('offer-submit-button')).toBeEnabled();

    fireEvent.press(screen.getByTestId('offer-submit-button'));

    await waitFor(() => expect(createMock).toHaveBeenCalledTimes(1));
    expect(createMock).toHaveBeenCalledWith({
      productId: 'prod-1',
      amount: 200,
      message: undefined,
    });
    expect(onSuccess).toHaveBeenCalled();
  });

  it('liste fiyatının %50 altında teklif reddedilir (API çağrılmaz)', async () => {
    renderModal({ listPrice: 390 });
    fireEvent.changeText(screen.getByTestId('offer-amount-input'), '100'); // < 195
    fireEvent.press(screen.getByTestId('offer-submit-button'));

    // Hata artık modal-içi ModalMessage ile gösteriliyor (appAlert modal açıkken
    // iOS'u dondurduğu için; useModalMessage primitive'i). testID="modal-message".
    await waitFor(() =>
      expect(screen.getByText(/Minimum teklif/)).toBeOnTheScreen(),
    );
    expect(createMock).not.toHaveBeenCalled();
  });

  describe('admin fiyat tabanı (min_product_price)', () => {
    afterEach(() => settingsMock.mockImplementation(() => Promise.resolve({ data: {} })));

    it('taban altı teklif reddedilir (API çağrılmaz), çipler tabanın altını göstermez', async () => {
      settingsMock.mockImplementation(() => Promise.resolve({ data: { min_product_price: 340 } }));
      renderModal({ listPrice: 390 });
      // 390: -%5 = 371, -%10 = 351, -%15 = 332 (< 340 → düşer). Taban yüklenince çip kaybolur.
      await waitFor(() => expect(screen.queryByTestId('offer-preset-15')).toBeNull());
      expect(screen.getByTestId('offer-preset-10')).toBeOnTheScreen();

      fireEvent.changeText(screen.getByTestId('offer-amount-input'), '300'); // %50 üstü ama < 340
      fireEvent.press(screen.getByTestId('offer-submit-button'));
      await waitFor(() => expect(screen.getByText('Teklif en az 340,00 TL olmalıdır.')).toBeOnTheScreen());
      expect(createMock).not.toHaveBeenCalled();
    });

    it('tam tabandaki ilanda (fiyat = taban) taban altı teklif reddedilir', async () => {
      settingsMock.mockImplementation(() => Promise.resolve({ data: { min_product_price: 250 } }));
      renderModal({ listPrice: 250 });
      // Taban yüklenince tüm çipler (238/225/213 < 250) düşer.
      await waitFor(() => expect(screen.queryByTestId('offer-preset-5')).toBeNull());
      fireEvent.changeText(screen.getByTestId('offer-amount-input'), '130'); // %50 üstü ama < 250
      fireEvent.press(screen.getByTestId('offer-submit-button'));
      await waitFor(() => expect(screen.getByText('Teklif en az 250,00 TL olmalıdır.')).toBeOnTheScreen());
      expect(createMock).not.toHaveBeenCalled();
    });

    it('fiyat tabanın altındaysa (eski ucuz ilan) taban yok, pazarlık açık kalır', async () => {
      settingsMock.mockImplementation(() => Promise.resolve({ data: { min_product_price: 250 } }));
      renderModal({ listPrice: 200 });
      await waitFor(() => expect(settingsMock).toHaveBeenCalled());
      fireEvent.changeText(screen.getByTestId('offer-amount-input'), '150'); // >= %50, taban uygulanmaz
      fireEvent.press(screen.getByTestId('offer-submit-button'));
      await waitFor(() => expect(createMock).toHaveBeenCalledTimes(1));
    });
  });

  it('hızlı teklif çipleri: −%5/−%10/−%15 tam TL, dokununca tutarı doldurur', async () => {
    renderModal({ listPrice: 390 });
    expect(screen.getByTestId('offer-preset-5')).toBeOnTheScreen();
    expect(screen.getByText('-%10 · 351,00 TL')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('offer-preset-15')); // 390 × 0,85 = 331,5 → 332
    expect(screen.getByTestId('offer-amount-input').props.value).toBe('332');
    expect(screen.getByTestId('offer-preset-15').props.accessibilityState?.selected).toBe(true);
    // Serbest giriş de çalışır; çip seçimi düşer.
    fireEvent.changeText(screen.getByTestId('offer-amount-input'), '300');
    expect(screen.getByTestId('offer-preset-15').props.accessibilityState?.selected).toBe(false);
    fireEvent.press(screen.getByTestId('offer-preset-5'));
    fireEvent.press(screen.getByTestId('offer-submit-button'));
    await waitFor(() =>
      expect(createMock).toHaveBeenCalledWith({ productId: 'prod-1', amount: 371, message: undefined }),
    );
  });

  it('src/ui/CLAUDE.md › iOS modal rule: geçerli teklifte modal ÖNCE kapanır, gönderim sonra (sonuç beklenmez)', async () => {
    let resolveCreate: (v: unknown) => void = () => undefined;
    createMock.mockImplementationOnce(() => new Promise((r) => (resolveCreate = r)));
    const { onDismiss, onSuccess } = renderModal();
    fireEvent.changeText(screen.getByTestId('offer-amount-input'), '300');
    fireEvent.press(screen.getByTestId('offer-submit-button'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(createMock).toHaveBeenCalledWith({ productId: 'prod-1', amount: 300, message: undefined }));
    expect(onSuccess).not.toHaveBeenCalled();
    resolveCreate({ data: { id: 'offer-2' } });
    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
  });

  it('sunucu hatası modal kapandıktan sonra toast ile gösterilir', async () => {
    const errorSpy = jest.spyOn(toast, 'error');
    createMock.mockImplementationOnce(() => Promise.reject({ response: { status: 400, data: { message: 'Teklif reddedildi' } } }));
    const { onDismiss, onSuccess } = renderModal();
    fireEvent.changeText(screen.getByTestId('offer-amount-input'), '300');
    fireEvent.press(screen.getByTestId('offer-submit-button'));
    expect(onDismiss).toHaveBeenCalled();
    await waitFor(() => expect(errorSpy).toHaveBeenCalled());
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('doğrulama hatasında modal açık kalır (hata modal içinde)', async () => {
    const { onDismiss } = renderModal({ listPrice: 390 });
    fireEvent.changeText(screen.getByTestId('offer-amount-input'), '400');
    fireEvent.press(screen.getByTestId('offer-submit-button'));
    expect(onDismiss).not.toHaveBeenCalled();
    expect(createMock).not.toHaveBeenCalled();
  });

  it('çok düşük fiyatta liste fiyatına yuvarlanan çip çizilmez', () => {
    renderModal({ listPrice: 10 });
    expect(screen.queryByTestId('offer-preset-5')).toBeNull(); // 9,5 → 10 = liste fiyatı
    expect(screen.getByTestId('offer-preset-10')).toBeOnTheScreen(); // 9
  });
});
