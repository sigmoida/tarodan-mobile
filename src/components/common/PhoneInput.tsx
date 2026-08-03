import React, { useState } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { Input, Select, Text, theme } from '@/ui';
import {
  countryCodes,
  DEFAULT_COUNTRY_CODE,
  formatPhoneNumber,
  getPhonePlaceholder,
  isValidPhoneInput,
  PHONE_INVALID_MESSAGE,
} from '@/utils/phone';

const { spacing, typography, colors } = theme;

export interface PhoneInputProps {
  /** Ülke kodu (ör. "+90"). */
  countryCode: string;
  onCountryCodeChange: (code: string) => void;
  /** Lokal numara (ör. "5XX XXX XX XX"). */
  phone: string;
  onPhoneChange: (phone: string) => void;
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
  /**
   * Opt-in: alan blur'landıktan sonra çözülemeyen numara için alanın altında
   * Türkçe hata gösterilir (ve düzeltilince anında kaybolur).
   *
   * Neden opt-in: dört çağrı yerinin prop yüzeyi bozulmasın ve her form kendi
   * gönderim gate'iyle birlikte açsın. Doğrulama `@/utils/phone` ile AYNI
   * ayrıştırıcıyı kullanır — alanın gösterdiği hata ile gönderimi engelleyen
   * kural ayrışamaz.
   */
  validateOnBlur?: boolean;
  /** `validateOnBlur` mesajını özelleştirmek için (varsayılan: paylaşılan metin). */
  invalidMessage?: string;
  testID?: string;
}

/**
 * Ülke kodu Select + telefon Input combo'su (web'deki PhoneInput'un native eşi).
 * Formatlama ve placeholder otomatik; varsayılan ülke kodu +90.
 *
 * ⚠️ Formatlayıcı KIRPMAZ: on haneye sığmayan girdi ham kalır (kullanıcı ne
 * yazdığını görür), `validateOnBlur` ile de hata metni gösterilir.
 */
export const PhoneInput: React.FC<PhoneInputProps> = ({
  countryCode,
  onCountryCodeChange,
  phone,
  onPhoneChange,
  label,
  error,
  containerStyle,
  validateOnBlur = false,
  invalidMessage = PHONE_INVALID_MESSAGE,
  testID,
}) => {
  const code = countryCode || DEFAULT_COUNTRY_CODE;
  // Yazarken değil, alandan çıkınca uyar — yarım numarayı kırmızıya boyamak
  // kullanıcıyı her tuş vuruşunda cezalandırırdı.
  const [blurred, setBlurred] = useState(false);

  const showInvalid =
    validateOnBlur && blurred && phone.trim().length > 0 && !isValidPhoneInput(phone, code);
  // Üstten gelen (form/submit) hata önceliklidir — o, gönderimi engelleyen hatadır.
  const shownError = error ?? (showInvalid ? invalidMessage : undefined);

  return (
    <View style={containerStyle}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={styles.row}>
        <View style={styles.codeSelect}>
          <Select
            value={code}
            onChange={onCountryCodeChange}
            options={countryCodes.map((cc) => ({
              value: cc.code,
              label: `${cc.code} ${cc.country}`,
            }))}
          />
        </View>
        <Input
          testID={testID}
          value={phone}
          onChangeText={(text) => onPhoneChange(formatPhoneNumber(text, code))}
          onBlur={() => setBlurred(true)}
          keyboardType="phone-pad"
          textContentType="telephoneNumber"
          placeholder={getPhonePlaceholder(code)}
          error={shownError}
          containerStyle={styles.phoneInput}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  label: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: colors.text.heading,
    marginBottom: spacing[1.5],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[2],
  },
  codeSelect: {
    width: 108,
  },
  phoneInput: {
    flex: 1,
  },
});

export default PhoneInput;
