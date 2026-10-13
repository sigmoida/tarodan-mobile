import React from 'react';
import { View, ScrollView, Platform, KeyboardAvoidingView, Pressable } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { theme, RawText } from '@/ui';
import { useTabBarInset } from '@/components/shell/tabBarLayout';

import { styles } from './_lib/styles';
import type { ListingFormProps } from './_lib/types';
import { useListingForm } from './_hooks/useListingForm';
import { ListingGates } from './_components/ListingGates';
import {
  ListingHeaderBanners,
  ListingImagesSection,
  ListingBasicInfoSection,
  ListingDetailsSection,
  ListingOptionsSection,
  ListingPricingSection,
  ListingShippingSection,
  ListingSubmitRow,
} from './_components/ListingSections';
import { ListingPickers } from './_components/ListingPickers';
import { ListingRequirementGate } from './_components/ListingRequirementGate';
import { listingGatesBlock } from './_lib/gates';

const { colors } = theme;

export type { ListingFormProps };

/**
 * Shared create/edit listing form. THIN screen: the `useListingForm` controller
 * owns all state/effects/mutations; this component only composes the gate,
 * sections, and picker modals. Consumed by `app/(tabs)/sell.tsx` (create) and
 * `app/listing/[id]/edit.tsx` (edit).
 */
export default function ListingForm({ mode, productId, embedded = false }: ListingFormProps) {
  const { t } = useTranslation();
  const f = useListingForm({ mode, productId });
  const insets = useSafeAreaInsets();
  const tabInset = useTabBarInset();

  const gate = ListingGates({ f, embedded });
  if (gate) return gate;

  return (
    <SafeAreaView style={styles.container} edges={f.isEdit ? ['bottom'] : embedded ? [] : ['top', 'bottom']}>
      {f.isEdit && (
        <View style={[styles.header, { paddingTop: Math.max(insets.top, theme.spacing[3]) }]}>
          <Pressable onPress={() => router.back()} hitSlop={8} accessibilityRole="button" accessibilityLabel={t('common.back')}>
            <Ionicons name="arrow-back" size={24} color={colors.white} />
          </Pressable>
          <RawText style={styles.headerTitle}>{t('product.editListing')}</RawText>
          <View style={{ width: 24 }} />
        </View>
      )}

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, embedded && { paddingBottom: tabInset }]}
          keyboardShouldPersistTaps="handled"
        >
          <ListingHeaderBanners f={f} />
          {/* Web gibi: IBAN ve kargo adresi ön koşulları, form ancak ikisi de açıkken görünür. */}
          {listingGatesBlock(f) ? (
            <ListingRequirementGate f={f} />
          ) : (
            <>
              <ListingImagesSection f={f} />
              <ListingBasicInfoSection f={f} />
              <ListingDetailsSection f={f} />
              <ListingOptionsSection f={f} />
              <ListingPricingSection f={f} />
              <ListingShippingSection f={f} />
              <ListingSubmitRow f={f} />
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <ListingPickers f={f} />
    </SafeAreaView>
  );
}
