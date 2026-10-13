import { View, Pressable, Image } from 'react-native';
import { Alert, Chip, IconButton, SectionCard, Switch, Text, Input, Textarea } from '@/ui';
import { Controller } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { styles } from '../_lib/styles';
import type { NewCollectionController } from '../_hooks/useNewCollection';

/** Form bölümleri — kapak, şablon, bilgiler, gizlilik, ipucu. Gönder düğmesi ekranın sabit alt barında. */
export function NewCollectionForm({ f }: { f: NewCollectionController }) {
  const { t } = useTranslation();
  const { control, errors } = f;

  return (
    <>
      <Pressable
        style={styles.cover}
        onPress={f.pickCoverImage}
        accessibilityRole="button"
        accessibilityLabel={t('collection.addCoverPhoto')}
      >
        {f.coverImage ? (
          <Image source={{ uri: f.coverImage }} style={styles.coverImage} />
        ) : (
          <View style={styles.coverPlaceholder}>
            <Text variant="bodySm" tone="muted">
              {t('collection.addCoverPhoto')}
            </Text>
          </View>
        )}
        {f.coverImage ? (
          <IconButton
            icon="x-mark"
            accessibilityLabel={t('collection.removeCoverPhoto')}
            size="sm"
            variant="solid"
            style={styles.coverRemove}
            onPress={() => f.setCoverImage(null)}
          />
        ) : null}
      </Pressable>

      <SectionCard title={t('collection.selectTemplate')}>
        <View style={styles.chips}>
          {f.templates.map((template) => (
            <Chip
              key={template.id}
              label={template.name}
              selected={f.selectedTemplate === template.id}
              onPress={() => f.selectTemplate(template)}
            />
          ))}
        </View>
      </SectionCard>

      <SectionCard title={t('collection.infoSectionTitle')} bodyStyle={styles.fields}>
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
            />
          )}
        />
      </SectionCard>

      <SectionCard title={t('collection.privacyTitle')} bodyStyle={styles.fields}>
        <View style={styles.switchRow}>
          <View style={styles.switchText}>
            <Text variant="body">{t('collection.isPublic')}</Text>
            <Text variant="bodySm" tone="muted">
              {t('collection.publicVisibleToAll')}
            </Text>
          </View>
          <Controller
            control={control}
            name="isPublic"
            render={({ field: { onChange, value } }) => <Switch value={value} onValueChange={onChange} />}
          />
        </View>

        {!f.watch('isPublic') && <Alert variant="default">{t('collection.privateNote')}</Alert>}
      </SectionCard>

      <Alert variant="info" title={t('collection.tipLabel')}>
        {t('collection.tipText')}
      </Alert>
    </>
  );
}
