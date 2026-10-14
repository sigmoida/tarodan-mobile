import React, { useState } from 'react';
import { Platform, StyleSheet, type ViewStyle } from 'react-native';
import { useTranslation } from 'react-i18next';
import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { BottomSheet } from './BottomSheet';
import { Button } from './Button';
import { ButtonRow } from './ButtonRow';
// Bazı ekran testleri `react-i18next`'i yalnız `{ t }` döndürecek şekilde
// mock'luyor (useTranslation().i18n undefined kalır) — aktif dili doğrudan
// global i18n örneğinden okuyoruz (bkz. `@/utils/format`), `t` yine
// `useTranslation()`'dan (mock'lanabilir metin).
import i18nInstance from '@/i18n/config';
import { FieldTrigger } from './FieldTrigger';

export interface DateFieldProps {
  label?: string;
  /** Etiketin sonuna kırmızı `*`. */
  required?: boolean;
  /** ISO date string "YYYY-MM-DD" (or empty/undefined when unset). */
  value?: string;
  /** Always called with a "YYYY-MM-DD" string. */
  onChange: (value: string) => void;
  error?: string;
  helperText?: string;
  /** Shown when no value is selected. */
  placeholder?: string;
  minimumDate?: Date;
  maximumDate?: Date;
  testID?: string;
  containerStyle?: ViewStyle;
}

/** iOS `UIDatePicker` spinner'ının doğal yüksekliği (pt). */
const IOS_SPINNER_HEIGHT = 216;

/** i18n dili -> `Intl`/native picker locale etiketi (bkz. `@/utils/format`). */
function activeDateLocale(language: string): string {
  return language === 'en' ? 'en-US' : 'tr-TR';
}

/**
 * "YYYY-MM-DD" -> local Date. Built from numeric parts on purpose:
 * `new Date("YYYY-MM-DD")` parses as UTC midnight and can render as the
 * previous day in negative-offset timezones.
 */
function parseLocalDate(value?: string): Date | null {
  if (!value) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return null;
  const date = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(date.getTime()) ? null : date;
}

/** local Date -> "YYYY-MM-DD". Avoids `toISOString()` UTC shifting a day. */
function formatLocalISO(date: Date): string {
  const y = date.getFullYear();
  const mo = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${mo}-${d}`;
}

/**
 * "31 Ocak 1990" / "January 31, 1990" — aktif dile göre okunabilir gösterim.
 *
 * iOS'ta (Hermes) `toLocaleDateString` saat dilimi verilmezse UTC'de
 * biçimlendiriyor: yerel gece yarısı olan tarih, UTC+3'te BİR ÖNCEKİ güne
 * düşüyordu (kullanıcı 1 Ocak 1990 seçiyor, alanda "31 Aralık 1989" görüyordu).
 * Tarihi gün/ay/yıl parçalarından UTC gece yarısına taşıyıp açıkça UTC'de
 * biçimlendiriyoruz — böylece hangi motorda olursa olsun seçilen gün yazılır.
 */
function formatHuman(date: Date, locale: string): string {
  const utcMidnight = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  );
  return utcMidnight.toLocaleDateString(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export const DateField: React.FC<DateFieldProps> = ({
  label,
  required,
  value,
  onChange,
  error,
  helperText,
  placeholder,
  minimumDate,
  maximumDate,
  testID,
  containerStyle,
}) => {
  const { t } = useTranslation();
  const dateLocale = activeDateLocale(i18nInstance.language);
  const resolvedPlaceholder = placeholder ?? t('auth.birthDatePlaceholder');
  const selectedDate = parseLocalDate(value);
  const fallbackDate = selectedDate ?? maximumDate ?? new Date();

  const [show, setShow] = useState(false);
  // iOS keeps a draft date while the spinner moves, committed on "Tamam".
  const [draft, setDraft] = useState<Date>(fallbackDate);

  const open = () => {
    setDraft(selectedDate ?? maximumDate ?? new Date());
    setShow(true);
  };

  const onAndroidChange = (event: DateTimePickerEvent, date?: Date) => {
    setShow(false);
    if (event.type === 'set' && date) onChange(formatLocalISO(date));
  };

  const onIOSChange = (_event: DateTimePickerEvent, date?: Date) => {
    if (date) setDraft(date);
  };

  return (
    <>
      <FieldTrigger
        testID={testID}
        label={label}
        required={required}
        value={selectedDate ? formatHuman(selectedDate, dateLocale) : null}
        placeholder={resolvedPlaceholder}
        onPress={open}
        error={error}
        helperText={helperText}
        open={show}
        icon="calendar"
        // Yan yana (yarım genişlik) yerleşimde "30 Ağustos 1990" iki satıra sarmasın.
        fitText
        containerStyle={containerStyle}
      />

      {Platform.OS === 'android' && show ? (
        <DateTimePicker
          value={fallbackDate}
          mode="date"
          display="default"
          minimumDate={minimumDate}
          maximumDate={maximumDate}
          onChange={onAndroidChange}
        />
      ) : null}

      {Platform.OS === 'ios' ? (
        <BottomSheet
          isOpen={show}
          onClose={() => setShow(false)}
          title={label ?? resolvedPlaceholder}
          scrollable={false}
          testID={testID ? `${testID}-sheet` : 'date-field-sheet'}
          footer={
            <ButtonRow>
              <Button
                key="cancel"
                variant="outline"
                title={t('common.giveUp')}
                onPress={() => setShow(false)}
              />
              <Button
                key="confirm"
                variant="primary"
                title={t('common.ok')}
                onPress={() => {
                  onChange(formatLocalISO(draft));
                  setShow(false);
                }}
                testID={testID ? `${testID}-confirm` : undefined}
              />
            </ButtonRow>
          }
        >
          <DateTimePicker
            value={draft}
            mode="date"
            display="spinner"
            locale={dateLocale}
            themeVariant="light"
            minimumDate={minimumDate}
            maximumDate={maximumDate}
            onChange={onIOSChange}
            style={styles.iosPicker}
          />
        </BottomSheet>
      ) : null}
    </>
  );
};

const styles = StyleSheet.create({
  iosPicker: {
    alignSelf: 'center',
    // iOS spinner explicit boyut almazsa 0 yüksekliğe çöküp görünmez oluyor (sistem spinner'ı 216pt).
    width: '100%',
    height: IOS_SPINNER_HEIGHT,
  },
});
