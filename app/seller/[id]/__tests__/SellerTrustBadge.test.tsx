/**
 * Seller trust badge (web `SellerTrustBadge`): reads `trust` only, shows only the rating number
 * (or "Yeni satıcı") formatted with the active language, keeps a descriptive accessible name,
 * hides on a missing/unknown block, and opens the explanation sheet.
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
  it('rated seller: only the number "3,74" (two decimals, tr separator), no label and no level', () => {
    render(<SellerTrustBadge trust={view(3.74, 'fair')} />);
    expect(screen.getByText('3,74')).toBeTruthy();
    expect(screen.queryByText(/Güven skoru/)).toBeNull();
    expect(screen.queryByText(/Orta/)).toBeNull();
  });

  it('always two decimals: 4 -> "4,00"', () => {
    render(<SellerTrustBadge trust={view(4, 'trusted')} />);
    expect(screen.getByText('4,00')).toBeTruthy();
  });

  it('English uses the dot separator and no label', async () => {
    await i18n.changeLanguage('en');
    render(<SellerTrustBadge trust={view(4.37, 'trusted')} />);
    expect(screen.getByText('4.37')).toBeTruthy();
    expect(screen.queryByText(/Trust score/)).toBeNull();
  });

  it('new seller: only "Yeni satıcı"', () => {
    render(<SellerTrustBadge trust={view(null, 'new')} />);
    expect(screen.getByText('Yeni satıcı')).toBeTruthy();
    expect(screen.queryByText(/Güven skoru/)).toBeNull();
  });

  it('a level "new" with a stray rating still shows only "Yeni satıcı"', () => {
    render(<SellerTrustBadge trust={view(3.1, 'new')} />);
    expect(screen.getByText('Yeni satıcı')).toBeTruthy();
    expect(screen.queryByText('3,10')).toBeNull();
  });

  it.each([
    ['null', null],
    ['absent', undefined],
    ['an unknown future level', view(4.2, 'legendary')],
  ])('renders nothing for %s', (_name, trust) => {
    render(<SellerTrustBadge trust={trust as never} />);
    expect(screen.queryByTestId('seller-trust-badge')).toBeNull();
  });

  it('is an accessible button: descriptive label, expanded state, 44 pt target', () => {
    render(<SellerTrustBadge trust={view(3.74, 'fair')} />);
    const badge = screen.getByTestId('seller-trust-badge');
    expect(badge.props.accessibilityRole).toBe('button');
    expect(badge.props.accessibilityLabel).toBe('Güven skoru 3,74/5, Orta. Güven skoru nasıl hesaplanır?');
    expect(badge.props.accessibilityState).toMatchObject({ expanded: false });
    // A 24 pt badge gets 10 pt vertical slop on each side (44 pt, theme.minTouchTarget).
    fireEvent(badge, 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 120, height: 24 } } });
    expect(screen.getByTestId('seller-trust-badge').props.hitSlop).toEqual({ top: 10, bottom: 10 });
    fireEvent.press(screen.getByTestId('seller-trust-badge'));
    expect(screen.getByTestId('seller-trust-badge').props.accessibilityState).toMatchObject({ expanded: true });
  });

  it('new seller: descriptive accessible name', () => {
    render(<SellerTrustBadge trust={view(null, 'new')} />);
    expect(screen.getByTestId('seller-trust-badge').props.accessibilityLabel).toBe(
      'Güven skoru: Yeni satıcı. Güven skoru nasıl hesaplanır?',
    );
  });

  it('English accessible name', async () => {
    await i18n.changeLanguage('en');
    render(<SellerTrustBadge trust={view(4.37, 'trusted')} />);
    expect(screen.getByTestId('seller-trust-badge').props.accessibilityLabel).toBe(
      'Trust score 4.37 out of 5, Trusted. How is the trust score calculated?',
    );
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
