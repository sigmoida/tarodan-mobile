import React from 'react';
import { type ViewStyle } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { Alert, theme } from '@/ui';
import {
  preparingDeadlineCopy,
  type PreparingDeadlineNotice as Notice,
} from '@/lib/shared/preparingDeadline';

const { colors } = theme;

/**
 * Kargoya verme son tarihi — satıcıya "bu tarihe kadar gönder", alıcıya "en geç
 * bu tarihte yola çıkar". Süre bir kez uzatıldıysa satıcıya bunun son süre
 * olduğu, alıcıya gecikme ve kargodan önce iptal hakkı söylenir (web
 * `PreparingDeadlineNotice` aynası). Not yoksa (`null`) hiçbir şey çizmez.
 * Uzatılmış (uyarı) durumda durum ikonu kalır; normal bilgi notunda süs ikonu yok.
 */
export function PreparingDeadlineNotice({
  notice,
  style,
}: {
  notice: Notice | null;
  /** Ekranın aralık düzenine uydurmak için (ör. satış detayı `gap` kullanır). */
  style?: ViewStyle;
}) {
  const { t } = useTranslation();
  if (!notice) return null;
  const { title, body } = preparingDeadlineCopy(notice, t);
  return notice.extended ? (
    <Alert
      testID="preparing-deadline-extended"
      variant="warning"
      title={title}
      icon={<Ionicons name="warning-outline" size={theme.iconSize.md} color={colors.warning[600]!} />}
      style={style}
    >
      {body}
    </Alert>
  ) : (
    <Alert testID="preparing-deadline-notice" variant="default" title={title} style={style}>
      {body}
    </Alert>
  );
}
