/**
 * Günlük limit uyarısı (C3 inceleme 5): limit platform genelinde TEK değer, katmana
 * göre değişmez ve dijital satış kapalı. Dijital satış AÇIK bir derlemede bile
 * "Premium ile sınırsız mesaj" vaadi çıkmaz; web gibi yalnız sunucunun limiti söylenir.
 */
import React from 'react';
import { render, screen } from '@testing-library/react-native';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true) },
}));
jest.mock('@/lib/purchases', () => ({ CAN_BUY_DIGITAL: true }));
jest.mock('@/components/ReportModal', () => () => null);
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (k: string, p?: Record<string, unknown>) => `${k}${p ? JSON.stringify(p) : ''}`,
  }),
}));

import { MessageThreadHeader } from '../_components/MessageThreadHeader';

function ctrl(over: Record<string, unknown> = {}): any {
  return {
    other: { id: 'u2', displayName: 'Ayşe' },
    currentThread: null,
    canSend: true,
    messageLimit: 50,
    filterWarning: null,
    showReportModal: false,
    setShowReportModal: jest.fn(),
    handleHeaderMenu: jest.fn(),
    ...over,
  };
}

describe('MessageThreadHeader — günlük limit', () => {
  it('limit dolunca sunucunun limitini söyler; yükseltme/Premium metni yok (dijital satış açık olsa da)', () => {
    render(<MessageThreadHeader f={ctrl({ canSend: false, messageLimit: 30 })} />);
    expect(screen.getByText('message.dailyLimitReached{"count":30}')).toBeOnTheScreen();
    expect(screen.queryByText(/dailyLimitWarning/)).toBeNull();
    expect(screen.queryByText(/goPremium|Premium|sınırsız/i)).toBeNull();
  });

  it('hak kaldıysa uyarı yok', () => {
    render(<MessageThreadHeader f={ctrl()} />);
    expect(screen.queryByText(/dailyLimit/)).toBeNull();
  });
});
