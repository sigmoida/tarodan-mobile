/**
 * Kurumsal başvuru ekranı — üç sekme kompozisyonu. under_review iken detay/paydaş
 * formları ve gönder devre dışı; reddedilen belge yeniden yüklenebilir.
 */
import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => true },
}));

jest.mock('@/lib/api', () => ({
  sellerDocumentsApi: {
    list: jest.fn(() => Promise.resolve({ data: [] })),
    getApplication: jest.fn(() =>
      Promise.resolve({ data: { id: 'app-1', status: 'draft', stakeholders: [] } }),
    ),
    updateApplication: jest.fn(() => Promise.resolve({ data: {} })),
    addStakeholder: jest.fn(() => Promise.resolve({ data: {} })),
    submit: jest.fn(() => Promise.resolve({ data: {} })),
    appeal: jest.fn(() => Promise.resolve({ data: {} })),
  },
}));
import { sellerDocumentsApi } from '@/lib/api';

jest.mock('expo-document-picker', () => ({ getDocumentAsync: jest.fn(() => Promise.resolve({ canceled: true })) }));

import BusinessApplicationScreen from '../index';

beforeEach(() => jest.clearAllMocks());

it('üç sekmeyi gösterir ve detay sekmesiyle açılır', async () => {
  renderWithProviders(<BusinessApplicationScreen />);
  await waitFor(() => expect(screen.getByTestId('tab-details')).toBeTruthy());
  expect(screen.getByTestId('tab-stakeholders')).toBeTruthy();
  expect(screen.getByTestId('tab-documents')).toBeTruthy();
  expect(screen.getByTestId('details-taxId')).toBeTruthy();
});

it('detay bilgilerini kaydeder', async () => {
  renderWithProviders(<BusinessApplicationScreen />);
  await waitFor(() => expect(screen.getByTestId('details-taxId')).toBeTruthy());
  fireEvent.changeText(screen.getByTestId('details-taxId'), '1234567890');
  fireEvent.press(screen.getByTestId('details-save'));
  await waitFor(() =>
    expect(sellerDocumentsApi.updateApplication).toHaveBeenCalledWith(
      expect.objectContaining({ taxId: '1234567890' }),
    ),
  );
});

it('belgeler sekmesinde 7 belge türünü listeler', async () => {
  renderWithProviders(<BusinessApplicationScreen />);
  await waitFor(() => expect(screen.getByTestId('tab-documents')).toBeTruthy());
  fireEvent.press(screen.getByTestId('tab-documents'));
  await waitFor(() => expect(screen.getByTestId('doc-row-tax_plate')).toBeTruthy());
  for (const type of [
    'tax_plate', 'residence_or_invoice', 'signature_circular',
    'trade_registry_gazette', 'activity_certificate', 'bank_account_info', 'contract',
  ]) {
    expect(screen.getByTestId(`doc-row-${type}`)).toBeTruthy();
  }
});

it('under_review iken gönder butonu devre dışı', async () => {
  (sellerDocumentsApi.getApplication as jest.Mock).mockResolvedValue({
    data: { id: 'app-1', status: 'under_review', stakeholders: [] },
  });
  renderWithProviders(<BusinessApplicationScreen />);
  await waitFor(() => expect(screen.getByTestId('tab-documents')).toBeTruthy());
  fireEvent.press(screen.getByTestId('tab-documents'));
  await waitFor(() => expect(screen.getByTestId('application-submit')).toBeTruthy());
  expect(screen.getByTestId('application-submit').props.accessibilityState?.disabled).toBe(true);
});

it('reddedilen belgede itiraz aksiyonu sunar', async () => {
  (sellerDocumentsApi.list as jest.Mock).mockResolvedValue({
    data: [{ id: 'd1', documentType: 'tax_plate', fileName: 'a.pdf', status: 'rejected', uploadedAt: '', reviewNote: 'Okunmuyor' }],
  });
  renderWithProviders(<BusinessApplicationScreen />);
  await waitFor(() => expect(screen.getByTestId('tab-documents')).toBeTruthy());
  fireEvent.press(screen.getByTestId('tab-documents'));
  await waitFor(() => expect(screen.getByTestId('doc-appeal-tax_plate')).toBeTruthy());
  expect(screen.getByText('Okunmuyor')).toBeTruthy();
});

it('loadError durumunda ErrorState gösterir, "başvuru yok" demez', async () => {
  (sellerDocumentsApi.getApplication as jest.Mock).mockRejectedValue({
    response: { status: 500, data: { message: 'Sunucu hatası' } },
  });
  renderWithProviders(<BusinessApplicationScreen />);
  await waitFor(() => expect(screen.getByTestId('application-error')).toBeTruthy());
  expect(screen.queryByText(/Başvuru bulunamadı/i)).toBeNull();
});
