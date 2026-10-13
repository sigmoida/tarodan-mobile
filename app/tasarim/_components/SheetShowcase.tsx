import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  ActionSheet,
  appAlert,
  BottomSheet,
  Button,
  ButtonRow,
  Input,
  SectionCard,
  SelectSheet,
  Text,
  theme,
  toast,
} from '@/ui';

const { spacing } = theme;

const CITIES = ['Adana', 'Ankara', 'Antalya', 'Bursa', 'Eskişehir', 'İstanbul', 'İzmir', 'Kayseri', 'Konya', 'Trabzon'].map(
  (c) => ({ value: c.toLocaleLowerCase('tr'), label: c }),
);

type Open = 'none' | 'fit' | 'large' | 'single' | 'multi' | 'actions';

/**
 * Alttan açılan panellerin vitrini: BottomSheet (fit / large + klavye + footer), SelectSheet
 * (tek / çoklu + arama), ActionSheet (eylem kapanıştan sonra appAlert açar — iOS donma kuralı).
 * Metinler bilerek çevrilmez (yalnız geliştirici/QA aracı).
 */
export function SheetShowcase() {
  const [open, setOpen] = useState<Open>('none');
  const [city, setCity] = useState('ankara');
  const [cities, setCities] = useState<string[]>([]);
  const close = () => setOpen('none');

  return (
    <SectionCard title="Alttan açılan paneller">
      <View style={styles.wrap}>
        <Button variant="outline" title="BottomSheet fit" onPress={() => setOpen('fit')} />
        <Button variant="outline" title="BottomSheet large" onPress={() => setOpen('large')} />
        <Button variant="outline" title="SelectSheet tek" onPress={() => setOpen('single')} />
        <Button variant="outline" title="SelectSheet çoklu" onPress={() => setOpen('multi')} />
        <Button variant="outline" title="ActionSheet" onPress={() => setOpen('actions')} />
      </View>
      <Text variant="caption" tone="muted">
        Seçili il: {city} · Çoklu: {cities.join(', ') || '—'}
      </Text>

      <BottomSheet isOpen={open === 'fit'} onClose={close} title="İçerik kadar">
        <Text variant="bodySm">Kısa içerik: sheet içeriği kadar yükselir; aşağı sürükleyerek kapanır.</Text>
      </BottomSheet>

      <BottomSheet
        isOpen={open === 'large'}
        onClose={close}
        title="Büyük panel"
        size="large"
        footer={
          <ButtonRow>
            <Button key="clear" variant="outline" title="Temizle" onPress={close} />
            <Button key="apply" title="1.549 Sonuç Göster" onPress={close} />
          </ButtonRow>
        }
      >
        <Input label="Klavye denemesi" placeholder="Yazınca footer klavyenin üstüne çıkar" />
        {Array.from({ length: 30 }, (_, i) => (
          <Text key={i} variant="body" style={styles.line}>
            Satır {i + 1}
          </Text>
        ))}
      </BottomSheet>

      <SelectSheet
        isOpen={open === 'single'}
        onClose={close}
        title="İl seçin"
        options={CITIES}
        value={city}
        onSelect={setCity}
        searchable
      />

      <SelectSheet
        isOpen={open === 'multi'}
        multiple
        onClose={close}
        title="İller"
        options={CITIES}
        value={cities}
        onApply={setCities}
      />

      <ActionSheet
        isOpen={open === 'actions'}
        onClose={close}
        title="İlan işlemleri"
        actions={[
          { label: 'Düzenle', onPress: () => toast('Düzenle') },
          { label: 'Pasife al', onPress: () => undefined, disabled: true },
          {
            label: 'Sil',
            destructive: true,
            onPress: () =>
              appAlert('Silinsin mi?', 'Bu işlem geri alınamaz.', [
                { text: 'Sil', style: 'destructive' },
                { text: 'İptal', style: 'cancel' },
              ]),
          },
        ]}
      />
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2], marginBottom: spacing[3] },
  line: { paddingVertical: spacing[2] },
});
