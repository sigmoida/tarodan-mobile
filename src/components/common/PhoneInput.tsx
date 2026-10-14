import React, { useState } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { Input, Label, RawText, fieldBoxStyle, fieldSizeStyle, theme } from '@/ui';
import {
  DEFAULT_COUNTRY_CODE,
  formatPhoneNumber,
  getPhoneInvalidMessage,
  getPhonePlaceholder,
  isValidPhoneInput,
} from '@/utils/phone';

const { spacing, colors, typography } = theme;

export interface PhoneInputProps {
  /**
   * @deprecated Alan artık TR'ye sabit — bu prop okunur ama kullanıcı DEĞİŞTİREMEZ.
   * Çağrı yerlerinin prop yüzeyi bozulmasın diye imzada duruyor; yeni çağıran
   * geçmesin. (Kaldırılması, dört formun `phoneCountryCode` state'inin ayrı bir
   * turda temizlenmesine bağlı.)
   */
  countryCode?: string;
  /** @deprecated Seçici kaldırıldı; hiçbir zaman çağrılmaz. */
  onCountryCodeChange?: (code: string) => void;
  /** Lokal numara (ör. "5XX XXX XX XX"). */
  phone: string;
  onPhoneChange: (phone: string) => void;
  label?: string;
  /** Etiketin sonuna kırmızı `*` (Input ile aynı `Label`). */
  required?: boolean;
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
 * Sabit `+90` öneki + telefon Input'u (web'deki `PhoneInput`'un native eşi).
 *
 * ## Ülke seçicisi neden KALDIRILDI
 *
 * Sunucu her giriş noktasında `IsTrPhone()` (`/^\+905\d{9}$/`) uyguluyor;
 * staging'de ölçüldü (2026-08-26) — Alman numarası da, TR SABİT HAT da
 * reddediliyor. Seçici 24 ülke sunuyordu, yani kullanıcı TR dışı bir kod
 * seçtiği anda formu doldurup gönderiyor ve sunucudan 400 alıyordu; istemci
 * doğrulaması bunu yakalamıyordu çünkü kendi kuralı daha gevşekti.
 *
 * Web aynı kararı verdi ve gerekçesini paylaşılan `PhoneInput`'a yazdı:
 * "Tarodan ships to Turkey only, so the dial code is displayed rather than
 * chosen — a picker would promise destinations the rest of the stack cannot
 * serve." Adreste ülke alanı yok, şehir 81 ilin kapalı listesinden geliyor,
 * Sürat yurt içi kargo, PayTR TL ile çalışıyor.
 *
 * ⚠️ Formatlayıcı KIRPMAZ: on haneye sığmayan girdi ham kalır (kullanıcı ne
 * yazdığını görür), `validateOnBlur` ile de hata metni gösterilir.
 */
export const PhoneInput: React.FC<PhoneInputProps> = ({
  phone,
  onPhoneChange,
  label,
  required,
  error,
  containerStyle,
  validateOnBlur = false,
  invalidMessage,
  testID,
}) => {
  // Tek geçerli kod. Değişken kalıyor çünkü formatlayıcı/placeholder/doğrulayıcı
  // hepsi kodu argüman alıyor — sabiti üç yere gömmek yeni bir ayrışma yolu olurdu.
  const code = DEFAULT_COUNTRY_CODE;
  // Yazarken değil, alandan çıkınca uyar — yarım numarayı kırmızıya boyamak
  // kullanıcıyı her tuş vuruşunda cezalandırırdı.
  const [blurred, setBlurred] = useState(false);

  const showInvalid =
    validateOnBlur && blurred && phone.trim().length > 0 && !isValidPhoneInput(phone, code);
  // Üstten gelen (form/submit) hata önceliklidir — o, gönderimi engelleyen hatadır.
  // `getPhoneInvalidMessage()` — React DIŞI okuma (phone.ts), `@/utils/phone`
  // ile AYNI mesajı gösterir; PHONE_INVALID_MESSAGE ile aynı anlaşma.
  const shownError = error ?? (showInvalid ? (invalidMessage ?? getPhoneInvalidMessage()) : undefined);

  return (
    <View style={containerStyle}>
      {label ? <Label required={required}>{label}</Label> : null}
      <View style={styles.row}>
        {/* Seçilemez önek — gösterilir, seçilmez (web paritesi). */}
        <View style={[fieldBoxStyle({ error: shownError }), styles.codePrefix]}>
          <RawText
            maxFontSizeMultiplier={typography.maxFontScale.control}
            style={styles.codePrefixText}
          >
            {code}
          </RawText>
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
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[2],
  },
  // Zemin/çerçeve/yükseklik/dolgu `fieldBoxStyle`'dan (numara alanıyla aynı); burada yalnız içerik hizası.
  codePrefix: {
    minWidth: spacing[16],
    justifyContent: 'center',
  },
  codePrefixText: {
    fontSize: fieldSizeStyle.md.font,
    color: colors.text.body,
  },
  phoneInput: {
    flex: 1,
  },
});

export default PhoneInput;
