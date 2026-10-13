import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Text, theme } from '@/ui';

export type RegisterAccountKind = 'individual' | 'corporate';

const { colors, spacing, radius, minTouchTarget, shadow } = theme;

/**
 * Kayıt ekranlarının üstündeki Bireysel / Kurumsal başvuru sekmeleri (web `RegisterAccountTabs`):
 * iki eşit sütun, gri hap kutuda; seçili sekme beyaz hap (hafif gölge) + başlık rengi metin,
 * diğeri muted — üst bardaki cam/hap diliyle uyumlu, vurgu rengi yok. Sekmeler iki ayrı ROTAYA
 * gider (web'de de ayrı sayfalar); `replace` ile — geri tuşuyla sekmeler arasında dolaşılmaz.
 */
export const RegisterAccountTabs: React.FC<{ active: RegisterAccountKind }> = ({ active }) => {
  const { t } = useTranslation();
  const items: { id: RegisterAccountKind; label: string; href: string }[] = [
    { id: 'individual', label: t('auth.individualApplication'), href: '/(auth)/register' },
    { id: 'corporate', label: t('auth.corporateApplication'), href: '/(auth)/register-business' },
  ];

  return (
    <View style={styles.list} accessibilityRole="tablist">
      {items.map((item) => {
        const selected = item.id === active;
        return (
          <Pressable
            key={item.id}
            testID={`register-tab-${item.id}`}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => {
              if (!selected) router.replace(item.href as never);
            }}
            style={[styles.tab, selected && styles.tabActive]}
          >
            <Text variant="bodySm" weight="semibold" tone={selected ? 'heading' : 'muted'}>
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  list: {
    flexDirection: 'row',
    gap: 0,
    padding: spacing[1],
    borderRadius: radius.full,
    backgroundColor: colors.surface.alt,
  },
  tab: {
    flex: 1,
    minHeight: minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[3],
    borderRadius: radius.full,
  },
  tabActive: {
    backgroundColor: colors.surface.elevated,
    ...shadow.soft,
  },
});

export default RegisterAccountTabs;
