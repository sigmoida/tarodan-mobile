/**
 * Seller trust badge (web `SellerTrustBadge`): reads `trust` only, formats the rating with the
 * active language, hides on a missing/unknown block, and opens the explanation sheet.
 */
import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import { renderWithProviders as render } from '@/test-utils';
import i18n from '@/i18n/config';
import { SELLER_TRUST_MIN_COUNTERPARTIES, SELLER_TRUST_MIN_TRANSACTIONS } from '@/types/seller-trust';

import { SellerTrustBadge } from '../_components/SellerTrustBadge';

const view = (rating: number | null, level: string) => ({ rating, level, formulaVersion: 1 }) as never;

beforeEach(async () => {
  await i18n.changeLanguage('tr');
});

describe('SellerTrustBadge', () => {
  it('rated seller: "Güven skoru 3,74/5 · Orta" (two decimals, tr separator)', () => {
    render(<SellerTrustBadge trust={view(3.74, 'fair')} />);
    expect(screen.getByText('Güven skoru 3,74/5 · Orta')).toBeTruthy();
  });

  it('always two decimals: 4 -> "4,00"', () => {
    render(<SellerTrustBadge trust={view(4, 'trusted')} />);
    expect(screen.getByText('Güven skoru 4,00/5 · Güvenilir')).toBeTruthy();
  });

  it('English uses the dot separator and the en level label', async () => {
    await i18n.changeLanguage('en');
    render(<SellerTrustBadge trust={view(4.37, 'trusted')} />);
    expect(screen.getByText('Trust score 4.37/5 · Trusted')).toBeTruthy();
  });

  it('new seller: "Güven skoru: Yeni satıcı"', () => {
    render(<SellerTrustBadge trust={view(null, 'new')} />);
    expect(screen.getByText('Güven skoru: Yeni satıcı')).toBeTruthy();
  });

  it.each([
    ['null', null],
    ['absent', undefined],
    ['an unknown future level', view(4.2, 'legendary')],
  ])('renders nothing for %s', (_name, trust) => {
    render(<SellerTrustBadge trust={trust as never} />);
    expect(screen.queryByTestId('seller-trust-badge')).toBeNull();
  });

  it('is an accessible button: label starts with the visible text, expanded state, 44 pt target', () => {
    render(<SellerTrustBadge trust={view(3.74, 'fair')} />);
    const badge = screen.getByTestId('seller-trust-badge');
    expect(badge.props.accessibilityRole).toBe('button');
    expect(badge.props.accessibilityLabel).toBe('Güven skoru 3,74/5 · Orta. Güven skoru nasıl hesaplanır?');
    expect(badge.props.accessibilityState).toMatchObject({ expanded: false });
    // A 24 pt badge gets 10 pt vertical slop on each side (44 pt, theme.minTouchTarget).
    fireEvent(badge, 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 120, height: 24 } } });
    expect(screen.getByTestId('seller-trust-badge').props.hitSlop).toEqual({ top: 10, bottom: 10 });
    fireEvent.press(screen.getByTestId('seller-trust-badge'));
    expect(screen.getByTestId('seller-trust-badge').props.accessibilityState).toMatchObject({ expanded: true });
  });

  it('pressing the badge opens the info sheet with both minimums in the new-seller line', () => {
    render(<SellerTrustBadge trust={view(3.74, 'fair')} />);
    expect(screen.queryByText('Güven skoru nasıl hesaplanır?')).toBeNull();
    fireEvent.press(screen.getByTestId('seller-trust-badge'));
    expect(screen.getByText('Güven skoru nasıl hesaplanır?')).toBeTruthy();
    expect(screen.getByText(i18n.t('seller.trustScore.info.ratings'))).toBeTruthy();
    expect(screen.getByText(i18n.t('seller.trustScore.info.updated'))).toBeTruthy();
    expect(
      screen.getByText(
        `En az ${SELLER_TRUST_MIN_TRANSACTIONS} tamamlanmış işlemi ve ${SELLER_TRUST_MIN_COUNTERPARTIES} farklı alıcısı olmayan satıcılar "Yeni satıcı" olarak görünür.`,
      ),
    ).toBeTruthy();
  });
});
