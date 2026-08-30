import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { theme, Text } from '@/ui';

const { colors } = theme;

// NOT (§ göç raporu): bu bileşen ağacının bugün HİÇBİR çağıranı yok (repo
// genelinde grep — sıfır sonuç); `seller.badge*` anahtarları farklı sözcüklerle
// aynı işi yapan GÜNCEL rozet sistemi gibi görünüyor. Yine de dosya bu slice'ın
// kapsamında adıyla anıldığı için modül-seviyesi dondurma kusuru düzeltildi —
// `label`ler artık `build*Config(t)` fabrikalarından, ÇAĞRI ANINDA gelir.
// `description`/`criteria` alanları JSX'te hiç render EDİLMİYOR (yalnız `icon`,
// `color`, `label` kullanılıyor) — çevrilmedi, bkz. rapor.

// Reputation levels based on users.txt
export type ReputationLevel = 'rising_star' | 'trusted_seller' | 'elite_collector' | 'hall_of_fame';
export type SpecialRecognition = 'fast_shipper' | 'fair_trader' | 'responsive' | 'collector_expert' | 'community_champion';

interface ReputationBadgeProps {
  level: ReputationLevel;
  showLabel?: boolean;
  size?: 'small' | 'medium' | 'large';
  onPress?: () => void;
}

type ReputationConfigEntry = {
  icon: string;
  label: string;
  description: string;
  color: string;
  backgroundColor: string;
  criteria: string;
};

/**
 * `label` artık `t()` ile çözülür (çağrı anında); `description`/`criteria`
 * hiç render edilmediği için TR olarak bırakıldı (üstteki nota bakın).
 */
function buildReputationConfig(t: TFunction): Record<ReputationLevel, ReputationConfigEntry> {
  return {
    rising_star: {
      icon: 'star-rising',
      label: t('reputation.risingStarLabel'),
      description: '10-50 başarılı işlem, 4.5+ puan',
      color: colors.success[600]!,
      backgroundColor: colors.success[50]!,
      criteria: '10-50 işlem, 4.5+',
    },
    trusted_seller: {
      icon: 'shield-check',
      label: t('reputation.trustedSellerLabel'),
      description: '50-200 başarılı işlem, 4.7+ puan',
      color: colors.info[600]!,
      backgroundColor: colors.info[50]!,
      criteria: '50-200 işlem, 4.7+',
    },
    elite_collector: {
      icon: 'trophy',
      label: t('reputation.eliteCollectorLabel'),
      description: '200+ başarılı işlem, 4.8+ puan',
      color: colors.primary[700]!,
      backgroundColor: colors.primary[50]!,
      criteria: '200+ işlem, 4.8+',
    },
    hall_of_fame: {
      icon: 'crown',
      label: t('reputation.hallOfFameLabel'),
      description: '500+ işlem, 4.9+ puan, 2+ yıl üyelik',
      color: colors.warning[600]!,
      backgroundColor: colors.warning[50]!,
      criteria: '500+ işlem, 4.9+, 2+ yıl',
    },
  };
}

const SIZE_CONFIG = {
  small: { iconSize: 16, fontSize: 10, padding: theme.spacing[1] },
  medium: { iconSize: 20, fontSize: 12, padding: theme.spacing[1.5] },
  large: { iconSize: 28, fontSize: 14, padding: theme.spacing[2.5] },
};

export const ReputationBadge: React.FC<ReputationBadgeProps> = ({
  level,
  showLabel = true,
  size = 'medium',
  onPress,
}) => {
  const { t } = useTranslation();
  const config = buildReputationConfig(t)[level];
  const sizeConfig = SIZE_CONFIG[size];

  const badgeStyle = [
    styles.badge,
    {
      backgroundColor: config.backgroundColor,
      padding: sizeConfig.padding,
      paddingHorizontal: sizeConfig.padding * 1.5,
    },
  ];

  const content = (
    <>
      <MaterialCommunityIcons
        name={config.icon as any}
        size={sizeConfig.iconSize}
        color={config.color}
      />
      {showLabel && (
        <Text style={[styles.label, { color: config.color, fontSize: sizeConfig.fontSize }]}>
          {config.label}
        </Text>
      )}
    </>
  );

  if (onPress) {
    return (
      <TouchableOpacity style={badgeStyle} onPress={onPress}>
        {content}
      </TouchableOpacity>
    );
  }

  return <View style={badgeStyle}>{content}</View>;
};

