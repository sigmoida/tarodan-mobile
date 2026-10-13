import { View, Pressable } from 'react-native';
import { Alert, Avatar, Input, SectionCard, Spinner, Text, Textarea } from '@/ui';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { styles } from '../_lib/styles';
import type { User } from '../_lib/types';
import type { NewMessageController } from '../_hooks/useNewMessage';
import { formatPrice } from '@/utils/format';

/** Alıcı seçimi + ürün referansı + mesaj kutusu + günlük limit uyarısı (SectionCard bölümleri). */
export function NewMessageBody({ f }: { f: NewMessageController }) {
  const { t } = useTranslation();
  return (
    <>
      {/* Recipient Selection */}
      <SectionCard title={t('message.recipient')}>
        {!f.selectedUser ? (
          <View style={styles.recipientSection}>
            <Input
              placeholder={t('message.searchUserPlaceholder')}
              value={f.searchQuery}
              onChangeText={f.setSearchQuery}
              leftIconName="magnifying-glass"
            />

            {f.searchLoading && (
              <View style={styles.loadingContainer}>
                <Spinner size="sm" />
              </View>
            )}

            {f.searchResults && f.searchResults.length > 0 && (
              <View style={styles.searchResults}>
                {f.searchResults.map((user: User) => (
                  <Pressable key={user.id} style={styles.userItem} onPress={() => f.handleSelectUser(user)}>
                    <Avatar size="md" source={user.avatarUrl} name={user.displayName.charAt(0)} />
                    <View style={styles.userInfo}>
                      <Text variant="body">{user.displayName}</Text>
                      {user.isSeller && <Text variant="caption" tone="primary">{t('product.seller')}</Text>}
                    </View>
                  </Pressable>
                ))}
              </View>
            )}

            {f.searchQuery.length >= 2 && !f.searchSupported && (
              <Text variant="bodySm" tone="muted" align="center" style={styles.noResults}>
                {t('message.userSearchUnsupported')}
              </Text>
            )}
          </View>
        ) : (
          <View style={styles.recipientCard}>
            <Avatar size="md" source={f.selectedUser.avatarUrl} name={f.selectedUser.displayName.charAt(0)} />
            <Text variant="body" style={styles.recipientName}>{f.selectedUser.displayName}</Text>
          </View>
        )}
      </SectionCard>

      {/* Product Reference */}
      {(f.product || (f.productId && f.decodedProductTitle)) && (
        <SectionCard title={t('message.aboutProduct')}>
          <Pressable
            style={styles.productCard}
            onPress={() => router.push(`/product/${f.product?.id || f.productId}`)}
          >
            <Text variant="bodySm" style={styles.productTitle} numberOfLines={1}>
              {f.product?.title || f.decodedProductTitle}
            </Text>
            {f.product?.price && (
              <Text variant="label" tone="primary">{formatPrice(f.product.price)}</Text>
            )}
          </Pressable>
        </SectionCard>
      )}

      {/* Message Input */}
      <SectionCard title={t('common.message')}>
        <Textarea
          rows={6}
          placeholder={f.canSend ? t('message.typeMessage') : t('message.messageLimitReached')}
          value={f.messageText}
          onChangeText={f.setMessageText}
          maxLength={1000}
          editable={f.canSend}
        />
        <Text variant="caption" align="right" style={styles.charCount}>{f.messageText.length}/1000</Text>
      </SectionCard>

      {/* Daily Limit Warning */}
      {!f.canSend && (
        <Alert variant="warning">
          {t('message.dailyLimitReached', { count: f.messageLimit ?? 0 })}
        </Alert>
      )}
    </>
  );
}
