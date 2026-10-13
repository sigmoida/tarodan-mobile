import React from 'react';
import {
  Image,
  StyleSheet,
  View,
  type ImageSourcePropType,
} from 'react-native';
import { theme } from '../lib/theme';
import { Icon } from '../icons';
import { RawText } from './Text';

export interface AvatarProps {
  source?: ImageSourcePropType | string;
  name?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  /** `neutral` = açık gri zemin + başlık renginde baş harf (profil başlığı); varsayılan marka tonu. */
  tone?: 'brand' | 'neutral';
  /** `icon` = fotoğraf yoksa baş harf yerine `user` ikonu (misafir / adsız). */
  placeholder?: 'initials' | 'icon';
}

const { colors } = theme;
const sizeMap = { sm: 28, md: 40, lg: 56, xl: 80, '2xl': 120 } as const;

export const Avatar: React.FC<AvatarProps> = ({
  source,
  name,
  size = 'md',
  tone = 'brand',
  placeholder = 'initials',
}) => {
  const s = sizeMap[size];
  const [failed, setFailed] = React.useState(false);

  // Boş/whitespace string'i "kaynak yok" say — yoksa <Image> baş harf yerine
  // boş daire bırakır (örn. çözülememiş/çıplak key).
  const src =
    typeof source === 'string'
      ? source.trim()
        ? { uri: source.trim() }
        : undefined
      : (source as ImageSourcePropType | undefined);

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
      style={[
        styles.base,
        tone === 'neutral' && styles.baseNeutral,
        { width: s, height: s, borderRadius: s / 2 },
      ]}
    >
      {showImage ? (
        <Image
          source={src}
          style={{ width: s, height: s, borderRadius: s / 2 }}
          onError={() => setFailed(true)}
        />
      ) : placeholder === 'icon' ? (
        <Icon name="user" size={s * 0.5} color={colors.text.subtle} />
      ) : (
        <RawText
          style={[styles.initials, tone === 'neutral' && styles.initialsNeutral, { fontSize: s * 0.4 }]}
        >
          {initials}
        </RawText>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.primary[100],
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  baseNeutral: { backgroundColor: colors.gray[100] },
  initialsNeutral: { color: colors.text.heading },
  initials: {
    color: colors.primary[700]!,
    fontWeight: '700',
  },
});