// Special Recognition Badges
interface SpecialRecognitionBadgeProps {
  type: SpecialRecognition;
  size?: 'small' | 'medium';
}

type RecognitionConfigEntry = {
  icon: string;
  iconType: 'material' | 'ionicons';
  label: string;
  description: string;
  color: string;
};

/** `label` çağrı anında `t()` ile çözülür; `description` render edilmez (üstteki nota bakın). */
function buildRecognitionConfig(t: TFunction): Record<SpecialRecognition, RecognitionConfigEntry> {
  return {
    fast_shipper: {
      icon: 'rocket',
      iconType: 'ionicons',
      label: t('reputation.fastShipperLabel'),
      description: '95%+ ürünler 24 saat içinde gönderildi',
      color: colors.info[600]!,
    },
    fair_trader: {
      icon: 'handshake',
      iconType: 'material',
      label: t('reputation.fairTraderLabel'),
      description: '90%+ takas memnuniyeti',
      color: colors.success[600]!,
    },
    responsive: {
      icon: 'chatbubbles',
      iconType: 'ionicons',
      label: t('reputation.responsiveLabel'),
      description: 'Ortalama yanıt süresi < 2 saat',
      color: colors.primary[700]!,
    },
    collector_expert: {
      icon: 'school',
      iconType: 'material',
      label: t('reputation.collectorExpertLabel'),
      description: 'Belirli marka/kategoride uzmanlaşma',
      color: colors.warning[600]!,
    },
    community_champion: {
      icon: 'people',
      iconType: 'ionicons',
      label: t('reputation.communityChampionLabel'),
      description: 'Yüksek topluluk katılımı',
      color: colors.danger[600]!,
    },
  };
}

export const SpecialRecognitionBadge: React.FC<SpecialRecognitionBadgeProps> = ({
  type,
  size = 'small',
}) => {
  const { t } = useTranslation();
  const config = buildRecognitionConfig(t)[type];
  const iconSize = size === 'small' ? 14 : 18;

  return (
    <View style={[styles.recognitionBadge, { borderColor: colors.border.subtle }]}>
      {config.iconType === 'material' ? (
        <MaterialCommunityIcons name={config.icon as any} size={iconSize} color={config.color} />
      ) : (
        <Ionicons name={config.icon as any} size={iconSize} color={config.color} />
      )}
      <Text style={[styles.recognitionLabel, { color: config.color }]}>
        {config.label}
      </Text>
    </View>
  );
};

// Reputation Score Display
interface ReputationScoreProps {
  rating: number;
  totalReviews: number;
  level?: ReputationLevel;
  specialRecognitions?: SpecialRecognition[];
}

export const ReputationScore: React.FC<ReputationScoreProps> = ({
  rating,
  totalReviews,
  level,
  specialRecognitions = [],
}) => {
  const { t } = useTranslation();
  const renderStars = () => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;

    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(
          <Ionicons key={i} name="star" size={18} color={colors.warning[500]!} />
        );
      } else if (i === fullStars && hasHalfStar) {
        stars.push(
          <Ionicons key={i} name="star-half" size={18} color={colors.warning[500]!} />
        );
      } else {
        stars.push(
          <Ionicons key={i} name="star-outline" size={18} color={colors.warning[500]!} />
        );
      }
    }
    return stars;
  };

  return (
    <View style={styles.scoreContainer}>
      <View style={styles.scoreHeader}>
        <View style={styles.starsContainer}>{renderStars()}</View>
        <Text style={styles.ratingText}>{(rating ?? 0).toFixed(1)}</Text>
        <Text style={styles.reviewCount}>{t('reputation.reviewCount', { count: totalReviews })}</Text>
      </View>

      {level && (
        <View style={styles.levelContainer}>
          <ReputationBadge level={level} size="small" />
        </View>
      )}

      {specialRecognitions.length > 0 && (
        <View style={styles.recognitionsContainer}>
          {specialRecognitions.map((recognition, index) => (
            <SpecialRecognitionBadge key={index} type={recognition} size="small" />
          ))}
        </View>
      )}
    </View>
  );
};

