import React, { useCallback, useMemo, useState } from 'react';
import { View, StyleSheet, Keyboard } from 'react-native';
import { useTranslation } from 'react-i18next';
import { theme, FieldTrigger, SelectSheet, type SelectSheetOption } from '@/ui';
import { turkeyLocations, getDistrictsForCity } from '../../utils/turkeyLocations';

/** İl (81) ve ilçe listeleri sabit satır yüksekliğiyle sanal kayar (`SelectSheet.rowHeight`). */
const ROW_HEIGHT = 48;

/** Sabit seçenek listesi: il adları hiç değişmez, bir kez hesaplanır. */
const CITY_OPTIONS: SelectSheetOption[] = turkeyLocations.map((c) => ({ value: c.name, label: c.name }));

/**
 * Web `CityDistrictSelector` bileşeninin mobile karşılığı.
 *
 * - 81 il + tüm ilçeler `turkeyLocations`'tan gelir.
 * - İl seçildiğinde ilçe listesi otomatik bağımlı güncellenir.
 * - Alana dokunulduğunda alttan aranabilir `SelectSheet` listesi açılır (arama sheet içinde
 *   tutulur, her açılışta sıfırlanır).
 */
interface Props {
  city: string;
  district: string;
  onChangeCity: (city: string) => void;
  onChangeDistrict: (district: string) => void;
  /** İlçeyi gizle (örn. checkout'ta tek satır il gösterimi) */
  hideDistrict?: boolean;
  /** Form hatası: metin → alanın altında mesaj + kırmızı çerçeve; `true` → yalnız çerçeve. */
  cityError?: string | boolean;
  districtError?: string | boolean;
}

export function CityDistrictSelector({
  city,
  district,
  onChangeCity,
  onChangeDistrict,
  hideDistrict = false,
  cityError,
  districtError,
}: Props) {
  const { t } = useTranslation();
  const [cityOpen, setCityOpen] = useState(false);
  const [districtOpen, setDistrictOpen] = useState(false);

  const districtOptions = useMemo<SelectSheetOption[]>(
    () => getDistrictsForCity(city).map((d) => ({ value: d, label: d })),
    [city],
  );

  const closeCity = useCallback(() => setCityOpen(false), []);
  const closeDistrict = useCallback(() => setDistrictOpen(false), []);

  const selectCity = useCallback(
    (next: string) => {
      if (next !== city) {
        onChangeCity(next);
        // İl değişince ilçe sıfırlanır (web ile aynı davranış)
        onChangeDistrict('');
      }
    },
    [city, onChangeCity, onChangeDistrict],
  );

  // Sheet'i açmadan önce klavyeyi kapat: açık klavye, sheet'in arkasında kalıp
  // "açılmıyor / seçilemiyor" gibi görünmesin.
  const openCity = () => {
    Keyboard.dismiss();
    setCityOpen(true);
  };

  const openDistrict = () => {
    if (!city) return;
    Keyboard.dismiss();
    setDistrictOpen(true);
  };

  return (
    <View>
      <FieldTrigger
        label={t('address.city')}
        required
        value={city}
        placeholder={t('common.selectCityPlaceholder')}
        onPress={openCity}
        error={cityError}
        open={cityOpen}
        containerStyle={styles.field}
        testID="city-select-trigger"
      />

      {!hideDistrict ? (
        <FieldTrigger
          label={t('address.district')}
          required
          value={district}
          placeholder={city ? t('common.selectDistrictPlaceholder') : t('common.selectCityFirst')}
          onPress={openDistrict}
          disabled={!city}
          error={districtError}
          open={districtOpen}
          containerStyle={styles.field}
          testID="district-select-trigger"
        />
      ) : null}

      <SelectSheet
        isOpen={cityOpen}
        onClose={closeCity}
        title={t('common.selectCity')}
        options={CITY_OPTIONS}
        value={city || null}
        onSelect={selectCity}
        searchable
        searchPlaceholder={t('common.searchCity')}
        rowHeight={ROW_HEIGHT}
        testID="city-sheet"
      />

      <SelectSheet
        isOpen={districtOpen}
        onClose={closeDistrict}
        title={`${t('common.selectDistrict')} (${city})`}
        options={districtOptions}
        value={district || null}
        onSelect={onChangeDistrict}
        searchable
        searchPlaceholder={t('common.searchDistrict')}
        rowHeight={ROW_HEIGHT}
        testID="district-sheet"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  // Yanındaki Input'larla aynı dikey ritim (formlarda `containerStyle` alt boşluğu spacing[3]).
  field: { marginBottom: theme.spacing[3] },
});

export default CityDistrictSelector;
