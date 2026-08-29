import React from 'react';
import { useTranslation } from 'react-i18next';
import { View, ScrollView, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Modal, Button, Switch, Chip, Input, Text, theme } from '@/ui';

import { styles } from '../_lib/styles';
import type { DiscountsController } from '../_hooks/useDiscounts';

const { colors } = theme;

/** Create/edit discount form dialog. */
export function DiscountFormModal({ f }: { f: DiscountsController }) {
  const { t } = useTranslation();
  const { form, setForm } = f;
  return (
    <Modal
      isOpen={f.formOpen}
      onClose={() => f.setFormOpen(false)}
      title={form.id ? t('discount.editTitle') : t('discount.newTitle')}
    >
      <ScrollView style={styles.dialogScroll}>
        <View style={{ paddingVertical: theme.spacing[2] }}>
          <Input
            label={t('discount.nameLabel')}
            value={form.name}
            onChangeText={(v: string) => setForm({ ...form, name: v })}
            containerStyle={styles.input}
          />
          <Input
            label={t('discount.descriptionLabel')}
            value={form.description}
            onChangeText={(v: string) => setForm({ ...form, description: v })}
            multiline
            numberOfLines={2}
            containerStyle={styles.input}
          />
          <Input
            label={t('discount.couponCodeLabel')}
            value={form.code}
            onChangeText={(v: string) => setForm({ ...form, code: v.toUpperCase() })}
            autoCapitalize="characters"
            containerStyle={styles.input}
          />

          <Text style={styles.sectionLabel}>{t('discount.typeLabel')}</Text>
          <View style={styles.toggleRow}>
            <Chip
              label={t('discount.typePercent')}
              selected={form.type === 'percentage'}
              variant={form.type === 'percentage' ? 'primary' : 'neutral'}
              onPress={() => setForm({ ...form, type: 'percentage' })}
            />
            <Chip
              label={t('discount.typeFixed')}
              selected={form.type === 'fixed_amount'}
              variant={form.type === 'fixed_amount' ? 'primary' : 'neutral'}
              onPress={() => setForm({ ...form, type: 'fixed_amount' })}
            />
          </View>

          <Input
            label={form.type === 'percentage' ? t('discount.valueLabelPercent') : t('discount.valueLabelFixed')}
            value={form.value}
            onChangeText={(v: string) => setForm({ ...form, value: v.replace(',', '.') })}
            keyboardType="numeric"
            containerStyle={styles.input}
          />

          <Text style={styles.sectionLabel}>{t('discount.scopeLabel')}</Text>
          <View style={styles.toggleRow}>
            <Chip
              label={t('discount.scopeAllStore')}
              selected={form.scope === 'seller'}
              variant={form.scope === 'seller' ? 'primary' : 'neutral'}
              onPress={() => setForm({ ...form, scope: 'seller', targetProductIds: [] })}
            />
            <Chip
              label={t('discount.scopeSelected')}
              selected={form.scope === 'product'}
              variant={form.scope === 'product' ? 'primary' : 'neutral'}
              onPress={() => setForm({ ...form, scope: 'product' })}
            />
          </View>

          {form.scope === 'product' ? (
            <Pressable
              style={styles.productPickerRow}
              onPress={() => f.setProductPickerOpen(true)}
            >
              <Ionicons name="cube-outline" size={20} color={colors.primary[600]!} />
              <Text style={styles.productPickerText}>
                {form.targetProductIds.length > 0
                  ? `${form.targetProductIds.length} ürün seçildi`
                  : t('discount.pickProducts')}
              </Text>
              <Ionicons name="chevron-forward" size={18} color={colors.text.subtle} />
            </Pressable>
          ) : null}

          <Text style={styles.sectionLabel}>{t('discount.validityLabel')}</Text>
          <View style={styles.dateRow}>
            <Input
              label={t('discount.startLabel')}
              value={form.startDate}
              onChangeText={(v: string) => setForm({ ...form, startDate: v })}
              placeholder="2026-04-22"
              containerStyle={styles.dateInput}
            />
            <Input
              label={t('discount.endLabel')}
              value={form.endDate}
              onChangeText={(v: string) => setForm({ ...form, endDate: v })}
              placeholder="2026-05-22"
              containerStyle={styles.dateInput}
            />
          </View>

          <Text style={styles.sectionLabel}>{t('discount.limitsLabel')}</Text>
          <Input
            label={t('discount.minCartLabel')}
            value={form.minCartValue}
            onChangeText={(v: string) => setForm({ ...form, minCartValue: v.replace(',', '.') })}
            keyboardType="numeric"
            containerStyle={styles.input}
          />
          <Input
            label={t('discount.maxDiscountLabel')}
            value={form.maxDiscountAmount}
            onChangeText={(v: string) => setForm({ ...form, maxDiscountAmount: v.replace(',', '.') })}
            keyboardType="numeric"
            containerStyle={styles.input}
          />
          <Input
            label={t('discount.totalUsageLimit')}
            value={form.usageLimitTotal}
            onChangeText={(v: string) => setForm({ ...form, usageLimitTotal: v.replace(/[^0-9]/g, '') })}
            keyboardType="numeric"
            containerStyle={styles.input}
          />
          <Input
            label={t('discount.perUserLimit')}
            value={form.usageLimitPerUser}
            onChangeText={(v: string) => setForm({ ...form, usageLimitPerUser: v.replace(/[^0-9]/g, '') || '1' })}
            keyboardType="numeric"
            containerStyle={styles.input}
          />

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>{t('discount.stackable')}</Text>
            <Switch
              value={form.isStackable}
              onValueChange={(v: boolean) => setForm({ ...form, isStackable: v })}
            />
          </View>
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>{t('discount.active')}</Text>
            <Switch
              value={form.isActive}
              onValueChange={(v: boolean) => setForm({ ...form, isActive: v })}
            />
          </View>
        </View>
      </ScrollView>

      <View style={styles.dialogActions}>
        <Button
          variant="ghost"
          title={t('discount.discard')}
          onPress={() => f.setFormOpen(false)}
          disabled={f.saveMutation.isPending}
        />
        <Button
          variant="primary"
          title={form.id ? t('discount.update') : t('discount.create')}
          onPress={f.handleSubmit}
          isLoading={f.saveMutation.isPending}
          disabled={f.saveMutation.isPending}
        />
      </View>
    </Modal>
  );
}
