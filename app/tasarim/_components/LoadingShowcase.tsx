import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  Button,
  IconButton,
  LoadingIndicator,
  SectionCard,
  SkeletonBlock,
  SkeletonChatBubble,
  SkeletonLine,
  SkeletonListRow,
  SkeletonSectionCard,
  Text,
  theme,
  useDelayedLoading,
} from '@/ui';
import { SkeletonProductCard } from '@/components/product/SkeletonProductCard';
import { SkeletonMenuRow } from '@/components/menu/SkeletonMenuRow';

const { spacing, colors, loading } = theme;

const SIZES = ['sm', 'md', 'lg'] as const;
const TONES = ['primary', 'muted', 'inverted'] as const;

/** `useDelayedLoading` canlı örneği: kısa yükleme göstergesiz geçer, uzun olan en az minVisibleMs kalır. */
function DelayedLoadingDemo() {
  const [busyFor, setBusyFor] = useState(0);
  const isLoading = busyFor > 0;
  const show = useDelayedLoading(isLoading);
  useEffect(() => {
    if (!busyFor) return undefined;
    const timer = setTimeout(() => setBusyFor(0), busyFor);
    return () => clearTimeout(timer);
  }, [busyFor]);
  return (
    <View style={styles.block}>
      <View style={styles.wrap}>
        <Button size="sm" variant="outline" title="Yükle 100 ms" onPress={() => setBusyFor(100)} />
        <Button size="sm" variant="outline" title="Yükle 1,5 sn" onPress={() => setBusyFor(1500)} />
      </View>
      <Text variant="caption" tone="muted">
        {`isLoading: ${isLoading} · gösterge: ${show} · gecikme ${loading.delayMs} ms · asgari ${loading.minVisibleMs} ms`}
      </Text>
      {show ? <SkeletonListRow /> : isLoading ? <View style={styles.pending} /> : <Text>İçerik</Text>}
    </View>
  );
}

/**
 * Vitrin "Yükleme" bölümü — tek gösterge (`LoadingIndicator`), düğme `isLoading`, tek sürücülü
 * iskelet yapı taşları ve gecikmeli gösterim. Animasyon türü: `theme.loading.skeleton.animation`.
 */
export function LoadingShowcase() {
  return (
    <SectionCard title="Yükleme">
      <Text variant="label">LoadingIndicator (boyut × ton)</Text>
      {TONES.map((tone) => (
        <View key={tone} style={[styles.wrap, tone === 'inverted' && styles.inverted]}>
          {SIZES.map((size) => (
            <LoadingIndicator key={size} size={size} tone={tone} />
          ))}
          <Text variant="caption" tone={tone === 'inverted' ? 'inverted' : 'muted'}>
            {tone}
          </Text>
        </View>
      ))}

      <Text variant="label">Button / IconButton isLoading</Text>
      <View style={styles.wrap}>
        <Button size="sm" title="Kaydet" isLoading />
        <Button title="Kaydet" variant="outline" isLoading />
        <Button size="lg" title="Öde" isLoading />
        <IconButton icon="heart" variant="outline" accessibilityLabel="Favori" isLoading />
      </View>

      <Text variant="label">{`İskelet yapı taşları (animasyon: ${loading.skeleton.animation})`}</Text>
      <View style={styles.block}>
        <SkeletonBlock width="40%" />
        <SkeletonLine variant="h3" width="60%" />
        <SkeletonLine variant="bodySm" />
        <SkeletonListRow />
        <SkeletonMenuRow />
        <SkeletonSectionCard action>
          <SkeletonMenuRow variant="card" />
          <SkeletonMenuRow variant="card" labelWidth="40%" />
        </SkeletonSectionCard>
        <View style={styles.wrap}>
          <SkeletonProductCard style={styles.cell} />
          <SkeletonProductCard style={styles.cell} showMeta={false} />
        </View>
        <SkeletonProductCard layout="list" />
        <SkeletonChatBubble side="left" lines={2} />
        <SkeletonChatBubble side="right" width="45%" />
      </View>

      <Text variant="label">useDelayedLoading</Text>
      <DelayedLoadingDemo />
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing[3], marginVertical: spacing[2] },
  inverted: { backgroundColor: colors.primary[600], padding: spacing[2], borderRadius: theme.radiusRole.card },
  block: { gap: spacing[3], marginVertical: spacing[2] },
  cell: { flex: 1 },
  pending: { height: spacing[10] },
});
