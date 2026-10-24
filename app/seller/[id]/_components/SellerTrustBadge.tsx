import React, { useState } from 'react';
import { Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  Badge,
  androidRipple,
  pressedStyle,
  rippleClip,
  showPressedStyle,
  touchSlop,
} from '@/ui';
import {
  SELLER_TRUST_LEVELS,
  SELLER_TRUST_LEVEL_I18N_KEYS,
  formatTrustRating,
  type SellerTrustView,
} from '@/types/seller-trust';

import { styles } from '../_lib/styles';
import { SellerTrustInfoSheet } from '../_modals/SellerTrustInfoSheet';

/**
 * Trust score badge of the seller header (web `SellerTrustBadge`). Shows only the rating number
 * (or "New seller"), no label and no level. Renders nothing without a
 * `trust` block (non-premium seller, or an API without the block) or for a level this client does
 * not know (contract: an unknown future level shows no badge). It never falls back to the legacy
 * `trustScore` out of 100. Pressing it opens the "how is it calculated" sheet.
 *
 * The badge keeps the web size; `hitSlop` from its measured height (dynamic type grows it) closes
 * the gap to the 44 pt touch target.
 */
export function SellerTrustBadge({ trust }: { trust: SellerTrustView | null | undefined }) {
  const { t, i18n } = useTranslation();
  const [infoOpen, setInfoOpen] = useState(false);
  const [height, setHeight] = useState(0);

  if (!trust || !(SELLER_TRUST_LEVELS as readonly string[]).includes(trust.level)) return null;

  // Visible text is compact (number or "New seller"); the descriptive sentence is the a11y name.
  const rating =
    trust.level === 'new' || trust.rating === null ? null : formatTrustRating(trust.rating, i18n.language);
  const label = rating === null ? t('seller.trustScore.badgeNew') : t('seller.trustScore.badge', { rating });
  const a11yLabel =
    rating === null
      ? t('seller.trustScore.a11yLabelNew')
      : t('seller.trustScore.a11yLabel', { rating, level: t(SELLER_TRUST_LEVEL_I18N_KEYS[trust.level]) });

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${a11yLabel}. ${t('seller.trustScore.info.title')}`}
        accessibilityState={{ expanded: infoOpen }}
        onPress={() => setInfoOpen(true)}
        onLayout={(e) => setHeight(e.nativeEvent.layout.height)}
        hitSlop={height > 0 ? touchSlop(height) : undefined}
        android_ripple={androidRipple()}
        style={({ pressed }) => [styles.trustBadge, rippleClip(), showPressedStyle(pressed) && pressedStyle]}
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
