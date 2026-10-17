import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { CountBadge } from './CountBadge';

export interface BadgeAnchorProps {
  /** Sayaç; 0 ve altında rozet çizilmez. */
  count: number;
  /** Zemin farklı bir yüzeyde rozet ayrışsın diye halka rengi. */
  ringColor?: string;
  /** Rozetin testID'si. */
  badgeTestID?: string;
  style?: StyleProp<ViewStyle>;
  /** Rozetin bağlanacağı ikon. */
  children: React.ReactNode;
}

/**
 * İkon üstü rozet konumlandırma — TEK yer: kapsayıcı `relative`, `CountBadge` ikonun SAĞ ÜST
 * köşesinde sabit ofsette (`BADGE_ANCHOR_OFFSET`); taşma kapsayıcıyı etkilemez. Ekranlarda
 * `position: 'absolute'` ile elle rozet yerleştirmek yerine bunu kullanın.
 */
export const BadgeAnchor: React.FC<BadgeAnchorProps> = ({ count, ringColor, badgeTestID, style, children }) => (
  <View style={[{ position: 'relative' }, style]}>
    {children}
    <CountBadge count={count} ringColor={ringColor} testID={badgeTestID} />
  </View>
);
