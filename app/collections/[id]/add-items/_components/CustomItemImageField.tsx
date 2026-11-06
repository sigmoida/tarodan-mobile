import React from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Button, Icon, Label, theme } from '@/ui';
import { AppImage } from '@/components/AppImage';
import type { LocalImageFile } from '@/lib/media';
import { formStyles } from '../_lib/styles';

/**
 * The custom item's picture (web `FormImageUpload`): a thumbnail with Select / Replace and Remove.
 * Picking only previews the file; it is uploaded when the form is submitted.
 */
export function CustomItemImageField({
  image,
  onPick,
  onClear,
  disabled,
}: {
  image: LocalImageFile | null;
  onPick: () => void;
  onClear: () => void;
  disabled?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <View>
      <Label>{t('collection.image')}</Label>
      <View style={formStyles.imageRow}>
        <View style={formStyles.thumb}>
          {image ? (
            <AppImage source={image.uri} variant="card" allowDeviceUris style={formStyles.thumbImage} resizeMode="cover" />
          ) : (
            <Icon name="photo" size={theme.iconSize.lg} color={theme.colors.text.subtle} />
          )}
        </View>
        <View style={formStyles.imageActions}>
          <Button
            testID="custom-item-image-pick"
            variant="secondary"
            size="sm"
            title={image ? t('common.replace') : t('common.select')}
            accessibilityLabel={`${t('collection.image')}: ${image ? t('common.replace') : t('common.select')}`}
            onPress={onPick}
            disabled={disabled}
          />
          {image ? (
            <Button
              testID="custom-item-image-clear"
              variant="ghost"
              size="sm"
              title={t('common.remove')}
              accessibilityLabel={`${t('collection.image')}: ${t('common.remove')}`}
              onPress={onClear}
              disabled={disabled}
            />
          ) : null}
        </View>
      </View>
    </View>
  );
}
