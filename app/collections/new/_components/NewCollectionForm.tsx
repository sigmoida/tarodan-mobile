import { View, TouchableOpacity, Image } from 'react-native';
import { Button, Switch, IconButton, Text, Input, Textarea, theme } from '@/ui';
import { Controller } from 'react-hook-form';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { styles } from '../_lib/styles';
import type { NewCollectionController } from '../_hooks/useNewCollection';

const { colors } = theme;

/** Ana form içeriği — kapak, şablon, bilgiler, gizlilik, ipucu, gönder. */
export function NewCollectionForm({ f }: { f: NewCollectionController }) {
  const { t } = useTranslation();
  const { control, errors } = f;

  return (
    <>
      {/* Cover Image */}
      <TouchableOpacity style={styles.coverImageContainer} onPress={f.pickCoverImage}>
        {f.coverImage ? (
          <Image source={{ uri: f.coverImage }} style={styles.coverImage} />
        ) : (
          <View style={styles.coverImagePlaceholder}>
            <Ionicons name="image-outline" size={48} color={colors.text.muted} />
            <Text variant="body" style={styles.coverImageText}>{t('collection.addCoverPhoto')}</Text>
          </View>
        )}
        {f.coverImage && (
          <IconButton
            icon="close-circle"
            accessibilityLabel={t('collection.removeCoverPhoto')}
            size="md"
            style={styles.removeCoverButton}
            onPress={() => f.setCoverImage(null)}
          />
        )}
      </TouchableOpacity>

      {/* Templates */}
      <View style={styles.card}>
        <Text variant="h3" style={styles.sectionTitle}>{t('collection.selectTemplate')}</Text>
        <View style={styles.templatesGrid}>
          {f.templates.map((template) => (
            <TouchableOpacity
              key={template.id}
              style={[
                styles.templateItem,
                f.selectedTemplate === template.id && styles.templateItemSelected,
              ]}
              onPress={() => f.selectTemplate(template)}
            >
              <Text style={styles.templateIcon}>{template.icon}</Text>
              <Text variant="bodySm" style={styles.templateName} numberOfLines={1}>
                {template.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Collection Details */}
      <View style={styles.card}>
        <Text variant="h3" style={styles.sectionTitle}>{t('collection.infoSectionTitle')}</Text>

        <Controller
          control={control}
          name="name"
          render={({ field: { onChange, value } }) => (
            <Input
              label={t('collection.collectionNameLabel')}
              value={value}
              onChangeText={onChange}
              error={errors.name?.message}
              placeholder={t('collection.namePlaceholderExample')}
              containerStyle={styles.input}
            />
          )}
        />

        <Controller
          control={control}
          name="description"
          render={({ field: { onChange, value } }) => (
            <Textarea
              label={t('collection.descriptionLabel')}
              value={value}
              onChangeText={onChange}
              rows={3}
              error={errors.description?.message}
              placeholder={t('collection.descriptionPlaceholder')}
              containerStyle={styles.input}
            />
          )}
        />
      </View>

      {/* Privacy Settings */}
      <View style={styles.card}>
        <Text variant="h3" style={styles.sectionTitle}>{t('collection.privacyTitle')}</Text>

        <View style={styles.privacyOption}>
          <View style={styles.privacyInfo}>
            <Ionicons name="globe-outline" size={24} color={colors.primary[600]!} />
            <View style={styles.privacyText}>
              <Text variant="body">{t('collection.isPublic')}</Text>
              <Text variant="bodySm" style={styles.privacyDesc}>
                {t('collection.publicVisibleToAll')}
              </Text>
            </View>
          </View>
          <Controller
            control={control}
            name="isPublic"
            render={({ field: { onChange, value } }) => (
              <Switch value={value} onValueChange={onChange} />
            )}
          />
        </View>

        {!f.watch('isPublic') && (
          <View style={styles.privateNote}>
            <Ionicons name="lock-closed" size={16} color={colors.text.muted} />
            <Text variant="bodySm" style={styles.privateNoteText}>
              {t('collection.privateNote')}
            </Text>
          </View>
        )}
      </View>

      {/* Tips */}
      <View style={styles.tipCard}>
        <View style={styles.tipContent}>
          <Ionicons name="bulb" size={24} color={colors.warning[600]!} />
          <View style={styles.tipText}>
            <Text variant="label">{t('collection.tipLabel')}</Text>
            <Text variant="bodySm" style={styles.tipDesc}>
              {t('collection.tipText')}
            </Text>
          </View>
        </View>
      </View>

      {/* Submit Button */}
      <Button
        variant="primary"
        title={t('collection.createCollection')}
        onPress={f.handleSubmit(f.onSubmit)}
        isLoading={f.createMutation.isPending}
        disabled={f.createMutation.isPending}
        icon="checkmark"
        style={styles.submitButton}
      />

      <View style={{ height: 50 }} />
    </>
  );
}
