import React, { useCallback, useMemo, useState } from 'react';
import { View, StyleSheet, Pressable, Keyboard } from 'react-native';
import { useTranslation } from 'react-i18next';
import { theme, SelectSheet, Text, Icon, type SelectSheetOption } from '@/ui';
import { turkeyLocations, getDistrictsForCity } from '../../utils/turkeyLocations';

const { colors } = theme;

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
  /** Form hata stili göster */
  cityError?: boolean;
  districtError?: boolean;
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
      <Pressable
        onPress={openCity}
        style={({ pressed }) => [styles.fakeInput, cityError && styles.fakeInputError, pressed && styles.pressed]}
        accessibilityRole="button"
        testID="city-select-trigger"
      >
        <View style={styles.fill}>
          <Text variant="caption" tone="muted">{`${t('address.city')} *`}</Text>
          <Text variant="body" tone={city ? 'heading' : 'subtle'} numberOfLines={1}>
            {city || t('common.selectCityPlaceholder')}
          </Text>
        </View>
        <Icon name="chevron-down" size={theme.iconSize.sm} color={colors.text.muted} />
      </Pressable>

      {!hideDistrict ? (
        <Pressable
          onPress={openDistrict}
          disabled={!city}
          style={({ pressed }) => [
            styles.fakeInput,
            districtError && styles.fakeInputError,
            !city && styles.fakeInputDisabled,
            pressed && styles.pressed,
          ]}
          accessibilityRole="button"
          accessibilityState={{ disabled: !city }}
          testID="district-select-trigger"
        >
          <View style={styles.fill}>
            <Text variant="caption" tone="muted">{`${t('address.district')} *`}</Text>
            <Text variant="body" tone={district ? 'heading' : 'subtle'} numberOfLines={1}>
              {district || (city ? t('common.selectDistrictPlaceholder') : t('common.selectCityFirst'))}
            </Text>
          </View>
          <Icon name="chevron-down" size={theme.iconSize.sm} color={colors.text.muted} />
        </Pressable>
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
  fill: { flex: 1 },
  fakeInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface.DEFAULT,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing[3.5],
    paddingVertical: theme.spacing[2.5],
    minHeight: theme.controlHeight.xl,
    marginBottom: theme.spacing[3],
  },
  fakeInputError: {
    borderColor: colors.danger[600]!,
  },
  fakeInputDisabled: {
    backgroundColor: colors.surface.alt,
    opacity: 0.6,
  },
  pressed: { opacity: 0.7 },
});

export default CityDistrictSelector;
