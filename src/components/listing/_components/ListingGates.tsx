import React from 'react';
import { View, TouchableOpacity, ActivityIndicator, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { theme, RawText } from '@/ui';

import { styles } from '../_lib/styles';
import type { ListingFormController } from '../_hooks/useListingForm';

const { colors } = theme;

/**
 * Renders the appropriate loading / auth / not-found / reserved gate for the
 * form, or `null` when the form itself should render. Keeps the early-return
 * ladder out of the thin screen.
 */
export function ListingGates({ f, embedded = false }: { f: ListingFormController; embedded?: boolean }) {
  // Sekme kabuğunda (embedded) üst bar AppShell'den gelir; güvenli alan kenarı eklenmez.
  const edges = embedded && !f.isEdit ? ([] as const) : undefined;
  const { t } = useTranslation();
  const { authLoading, isEdit, productLoading, isAuthenticated, productNotFound, status } = f;

  if (authLoading || (isEdit && productLoading)) {
    return (
      <SafeAreaView style={styles.centered} edges={edges}>
        <ActivityIndicator size="large" color={colors.primary[600]!} />
      </SafeAreaView>
    );
  }

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.centered} edges={edges}>
        <RawText style={styles.authText}>{t('product.loginRequiredToCreate')}</RawText>
        <TouchableOpacity style={styles.primaryButton} onPress={() => router.push('/(auth)/login')}>
          <RawText style={styles.primaryButtonText}>{t('common.login')}</RawText>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (isEdit && productNotFound) {
    return (
      <SafeAreaView style={styles.centered} edges={edges}>
        <Ionicons name="alert-circle-outline" size={64} color={colors.danger[600]!} />
        <RawText style={[styles.authText, { marginTop: theme.spacing[4] }]}>{t('product.listingNotFound')}</RawText>
        <TouchableOpacity style={styles.primaryButton} onPress={() => router.back()}>
          <RawText style={styles.primaryButtonText}>{t('common.goBack')}</RawText>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (isEdit && status === 'reserved') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={8} accessibilityRole="button" accessibilityLabel={t('common.back')}>
            <Ionicons name="arrow-back" size={24} color={colors.white} />
          </Pressable>
          <RawText style={styles.headerTitle}>{t('product.editListing')}</RawText>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.centered}>
          <Ionicons name="lock-closed-outline" size={56} color={colors.warning[600]!} />
          <RawText style={[styles.authText, { marginTop: theme.spacing[4] }]}>
            {t('listing.reservedCannotEdit')}
          </RawText>
        </View>
      </SafeAreaView>
    );
  }

  return null;
}