// Rating Breakdown Component (for Product Accuracy, Communication, etc.)
interface RatingBreakdownProps {
  productAccuracy: number;
  communication: number;
  shipping: number;
  tradeFairness?: number;
}

export const RatingBreakdown: React.FC<RatingBreakdownProps> = ({
  productAccuracy,
  communication,
  shipping,
  tradeFairness,
}) => {
  const { t } = useTranslation();
  const categories = [
    { label: t('reputation.productAccuracy'), value: productAccuracy, weight: '40%' },
    // review.communication / product.shipping REUSE — aynı sözcük, ayrı kopya değil.
    { label: t('review.communication'), value: communication, weight: '20%' },
    { label: t('product.shipping'), value: shipping, weight: '20%' },
    ...(tradeFairness !== undefined
      ? [{ label: t('reputation.tradeFairness'), value: tradeFairness, weight: '20%' }]
      : []),
  ];

  return (
    <View style={styles.breakdownContainer}>
      {categories.map((category, index) => (
        <View key={index} style={styles.breakdownRow}>
          <Text style={styles.breakdownLabel}>{category.label}</Text>
          <View style={styles.breakdownBarContainer}>
            <View
              style={[
                styles.breakdownBar,
                { width: `${(category.value / 5) * 100}%` },
              ]}
            />
          </View>
          <Text style={styles.breakdownValue}>{(category.value ?? 0).toFixed(1)}</Text>
          <Text style={styles.breakdownWeight}>({category.weight})</Text>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    gap: theme.spacing[1],
  },
  label: {
    fontWeight: '600',
  },
  recognitionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing[2],
    paddingVertical: theme.spacing[1],
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    backgroundColor: colors.surface.DEFAULT,
    marginRight: theme.spacing[1.5],
    marginBottom: theme.spacing[1.5],
  },
  recognitionLabel: {
    fontSize: 10,
    fontWeight: '500',
    marginLeft: theme.spacing[1],
  },
  scoreContainer: {
    backgroundColor: colors.surface.DEFAULT,
    borderRadius: 12,
    padding: theme.spacing[3],
  },
  scoreHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starsContainer: {
    flexDirection: 'row',
  },
  ratingText: {
    marginLeft: theme.spacing[2],
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.heading,
  },
  reviewCount: {
    marginLeft: theme.spacing[1],
    fontSize: 12,
    color: colors.text.muted,
  },
  levelContainer: {
    marginTop: theme.spacing[2],
  },
  recognitionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: theme.spacing[2],
  },
  breakdownContainer: {
    paddingVertical: theme.spacing[2],
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing[2],
  },
  breakdownLabel: {
    width: 100,
    fontSize: 12,
    color: colors.text.muted,
  },
  breakdownBarContainer: {
    flex: 1,
    height: 8,
    backgroundColor: colors.border.DEFAULT,
    borderRadius: theme.radius.md,
    marginHorizontal: theme.spacing[2],
    overflow: 'hidden',
  },
  breakdownBar: {
    height: '100%',
    backgroundColor: colors.warning[500]!,
    borderRadius: theme.radius.md,
  },
  breakdownValue: {
    width: 30,
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.heading,
    textAlign: 'right',
  },
  breakdownWeight: {
    width: 40,
    fontSize: 10,
    color: colors.text.muted,
    textAlign: 'right',
  },
});

export default ReputationBadge;
