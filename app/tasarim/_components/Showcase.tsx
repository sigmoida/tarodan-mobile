import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  Alert,
  appAlert,
  Badge,
  Button,
  Card,
  Chip,
  ChipTabs,
  EmptyState,
  IconButton,
  Input,
  Label,
  Modal,
  ModalFooter,
  PageHeader,
  ProductBadge,
  QuantityStepper,
  SectionCard,
  SectionCardAction,
  Select,
  SkeletonAvatar,
  SkeletonCard,
  SkeletonText,
  Stepper,
  Text,
  theme,
  toast,
} from '@/ui';

const { spacing } = theme;

const BUTTON_VARIANTS = ['primary', 'secondary', 'outline', 'outline-primary', 'ghost', 'danger', 'success', 'warning', 'link'] as const;
const BUTTON_SIZES = ['sm', 'md', 'lg', 'xl'] as const;
const ICON_VARIANTS = ['primary', 'secondary', 'outline', 'outline-primary', 'ghost', 'danger', 'success'] as const;
const BADGE_VARIANTS = ['default', 'success', 'warning', 'danger', 'outline', 'info', 'secondary'] as const;
const PRODUCT_BADGES = ['sale', 'new', 'trade', 'rare', 'preorder', 'limited', 'boosted', 'default'] as const;
const ALERT_VARIANTS = ['info', 'success', 'warning', 'danger'] as const;

/**
 * Tasarım vitrini — `@/ui` primitive'lerinin tüm varyantları tek sayfada (staging/dev).
 * Metinler bilerek çevrilmez: yalnız geliştirici/QA aracıdır, production'da açılmaz.
 */
export function Showcase() {
  const [chip, setChip] = useState('a');
  const [tab, setTab] = useState('listings');
  const [visible, setVisible] = useState(true);
  const [qty, setQty] = useState(1);
  const [step, setStep] = useState(1);
  const [select, setSelect] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <PageHeader title="Tasarım vitrini" description="@/ui primitive'leri — web @tarodan/ui ile hizalı" />

      <SectionCard title="Button">
        <View style={styles.wrap}>
          {BUTTON_VARIANTS.map((v) => (
            <Button key={v} variant={v} title={v} onPress={() => undefined} />
          ))}
        </View>
        <View style={styles.wrap}>
          {BUTTON_SIZES.map((s) => (
            <Button key={s} size={s} title={`size ${s}`} onPress={() => undefined} />
          ))}
          <Button title="isLoading" isLoading />
        </View>
      </SectionCard>

      <SectionCard title="IconButton">
        <View style={styles.wrap}>
          {ICON_VARIANTS.map((v) => (
            <IconButton key={v} variant={v} icon="heart" accessibilityLabel={v} />
          ))}
        </View>
      </SectionCard>

      <SectionCard title="Badge" action={<SectionCardAction onPress={() => toast('Tümünü gör')} />}>
        <View style={styles.wrap}>
          {BADGE_VARIANTS.map((v) => (
            <Badge key={v} variant={v}>
              {v}
            </Badge>
          ))}
        </View>
        <View style={styles.wrap}>
          {PRODUCT_BADGES.map((v) => (
            <ProductBadge key={v} variant={v}>
              {v}
            </ProductBadge>
          ))}
        </View>
        {/* Rozet satırındaki açma/kapama: rozetlerle aynı köşe (radiusRole.badge). */}
        <View style={styles.wrap}>
          <Badge size="sm">Premium Üye</Badge>
          <Badge variant="warning" size="sm">Güven Skoru 92</Badge>
          <Chip
            size="sm"
            shape="badge"
            selected={visible}
            label={visible ? 'Herkese açık' : 'Gizli'}
            onPress={() => setVisible((v) => !v)}
          />
        </View>
      </SectionCard>

      <SectionCard title="Alert">
        {ALERT_VARIANTS.map((v) => (
          <Alert key={v} variant={v} title={`Alert ${v}`}>
            Aynı yapı: ikon + başlık + metin; renk yalnız temel paletten.
          </Alert>
        ))}
      </SectionCard>

      <SectionCard title="ChipTabs">
        <ChipTabs
          bleed={false}
          value={tab}
          onChange={setTab}
          items={[
            { key: 'listings', label: 'İlanlar', count: 20 },
            { key: 'reviews', label: 'Değerlendirmeler', count: 4 },
            { key: 'collections', label: 'Koleksiyonlar', count: 0 },
          ]}
        />
      </SectionCard>

      <SectionCard title="Chip / Stepper">
        <View style={styles.wrap}>
          {['a', 'b', 'c'].map((c) => (
            <Chip key={c} label={`Çip ${c}`} selected={chip === c} onPress={() => setChip(c)} />
          ))}
          <Chip label="etiket" variant="success" />
        </View>
        <QuantityStepper value={qty} onChange={setQty} max={5} />
        <Stepper steps={['Adres', 'Ödeme', 'Onay']} current={step} onStepClick={setStep} />
      </SectionCard>

      <SectionCard title="Form">
        <Label required>Etiket</Label>
        <Input placeholder="Input md (h40, 16)" />
        <Input label="Hatalı alan" required error="Zorunlu alan" />
        <Select
          label="Select"
          value={select}
          onChange={setSelect}
          options={[
            { value: 'a', label: 'Seçenek A' },
            { value: 'b', label: 'Seçenek B' },
          ]}
        />
      </SectionCard>

      <SectionCard title="Card / Skeleton / Empty">
        <Card variant="default">
          <Text>Card default (soft gölge)</Text>
        </Card>
        <Card variant="bordered">
          <Text>Card bordered</Text>
        </Card>
        <View style={styles.row}>
          <SkeletonAvatar />
          <View style={styles.flex}>
            <SkeletonText lines={2} />
          </View>
        </View>
        <View style={styles.half}>
          <SkeletonCard />
        </View>
        <EmptyState icon="inbox" title="Boş durum" subtitle="Açıklama metni" />
      </SectionCard>

      <SectionCard title="Geri bildirim">
        <View style={styles.wrap}>
          <Button variant="outline" title="toast.success" onPress={() => toast.success('Kaydedildi')} />
          <Button variant="outline" title="toast.error" onPress={() => toast.error('Olmadı')} />
          <Button
            variant="outline"
            title="appAlert"
            onPress={() =>
              appAlert('Silinsin mi?', 'Bu işlem geri alınamaz.', [
                { text: 'İptal', style: 'cancel' },
                { text: 'Sil', style: 'destructive' },
              ])
            }
          />
          <Button variant="outline" title="Modal" onPress={() => setModalOpen(true)} />
        </View>
      </SectionCard>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Modal başlığı"
        showCloseButton
        footer={
          <ModalFooter onCancel={() => setModalOpen(false)} onConfirm={() => setModalOpen(false)} />
        }
      >
        <Text variant="bodySm">Web Dialog düzeni: başlık / gövde / alt şerit.</Text>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2], marginBottom: spacing[3] },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing[3], marginVertical: spacing[3] },
  flex: { flex: 1 },
  half: { width: '50%', marginBottom: spacing[3] },
});
