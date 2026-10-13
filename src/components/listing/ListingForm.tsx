import React from 'react';
import { View, Platform, KeyboardAvoidingView } from 'react-native';
import Animated from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { useHeaderTopInset } from '@/ui';
import { PageShell } from '@/components/common/PageShell';
import { APP_SHELL_BAR_HEIGHT, useTabBarInset } from '@/components/shell/tabBarLayout';
import { useTabBarScrollHandler } from '@/components/shell/TabBarCollapse';

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

export type { ListingFormProps };

/**
 * Shared create/edit listing form. THIN screen: the `useListingForm` controller
 * owns all state/effects/mutations; this component only composes the gate,
 * sections, and picker modals. Consumed by `app/(tabs)/sell.tsx` (create) and
 * `app/listing/[id]/edit.tsx` (edit).
 */
export default function ListingForm({ mode, productId }: ListingFormProps) {
  const { t } = useTranslation();
  const f = useListingForm({ mode, productId });
  const tabInset = useTabBarInset();
  const onScroll = useTabBarScrollHandler();
  const topInset = useHeaderTopInset();

  const gate = ListingGates({ f });
  if (gate) return gate;

  // Oluşturma (sekme kökü): içerik yüzen alt menü hapının altında kalmasın -> alt dolgu tabInset.
  const form = (
    <Animated.ScrollView
      style={styles.scroll}
      onScroll={onScroll}
      scrollEventThrottle={16}
      contentContainerStyle={[styles.scrollContent, !f.isEdit && { paddingBottom: tabInset }]}
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
    </Animated.ScrollView>
  );

  // Düzenleme: standart beyaz üst bar (PageShell; klavye kaçınma da onda). Oluşturma: `sell`
  // sekme kökü (AppShell) içinde açılır, kendi üst barı/güvenli alanı yok.
  if (f.isEdit) {
    return (
      <PageShell
        title={t('product.editListing')}
        mode="static"
        padding={false}
        contentStyle={styles.container}
        overlay={<ListingPickers f={f} />}
      >
        {form}
      </PageShell>
    );
  }

  return (
    <View style={styles.container}>
      {/* Form AppShell barının ALTINDA: iOS padding kaçınması ekran üstünden ölçer -> bar kadar ofset. */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={topInset + APP_SHELL_BAR_HEIGHT}
      >
        {form}
      </KeyboardAvoidingView>

      <ListingPickers f={f} />
    </View>
  );
}
