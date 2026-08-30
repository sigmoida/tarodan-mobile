import React from 'react';
import { View, Image, TouchableOpacity } from 'react-native';
import { Input, Text, theme } from '@/ui';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { styles } from '../_lib/styles';

const { colors } = theme;

const cap = (n: number) => (n > 99 ? '99+' : String(n));

export interface HomeBadgeCounts {
  messageUnreadCount: number;
  unreadCount: number;
  favCount: number;
  cartCount: number;
}

export function HomeHeader({
  searchQuery,
  onChangeSearch,
  onSearch,
  counts,
}: {
  searchQuery: string;
  onChangeSearch: (v: string) => void;
  onSearch: () => void;
  counts: HomeBadgeCounts;
}) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  return (
    <View style={[styles.header, { paddingTop: Math.max(insets.top, theme.spacing[3]) }]}>
      <View style={styles.headerTop}>
        <View style={styles.logoContainer}>
          <Image source={require('../../../assets/tarodan-logo.png')} style={styles.logoImage} resizeMode="contain" />
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerIconBtn} onPress={() => router.push('/messages')}>
            <Ionicons name="chatbubbles-outline" size={24} color={colors.white} />
            {counts.messageUnreadCount > 0 && (
              <View style={styles.headerBadge}>
                <Text style={styles.headerBadgeText}>{cap(counts.messageUnreadCount)}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerIconBtn} onPress={() => router.push('/notifications')}>
            <Ionicons name="notifications-outline" size={24} color={colors.white} />
            {counts.unreadCount > 0 && (
              <View style={styles.headerBadge}>
                <Text style={styles.headerBadgeText}>{cap(counts.unreadCount)}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerIconBtn} onPress={() => router.push('/collections')}>
            <Ionicons name="albums-outline" size={24} color={colors.white} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerIconBtn} onPress={() => router.push('/favorites')}>
            <Ionicons name="heart-outline" size={24} color={colors.white} />
            {counts.favCount > 0 && (
              <View style={styles.headerBadge}>
                <Text style={styles.headerBadgeText}>{cap(counts.favCount)}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerIconBtn} onPress={() => router.push('/cart')}>
            <Ionicons name="cart-outline" size={24} color={colors.white} />
            {counts.cartCount > 0 && (
              <View style={styles.headerBadge}>
                <Text style={styles.headerBadgeText}>{cap(counts.cartCount)}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>
      <Input
        placeholder={t('nav.searchPlaceholder')}
        value={searchQuery}
        onChangeText={onChangeSearch}
        onSubmitEditing={onSearch}
        leftIconName="search"
        containerStyle={{ marginBottom: theme.spacing[0] }}
      />
    </View>
  );
}
