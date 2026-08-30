import { View, TouchableOpacity, TextInput as RNTextInput } from 'react-native';
import { Avatar, Input, Spinner, Text, theme } from '@/ui';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { styles } from '../_lib/styles';
import type { User } from '../_lib/types';
import type { NewMessageController } from '../_hooks/useNewMessage';

const { colors } = theme;

/** Alıcı seçimi + ürün referansı + mesaj kutusu + günlük limit uyarısı. */
export function NewMessageBody({ f }: { f: NewMessageController }) {
  const { t } = useTranslation();
  return (
    <View style={styles.content}>
      {/* Recipient Selection */}
      {!f.selectedUser ? (
        <View style={styles.recipientSection}>
          <Text variant="label" style={styles.sectionTitle}>{t('message.recipient')}</Text>
          <Input
            placeholder={t('message.searchUserPlaceholder')}
            value={f.searchQuery}
            onChangeText={f.setSearchQuery}
            leftIconName="search"
          />

          {f.searchLoading && (
            <View style={styles.loadingContainer}>
              <Spinner size="sm" />
            </View>
          )}

          {f.searchResults && f.searchResults.length > 0 && (
            <View style={styles.searchResults}>
              {f.searchResults.map((user: User) => (
                <TouchableOpacity key={user.id} style={styles.userItem} onPress={() => f.handleSelectUser(user)}>
                  <Avatar size="md" source={user.avatarUrl} name={user.displayName.charAt(0)} />
                  <View style={styles.userInfo}>
                    <Text variant="body">{user.displayName}</Text>
                    {user.isSeller && <Text variant="caption" style={styles.sellerBadge}>{t('product.seller')}</Text>}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {f.searchQuery.length >= 2 && !f.searchSupported && (
            <Text style={styles.noResults}>
              {t('message.userSearchUnsupported')}
            </Text>
          )}
        </View>
      ) : (
        <View style={styles.selectedRecipient}>
          <Text variant="label" style={styles.sectionTitle}>{t('message.recipient')}</Text>
          <View style={styles.recipientCard}>
            <Avatar size="md" source={f.selectedUser.avatarUrl} name={f.selectedUser.displayName.charAt(0)} />
            <Text variant="body" style={styles.recipientName}>{f.selectedUser.displayName}</Text>
          </View>
        </View>
      )}

      {/* Product Reference */}
      {(f.product || (f.productId && f.decodedProductTitle)) && (
        <View style={styles.productSection}>
          <Text variant="label" style={styles.sectionTitle}>{t('message.aboutProduct')}</Text>
          <TouchableOpacity
            style={styles.productCard}
            onPress={() => router.push(`/product/${f.product?.id || f.productId}`)}
          >
            <Ionicons name="pricetag" size={20} color={colors.primary[600]!} />
            <Text style={styles.productTitle} numberOfLines={1}>
              {f.product?.title || f.decodedProductTitle}
            </Text>
            {f.product?.price && (
              <Text style={styles.productPrice}>₺{f.product.price.toLocaleString('tr-TR')}</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Message Input */}
      <View style={styles.messageSection}>
        <Text variant="label" style={styles.sectionTitle}>{t('common.message')}</Text>
        <View style={styles.messageInputContainer}>
          <RNTextInput
            style={styles.messageInput}
            placeholder={f.canSend ? t('message.typeMessage') : t('message.messageLimitReached')}
            placeholderTextColor={colors.text.subtle}
            value={f.messageText}
            onChangeText={f.setMessageText}
            multiline
            maxLength={1000}
            editable={f.canSend}
          />
          <Text style={styles.charCount}>{f.messageText.length}/1000</Text>
        </View>
      </View>

      {/* Daily Limit Warning */}
      {!f.canSend && (
        <View style={styles.limitWarning}>
          <Ionicons name="warning" size={20} color={colors.warning[600]!} />
          <Text style={styles.limitWarningText}>
            {t('message.dailyLimitReached', { count: f.limits?.maxMessagesPerDay || 50 })}
          </Text>
          <TouchableOpacity onPress={() => router.push('/upgrade')}>
            <Text style={styles.upgradeLink}>{t('address.goPremium')}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}
