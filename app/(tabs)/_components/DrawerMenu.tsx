import React, { useCallback, useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Button, Divider, Icon, Text, theme } from '@/ui';
import { useSideMenu } from '@/components/shell/SideMenuContext';
import { useAuthStore } from '@/stores/authStore';
import { useSideMenuStore } from '@/stores/sideMenuStore';
import { useHomeBadges } from '../_hooks/useHomeBadges';
import {
  buildProfileMenuGroups,
  selectDrawerSections,
  type ProfileBadgeKey,
  type ProfileMenuGroup,
} from '../_lib/profileMenu';
import { DrawerMenuRow } from './DrawerMenuRow';

const { spacing, iconSize, minTouchTarget, inactiveIconColor } = theme;

/** Bir grubun açılır-kapanır başlığı + (açıksa) satırları. */
function DrawerSection({
  group,
  badges,
  onNavigate,
}: {
  group: ProfileMenuGroup;
  badges: Partial<Record<ProfileBadgeKey, number>>;
  onNavigate: (to: string) => void;
}) {
  const collapsed = useSideMenuStore((s) => !!s.collapsed[group.key]);
  const toggle = useSideMenuStore((s) => s.toggle);
  const expanded = !collapsed;
  return (
    <View testID={`side-menu-section-${group.key}`}>
      <Pressable
        testID={`side-menu-section-${group.key}-toggle`}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        onPress={() => toggle(group.key)}
        style={styles.sectionHeader}
      >
        <Text variant="label" weight="bold" style={styles.sectionTitle} numberOfLines={1}>
          {group.title}
        </Text>
        <Icon
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={iconSize.md}
          color={inactiveIconColor}
        />
      </Pressable>
      {expanded
        ? group.items.map((item) => (
            <DrawerMenuRow
              key={item.key}
              item={item}
              count={item.badgeKey ? (badges[item.badgeKey] ?? 0) : 0}
              onPress={onNavigate}
            />
          ))
        : null}
    </View>
  );
}

/**
 * Ana Sayfa yan menüsünün içeriği (`SideMenuHost` içinde). Gruplar `profileMenu.ts`'ten
 * (`selectDrawerSections`): üstte sabit Favoriler, altında açılır-kapanır başlıklar. Misafirde
 * üstte Giriş Yap / Kayıt Ol, altında yalnız misafire açık gruplar. Satıra basınca ÖNCE menü
 * kapanır, sonra yönlendirilir.
 */
export function DrawerMenu() {
  const { t } = useTranslation();
  const { close } = useSideMenu();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const badges = useHomeBadges(isAuthenticated);

  const sections = useMemo(
    () => selectDrawerSections(buildProfileMenuGroups(t), { isGuest: !isAuthenticated }),
    [t, isAuthenticated],
  );

  const go = useCallback(
    (to: string) => {
      // Çift basış: kapanış animasyonu sürerken SideMenuHost kökü pointerEvents='none'.
      close();
      router.push(to as never);
    },
    [close],
  );

  return (
    <ScrollView
      testID="side-menu-scroll"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.content}
    >
      {!isAuthenticated ? (
        <View style={styles.guest} testID="side-menu-guest">
          <Button
            testID="side-menu-login"
            variant="primary"
            size="md"
            fullWidth
            title={t('auth.loginTitle')}
            onPress={() => go('/(auth)/login')}
          />
          <Button
            testID="side-menu-register"
            variant="outline"
            size="md"
            fullWidth
            title={t('auth.freeSignUp')}
            onPress={() => go('/(auth)/register')}
          />
        </View>
      ) : null}
      {sections.map((group, index) => (
        <View key={group.key}>
          {index > 0 || !isAuthenticated ? <Divider style={styles.divider} /> : null}
          {group.pinned ? (
            group.items.map((item) => <DrawerMenuRow key={item.key} item={item} onPress={go} />)
          ) : (
            <DrawerSection group={group} badges={badges} onNavigate={go} />
          )}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: spacing[4] },
  guest: { padding: spacing[4], gap: spacing[2] },
  divider: { marginVertical: spacing[1] },
  sectionHeader: {
    minHeight: minTouchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingHorizontal: spacing[4],
  },
  sectionTitle: { flex: 1 },
});
