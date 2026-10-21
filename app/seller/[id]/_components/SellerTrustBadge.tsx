import React, { useState } from 'react';
import { Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/ui';
import {
  SELLER_TRUST_LEVELS,
  SELLER_TRUST_LEVEL_I18N_KEYS,
  formatTrustRating,
  type SellerTrustView,
} from '@/types/seller-trust';

import { SellerTrustInfoSheet } from '../_modals/SellerTrustInfoSheet';

/**
 * Trust score badge of the seller header (web `SellerTrustBadge`). Renders nothing without a
 * `trust` block (non-premium seller, or an API without the block) or for a level this client does
 * not know (contract: an unknown future level shows no badge). It never falls back to the legacy
 * `trustScore` out of 100. Pressing it opens the "how is it calculated" sheet.
 */
export function SellerTrustBadge({ trust }: { trust: SellerTrustView | null | undefined }) {
  const { t, i18n } = useTranslation();
  const [infoOpen, setInfoOpen] = useState(false);

  if (!trust || !(SELLER_TRUST_LEVELS as readonly string[]).includes(trust.level)) return null;

  const label =
    trust.level === 'new' || trust.rating === null
      ? t('seller.trustScore.badgeNew')
      : t('seller.trustScore.badge', {
          rating: formatTrustRating(trust.rating, i18n.language),
          level: t(SELLER_TRUST_LEVEL_I18N_KEYS[trust.level]),
        });

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}. ${t('seller.trustScore.info.title')}`}
        onPress={() => setInfoOpen(true)}
        testID="seller-trust-badge"
      >
        <Badge variant="warning" size="sm">
          {label}
        </Badge>
      </Pressable>
      <SellerTrustInfoSheet isOpen={infoOpen} onClose={() => setInfoOpen(false)} />
    </>
  );
}
