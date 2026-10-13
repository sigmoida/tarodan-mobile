import React from 'react';
import { View, Image as RNImage } from 'react-native';
import { useTranslation } from 'react-i18next';
import { IconButton, Input, Spinner, Text } from '@/ui';

import { styles } from '../_lib/styles';
import type { MessageThreadController } from '../_hooks/useMessageThread';

/**
 * Pending-image preview bar + attach/text/send input row. PageShell'in sabit alt barına
 * (`footer`) konur: üst çizgi ve güvenli alan orada.
 */
export function MessageInputBar({ f }: { f: MessageThreadController }) {
  const { t } = useTranslation();
  const sendDisabled = (!f.inputText.trim() && !f.pendingImage) || !f.canSend || f.sending;
  return (
    <>
      {/* Seçilen foto önizlemesi — gönder butonuyla onaylanana dek bekler */}
      {f.pendingImage && (
        <View style={styles.pendingImageBar}>
          <RNImage
            source={{ uri: f.pendingImage.uri }}
            style={styles.pendingImageThumb}
            resizeMode="cover"
          />
          <Text variant="bodySm" tone="muted" style={styles.pendingImageText} numberOfLines={1}>
            {t('message.pendingImageReady')}
          </Text>
          <IconButton
            icon="close"
            size="sm"
            accessibilityLabel={t('message.removeImage')}
            onPress={() => f.setPendingImage(null)}
            disabled={f.uploadingImage || f.sending}
          />
        </View>
      )}

      {/* Input */}
      <View style={styles.inputContainer}>
        {f.uploadingImage ? (
          <Spinner size="sm" />
        ) : (
          <IconButton
            icon="image-outline"
            size="md"
            accessibilityLabel={t('message.attachImage')}
            onPress={f.handleAttachImage}
            disabled={!f.canSend}
          />
        )}
        <View style={styles.inputWrapper}>
          <Input
            placeholder={f.canSend ? t('message.typeMessage') : t('message.messageLimitReached')}
            value={f.inputText}
            onChangeText={(text) => {
              f.setInputText(text);
              f.notifyTyping();
            }}
            multiline
            maxLength={1000}
            editable={f.canSend && !f.uploadingImage}
          />
        </View>
        <IconButton
          icon="send"
          variant="primary"
          size="md"
          accessibilityLabel={t('common.send')}
          onPress={f.handleSend}
          disabled={sendDisabled}
        />
      </View>
    </>
  );
}
