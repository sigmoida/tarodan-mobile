import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Chip, theme } from '@/ui';
import type { TabType } from '../_lib/types';

/** Gelen / giden teklif sekmeleri (web Tabs karşılığı: iki eşit chip). */
export function OffersTabs({
  activeTab,
  onChange,
}: {
  activeTab: TabType;
  onChange: (tab: TabType) => void;
}) {
  const { t } = useTranslation();
  const tabs: { key: TabType; label: string }[] = [
    { key: 'received', label: t('offer.tabReceived') },
    { key: 'sent', label: t('offer.tabSent') },
  ];
  return (
    <View style={styles.container}>
      {tabs.map(({ key, label }) => (
        <Chip
          key={key}
          label={label}
          selected={activeTab === key}
          onPress={() => onChange(key)}
          style={styles.tab}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', gap: theme.spacing[2] },
  tab: { flex: 1 },
});
