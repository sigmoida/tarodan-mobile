import React from 'react';
import { View, TouchableOpacity, TextInput as RNTextInput, Image as RNImage } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Spinner, Text, theme } from '@/ui';

import { styles } from '../_lib/styles';
import type { MessageThreadController } from '../_hooks/useMessageThread';

const { colors } = theme;

/** Pending-image preview bar + attach/text/send input row. */
export function MessageInputBar({ f }: { f: MessageThreadController }) {
  const { t } = useTranslation();
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
          <Text style={styles.pendingImageText} numberOfLines={1}>
            {t('message.pendingImageReady')}
          </Text>
          <TouchableOpacity
            style={styles.pendingImageRemove}
            onPress={() => f.setPendingImage(null)}
            disabled={f.uploadingImage || f.sending}
            accessibilityLabel={t('message.removeImage')}
          >
            <Ionicons name="close-circle" size={24} color={colors.text.muted} />
          </TouchableOpacity>
        </View>
      )}

      {/* Input */}
      <View style={styles.inputContainer}>
        <TouchableOpacity
          style={[
            styles.attachButton,
            (!f.canSend || f.uploadingImage) && styles.attachButtonDisabled,
          ]}
          onPress={f.handleAttachImage}
          disabled={!f.canSend || f.uploadingImage}
        >
          {f.uploadingImage ? (
            <Spinner size="sm" />
          ) : (
            <Ionicons
              name="image-outline"
              size={24}
              color={f.canSend ? colors.primary[600]! : colors.text.subtle}
            />
          )}
        </TouchableOpacity>
        <View style={styles.inputWrapper}>
          <RNTextInput
            style={styles.textInput}
            placeholder={f.canSend ? t('message.typeMessage') : t('message.messageLimitReached')}
            placeholderTextColor={colors.text.subtle}
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
        <TouchableOpacity
          style={[
            styles.sendButton,
            ((!f.inputText.trim() && !f.pendingImage) || !f.canSend || f.sending) && styles.sendButtonDisabled,
          ]}
          onPress={f.handleSend}
          disabled={(!f.inputText.trim() && !f.pendingImage) || !f.canSend || f.sending}
        >
          <Ionicons
            name="send"
            size={24}
            color={((!f.inputText.trim() && !f.pendingImage) || !f.canSend) ? colors.text.subtle : colors.white}
          />
        </TouchableOpacity>
      </View>
    </>
  );
}
