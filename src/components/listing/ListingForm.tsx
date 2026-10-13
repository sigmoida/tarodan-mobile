import React, { useMemo } from 'react';
import { View, KeyboardAvoidingView } from 'react-native';
import Animated from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { useKeyboardAvoid, usePageScrollValue, useShellPageScroll } from '@/ui';
import { PageShell } from '@/components/common/PageShell';
import { useTabBarInset } from '@/components/shell/tabBarLayout';
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
  ListingGlobalAttributesSection,
  ListingManufacturerAttributesSection,
  ListingOptionsSection,
  ListingPricingSection,
  ListingShippingSection,
  ListingSubmitBar,
  ListingDeleteButton,
  ListingRemovalOverlay,
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
 *
 * Gönder: düzenlemede `PageShell` alt çubuğu (klavyeyle birlikte yükselir, her zaman görünür);
 * oluşturmada sekme kökünde yüzen alt menü olduğundan formun sonunda (web `SubmitBar` gibi).
 */
export default function ListingForm({ mode, productId }: ListingFormProps) {
  const { t } = useTranslation();
  const f = useListingForm({ mode, productId });
  const tabInset = useTabBarInset();
  // Oluşturma (sekme kökü): iOS `KeyboardAvoidingView padding`, Android ölçülen klavye örtüşmesi kadar
  // alt dolgu (`PageShell` ile aynı kanca; düzenlemede klavyeyi PageShell kendisi karşılar).
  const keyboard = useKeyboardAvoid(!f.isEdit);
  const gate = ListingGates({ f });
  // Üst bar kaydırma sinyali: oluşturmada sekme kökünün (AppShell title) bağlamından, düzenlemede
  // kendi PageShell'ine verilen değerden. Kapı ekranında bağlanmaz (gövde bar altında kalır).
  const ownScroll = usePageScrollValue();
  const shellScroll = useShellPageScroll(!gate && !f.isEdit);
  const page = f.isEdit ? ownScroll : (shellScroll ?? ownScroll);
  // Tek handler hem alt menüyü hem üst barın kaydırma kenarını besler.
  const tabScroll = useTabBarScrollHandler(undefined, page.scrollY);
  // Oluşturma (sekme kökü): içerik yüzen alt menü hapının altında kalmasın -> alt dolgu tabInset.
  const tabPad = useMemo(() => (f.isEdit ? null : { paddingBottom: tabInset }), [f.isEdit, tabInset]);

  if (gate) return gate;

  const form = (
    <Animated.ScrollView
      style={styles.scroll}
      {...tabScroll}
      {...page.scrollProps}
      scrollEventThrottle={16}
      contentContainerStyle={page.contentStyle([styles.scrollContent, tabPad])}
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
          <ListingGlobalAttributesSection f={f} />
          <ListingManufacturerAttributesSection f={f} />
          <ListingOptionsSection f={f} />
          <ListingPricingSection f={f} />
          <ListingShippingSection f={f} />
          {f.isEdit ? <ListingDeleteButton f={f} /> : <ListingSubmitBar f={f} />}
        </>
      )}
    </Animated.ScrollView>
  );

  // Düzenleme: standart beyaz üst bar (PageShell; klavye kaçınma ve alt çubuk da onda).
  // Oluşturma: `sell` sekme kökü (AppShell) içinde açılır, kendi üst barı/güvenli alanı yok.
  if (f.isEdit) {
    return (
      <PageShell
        title={t('product.editListing')}
        mode="static"
        scroll={ownScroll}
        padding={false}
        contentStyle={styles.container}
        footer={<ListingSubmitBar f={f} />}
        overlay={
          <>
            <ListingPickers f={f} />
            <ListingRemovalOverlay f={f} />
          </>
        }
      >
        {form}
      </PageShell>
    );
  }

  return (
    <View style={styles.container}>
      {/* Form ekran tepesinden başlar (yüzen bar üstünde): klavye kaçınması için ofset gerekmez. */}
      {keyboard.behavior ? (
        <KeyboardAvoidingView style={styles.fill} behavior={keyboard.behavior}>
          {form}
        </KeyboardAvoidingView>
      ) : (
        <View style={[styles.fill, { paddingBottom: keyboard.bottomInset }]} onLayout={keyboard.onLayout}>
          {form}
        </View>
      )}

      <ListingPickers f={f} />
    </View>
  );
}
