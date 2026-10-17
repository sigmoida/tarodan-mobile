/**
 * ReportModal — web ile aynı TEK neden listesi; gönderince ÖNCE kapanır (modal mutation
 * beklemez, src/ui/CLAUDE.md › iOS modal rule), sonuç toast. Açıklama < 10 karakterse gönderilmez (web ile aynı).
 */
import React from 'react';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils';

jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  userReportsApi: { create: jest.fn() },
}));
jest.mock('@/ui', () => ({
  ...jest.requireActual('@/ui'),
  appAlert: jest.fn(),
  toast: Object.assign(jest.fn(), { success: jest.fn(), error: jest.fn() }),
}));

import { userReportsApi } from '@/lib/api';
import { toast } from '@/ui';
import ReportModal, { type ReportTargetType } from '../ReportModal';

const createMock = userReportsApi.create as jest.Mock;

function setup(type: ReportTargetType = 'product') {
  const onDismiss = jest.fn();
  const onSuccess = jest.fn();
  renderWithProviders(
    <ReportModal visible onDismiss={onDismiss} onSuccess={onSuccess} type={type} targetId="t1" targetName="Ferrari F40" />,
  );
  return { onDismiss, onSuccess };
}

beforeEach(() => {
  createMock.mockReset();
  (toast.success as jest.Mock).mockClear();
  (toast.error as jest.Mock).mockClear();
});

describe('ReportModal', () => {
  it.each(['product', 'user', 'collection', 'message'] as const)(
    '%s: web ile aynı 6 neden, aynı sırada',
    (type) => {
      setup(type);
      const reasons = screen
        .getAllByTestId(/^report-reason-/)
        .map((n) => n.props.testID as string);
      expect(reasons).toEqual([
        'report-reason-spam',
        'report-reason-inappropriate_content',
        'report-reason-harassment',
        'report-reason-fake_product',
        'report-reason-scam',
        'report-reason-other',
      ]);
    },
  );

  it('neden seçilmeden gönder pasif', () => {
    setup();
    fireEvent.press(screen.getByTestId('report-submit-button'));
    expect(createMock).not.toHaveBeenCalled();
  });

  it('gönderince önce kapanır, sonra istek gider; başarıda toast.success + onSuccess', async () => {
    createMock.mockResolvedValue({ data: {} });
    const { onDismiss, onSuccess } = setup();
    fireEvent.press(screen.getByTestId('report-reason-scam'));
    fireEvent.press(screen.getByTestId('report-submit-button'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
    await waitFor(() =>
      expect(createMock).toHaveBeenCalledWith({
        type: 'product',
        targetId: 't1',
        reason: 'scam',
        description: undefined,
      }),
    );
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Rapor gönderildi. Ekibimiz inceleyecektir.'));
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });

  it('10+ karakter açıklama kırpılıp gönderilir; kısa açıklama gönderilmez', async () => {
    createMock.mockResolvedValue({ data: {} });
    setup('user');
    fireEvent.press(screen.getByTestId('report-reason-spam'));
    fireEvent.changeText(screen.getByTestId('report-description-input'), '  kısa  ');
    fireEvent.press(screen.getByTestId('report-submit-button'));
    await waitFor(() => expect(createMock).toHaveBeenCalledTimes(1));
    expect(createMock.mock.calls[0][0].description).toBeUndefined();
  });

  it('uzun açıklama gönderilir', async () => {
    createMock.mockResolvedValue({ data: {} });
    setup('user');
    fireEvent.press(screen.getByTestId('report-reason-harassment'));
    fireEvent.changeText(screen.getByTestId('report-description-input'), '  yeterince uzun bir açıklama  ');
    fireEvent.press(screen.getByTestId('report-submit-button'));
    await waitFor(() => expect(createMock).toHaveBeenCalledTimes(1));
    expect(createMock.mock.calls[0][0]).toMatchObject({
      type: 'user',
      reason: 'harassment',
      description: 'yeterince uzun bir açıklama',
    });
  });

  it('hata: toast.error (modal zaten kapalı), zamanlayıcı yok', async () => {
    createMock.mockRejectedValue({ response: { data: { message: 'Çok fazla istek' } } });
    const { onDismiss, onSuccess } = setup();
    fireEvent.press(screen.getByTestId('report-reason-other'));
    fireEvent.press(screen.getByTestId('report-submit-button'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Çok fazla istek'));
    expect(onSuccess).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('iptal: istek yok, kapanır', () => {
    const { onDismiss } = setup();
    act(() => {
      fireEvent.press(screen.getByTestId('report-cancel-button'));
    });
    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(createMock).not.toHaveBeenCalled();
  });
});
