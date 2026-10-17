import React from 'react';
import { View } from 'react-native';
import { Avatar, Badge, Button, SectionCard, Text, ButtonRow } from '@/ui';
import { useTranslation } from 'react-i18next';

import { styles } from '../_lib/styles';
import { BADGE_LABEL } from '../_lib/constants';
import type { SellerProfileController } from '../_hooks/useSellerProfile';

function Metric({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <View style={styles.metric}>
      <Text variant="h2">{value}</Text>
      <Text variant="caption" tone="muted">
        {label}
      </Text>
    </View>
  );
}

/**
 * Satıcı başlık kartı (web `SellerHeader`): avatar, ad + rozetler (Premium / Doğrulanmış / Güven),
 * üyelik tarihi, Mesaj + Takip düğmeleri ve 2×2 sayaç ızgarası (İlanlar, Satışlar, Takas,
 * Takipçi). Ortalama puan değerlendirmeler kartının başlığında. Şikayet/engelle üst bardaki menüde.
 */
export function SellerProfileCard({ f }: { f: SellerProfileController }) {
  const { t } = useTranslation();
  const { seller, products } = f;
  // Avatar yanında yalnız üyelik tarihi; puan değerlendirmeler kartında, takipçi sayaç ızgarasında.
  const memberSince = seller.createdAt
    ? t('seller.memberSincePrefix', {
        date: new Date(seller.createdAt).toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' }),
      })
    : null;

  return (
    <SectionCard testID="seller-header">
      <View style={styles.header}>
        <View style={styles.identity}>
          <Avatar
            size="lg"
            source={seller.avatarUrl}
            name={seller.displayName?.substring(0, 2).toUpperCase() || 'S'}
          />
          <View style={styles.identityInfo}>
            <View style={styles.nameRow}>
              <Text variant="h2" numberOfLines={1} style={styles.name}>
                {seller.displayName}
              </Text>
              {seller.isVerified ? (
                <Badge variant="success" size="sm">
                  {t('seller.verified')}
                </Badge>
              ) : null}
              {seller.isPremium && typeof seller.trustScore === 'number' ? (
                <Badge variant="warning" size="sm">
                  {t('seller.trustScoreLabel', { score: seller.trustScore })}
                  {seller.trustLevel ? t('seller.trustScoreLevelSuffix', { level: seller.trustLevel }) : ''}
                </Badge>
              ) : null}
            </View>
            {seller.location ? (
              <Text variant="caption" tone="subtle">
                {seller.location}
              </Text>
            ) : null}
            {memberSince ? (
              <Text variant="bodySm" tone="subtle">
                {memberSince}
              </Text>
            ) : null}
          </View>
        </View>

        {seller.badges && seller.badges.length > 0 ? (
          <View style={styles.nameRow}>
            {seller.badges.map((badge: string) =>
              BADGE_LABEL[badge] ? (
                <Badge key={badge} variant="outline" size="sm">
                  {t(BADGE_LABEL[badge]!)}
                </Badge>
              ) : null,
            )}
          </View>
        ) : null}

        {seller.bio ? (
          <Text variant="bodySm" tone="muted">
            {seller.bio}
          </Text>
        ) : null}

        {!f.isOwnProfile ? (
          <ButtonRow>
            <Button title={t('common.message')} onPress={f.handleMessage} />
            <Button
              variant={f.isFollowingSeller ? 'secondary' : 'outline'}
              title={f.isFollowingSeller ? t('seller.following') : t('seller.follow')}
              onPress={f.handleToggleFollow}
              isLoading={f.followBusy}
            />
          </ButtonRow>
        ) : null}
        {!f.isAuthenticated && !f.isOwnProfile ? (
          <Text variant="caption" tone="muted">
            {t('seller.loginToMessage')}
          </Text>
        ) : null}

        <View style={styles.metrics}>
          <Metric label={t('common.listings')} value={seller.stats?.totalListings ?? products.length} />
          <Metric label={t('common.sales')} value={seller.stats?.totalSales ?? 0} />
          <Metric label={t('auth.heroStatTrades')} value={seller.stats?.totalTrades ?? 0} />
          <Metric label={t('profile.followers')} value={seller.followersCount ?? 0} />
        </View>
      </View>
    </SectionCard>
  );
}
