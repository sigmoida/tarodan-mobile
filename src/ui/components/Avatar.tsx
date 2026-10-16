import React from 'react';
import { StyleSheet, View, type ImageSourcePropType } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { Image, type ImageSource } from 'expo-image';
import { theme } from '../lib/theme';
import { Icon } from '../icons';
import { RawText } from './Text';

export interface AvatarProps {
  source?: ImageSourcePropType | string;
  name?: string;
  /** `header` = kompakt kimlik başlığı (profil sekmesi; web `UserAvatar size="lg"` h-16). */
  size?: 'sm' | 'md' | 'lg' | 'header' | 'xl' | '2xl';
  /**
   * Geri dönüşümlü hücrelerde (FlashList) hücre başka öğeye geçince eski görsel çapraz
   * geçişle görünmesin: öğenin kararlı kimliği (ör. kullanıcı id).
   */
  recyclingKey?: string;
  /** `icon` = fotoğraf yoksa baş harf yerine `user` ikonu (misafir / adsız). */
  placeholder?: 'initials' | 'icon';
}

const { colors } = theme;

/**
 * Fotoğrafsız avatar yer tutucusu — TEK renk çifti (profil sekmesi, profil düzenleme, satıcı/mesaj
 * listeleri aynı): açık marka zemini + koyu marka baş harf / `user` ikonu. Ekran ayrı ton seçmez.
 */
export const avatarPlaceholderColors = {
  background: colors.primary[100] as string,
  foreground: colors.primary[700] as string,
} as const;

const sizeMap = { sm: 28, md: 40, lg: 56, header: 64, xl: 80, '2xl': 120 } as const;

export const Avatar: React.FC<AvatarProps> = ({
  source,
  name,
  size = 'md',
  placeholder = 'initials',
  recyclingKey,
}) => {
  const s = sizeMap[size];
  const reduceMotion = useReducedMotion();
  const [failed, setFailed] = React.useState(false);

  // Boş/whitespace string'i "kaynak yok" say — yoksa <Image> baş harf yerine
  // boş daire bırakır (örn. çözülememiş/çıplak key).
  const src =
    typeof source === 'string'
      ? source.trim()
        ? { uri: source.trim() }
        : undefined
      : (source as ImageSourcePropType | undefined);
  // expo-image: `{ uri }` / require() numarası aynen kabul edilir (RN tipinden dar bir tipe köprü).
  const imageSource = src as ImageSource | number | undefined;

  // Kaynak değişince hata bayrağını sıfırla ki yeni URL tekrar denensin.
  const srcKey = typeof source === 'string' ? source : JSON.stringify(source ?? null);
  React.useEffect(() => {
    setFailed(false);
  }, [srcKey]);

  const initials = name
    ? name
        .split(' ')
        .map((p) => p[0])
        .filter(Boolean)
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : '?';

  // src yoksa veya yükleme başarısızsa (expired presigned URL / 403 / ağ) baş harfe düş.
  const showImage = !!src && !failed;

  return (
    <View
      style={[styles.base, { width: s, height: s, borderRadius: s / 2 }]}
    >
      {showImage ? (
        <Image
          source={imageSource}
          recyclingKey={recyclingKey}
          style={{ width: s, height: s, borderRadius: s / 2 }}
          contentFit="cover"
          // Disk cache: liste/mesaj/yorum avatarları remount'ta yeniden indirilmez (RN Image'ın
          // disk cache'i yok). Ayarlar `AppImage` ile aynı (vendored ui app kodunu import etmez).
          cachePolicy="memory-disk"
          transition={reduceMotion ? 0 : 150}
          onError={() => setFailed(true)}
        />
      ) : placeholder === 'icon' ? (
        <Icon name="user" size={s * 0.5} color={avatarPlaceholderColors.foreground} />
      ) : (
        <RawText style={[styles.initials, { fontSize: s * 0.4 }]}>
          {initials}
        </RawText>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    backgroundColor: avatarPlaceholderColors.background,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  initials: {
    color: avatarPlaceholderColors.foreground,
    fontWeight: theme.typography.fontWeight.bold,
  },
});
