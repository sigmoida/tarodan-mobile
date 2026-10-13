import React from 'react';
import { View, Pressable } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Avatar, IconButton, Alert as UIAlert, Text, theme, Icon } from '@/ui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import ReportModal from '@/components/ReportModal';
import { styles } from '../_lib/styles';
import type { MessageThreadController } from '../_hooks/useMessageThread';

const { colors, iconSize } = theme;

/**
 * Sohbet üst bölümü (web ChatHeader: beyaz bar, geri + avatar + ad/ürün + menü), şikayet
 * modalı, ürün bağlantı satırı ve uyarılar. PageShell'in `header` slotuna konur.
 */
export function MessageThreadHeader({ f }: { f: MessageThreadController }) {
  const { t } = useTranslation();
  const { other, currentThread } = f;
  const insets = useSafeAreaInsets();
  return (
    <>
      {/* Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, theme.spacing[3]) }]}>
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
        >
          <Icon name="chevron-left" size={iconSize.lg} color={colors.text.heading} />
        </Pressable>

        <Pressable
          style={styles.headerContent}
          onPress={() => other && router.push(`/seller/${other.id}`)}
        >
          <Avatar
            size="md"
            source={other?.avatarUrl || undefined}
            name={other?.displayName?.charAt(0) || '?'}
          />
          <View style={styles.headerInfo}>
            <Text variant="label" numberOfLines={1}>{other?.displayName || t('common.loading')}</Text>
            {currentThread?.product && (
              <Text variant="caption" tone="primary" numberOfLines={1}>
                {currentThread.product.title}
              </Text>
            )}
          </View>
        </Pressable>

        <IconButton
          icon="ellipsis-vertical"
          accessibilityLabel={t('common.more')}
          size="md"
          onPress={f.handleHeaderMenu}
        />
      </View>

      {other && (
        <ReportModal
          visible={f.showReportModal}
          onDismiss={() => f.setShowReportModal(false)}
          type="user"
          targetId={other.id}
          targetName={other.displayName}
        />
      )}

      {/* Product Banner */}
      {currentThread?.product && (
        <Pressable
          style={styles.productBanner}
          onPress={() => router.push(`/product/${currentThread.product?.id}`)}
        >
          <Text variant="bodySm" tone="primary" style={styles.productBannerText} numberOfLines={1}>
            {currentThread.product.title}
          </Text>
          <Icon name="chevron-right" size={iconSize.sm} color={colors.text.muted} />
        </Pressable>
      )}

      {/* Message Limit Warning */}
      {!f.canSend && (
        // Limit platform genelinde tek değer (katmana göre değişmez); yükseltme vaadi yok.
        <View style={styles.alertWrap}>
          <UIAlert variant="warning">{t('message.dailyLimitReached', { count: f.messageLimit })}</UIAlert>
        </View>
      )}

      {/* İçerik filtresi uyarısı */}
      {f.filterWarning ? (
        <View style={styles.alertWrap}>
          <UIAlert variant="warning">{f.filterWarning}</UIAlert>
        </View>
      ) : null}
    </>
  );
}
