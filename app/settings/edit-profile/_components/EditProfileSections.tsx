import { View, Pressable } from "react-native";
import { Alert, Avatar, Badge, DateField, Input, SectionCard, Spinner, theme, Icon } from "@/ui";
import { Controller } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "@/stores/authStore";
import { AppImage } from "@/components/AppImage";
import { PhoneInput } from "@/components/common";
import { styles } from "../_lib/styles";
import { MAX_BIO_LENGTH, minBirthDate } from "../_lib/schema";
import type { EditProfileController } from "../_hooks/useEditProfile";
import type { AvatarUploadController } from "../_hooks/useUploadAvatar";

const { colors, iconSize } = theme;

/**
 * Profil fotoğrafı (kamera rozeti işlev taşır: fotoğraf değiştir). Seçilince anında yüklenir
 * (`useUploadAvatar`); yükleme sürerken önizlemenin üstünde gösterge, dokunma kapalı.
 */
export function AvatarSection({ avatar }: { avatar: AvatarUploadController }) {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  return (
    <View style={styles.avatarSection}>
      <Pressable
        onPress={avatar.pick}
        disabled={avatar.isUploading}
        accessibilityRole="button"
        accessibilityLabel={t("profile.changePhoto")}
        accessibilityState={{ busy: avatar.isUploading, disabled: avatar.isUploading }}
        testID="edit-profile-avatar"
      >
        {avatar.avatar ? (
          <AppImage source={avatar.avatar} variant="detail" allowDeviceUris={avatar.isLocalPreview} style={styles.avatar} />
        ) : (
          <Avatar size="xl" name={user?.displayName || "U"} />
        )}
        {avatar.isUploading ? (
          <View style={styles.avatarUploading} testID="edit-profile-avatar-uploading">
            <Spinner size="md" color={colors.text.inverted} />
          </View>
        ) : null}
        <View style={styles.avatarEditBadge}>
          <Icon name="camera" variant="solid" size={iconSize.sm} color={colors.text.inverted} />
        </View>
      </Pressable>
    </View>
  );
}

/** Kişisel bilgiler — isim / telefon / doğum / bio. (Kullanıcı adı ve e-posta ayrı bölümlerde.) */
export function PersonalInfoCard({ f }: { f: EditProfileController }) {
  const { t } = useTranslation();
  const { control, errors } = f;

  return (
    <SectionCard title={t("profile.personalInfo")}>
      <Controller
        control={control}
        name="displayName"
        render={({ field: { onChange, value } }) => (
          <Input
            label={t("profile.displayName")}
            required
            value={value}
            onChangeText={onChange}
            error={errors.displayName?.message}
            containerStyle={styles.input}
          />
        )}
      />

      <Controller
        control={control}
        name="phone"
        render={({ field: { onChange, value } }) => (
          <PhoneInput
            testID="profile-phone-input"
            label={t("common.phone")}
            // Kaydete basmadan önce görsün: çözülemeyen numara blur'da uyarır.
            validateOnBlur
            countryCode={f.phoneCountryCode}
            onCountryCodeChange={f.setPhoneCountryCode}
            phone={value ?? ""}
            onPhoneChange={onChange}
            containerStyle={styles.input}
            error={errors.phone?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="birthDate"
        render={({ field: { onChange, value } }) => (
          <DateField
            label={t("auth.birthDate")}
            value={value}
            onChange={onChange}
            placeholder={t("auth.birthDatePlaceholder")}
            maximumDate={minBirthDate()}
            containerStyle={styles.input}
            error={errors.birthDate?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="bio"
        render={({ field: { onChange, value } }) => (
          <Input
            label={`${t("profile.bio")} (${f.bioLength}/${MAX_BIO_LENGTH})`}
            value={value}
            onChangeText={onChange}
            multiline
            numberOfLines={4}
            maxLength={MAX_BIO_LENGTH}
            containerStyle={styles.lastInput}
            placeholder={t("mobile.bioPlaceholder")}
            error={errors.bio?.message}
          />
        )}
      />
    </SectionCard>
  );
}

/** İşletme bilgileri — yalnız business üyelikte. */
export function BusinessInfoCard({ f }: { f: EditProfileController }) {
  const { t } = useTranslation();
  if (!f.isBusinessTier) return null;
  const { control, errors } = f;

  return (
    <SectionCard
      title={t("sellerDashboard.businessInfo")}
      badge={<Badge size="sm">{t("profile.businessMembershipBadge")}</Badge>}
    >
      <Controller
        control={control}
        name="companyName"
        render={({ field: { onChange, value } }) => (
          <Input
            label={t("profile.companyLegalNameLabel")}
            required
            value={value}
            onChangeText={onChange}
            placeholder={t("profile.companyPlaceholder")}
            containerStyle={styles.input}
            error={errors.companyName?.message}
            helperText={f.companyNameValue ? undefined : t("profile.companyNameRequiredWarning")}
          />
        )}
      />

      <Controller
        control={control}
        name="taxId"
        render={({ field: { onChange, value } }) => (
          <Input
            label={t("auth.taxId")}
            value={value}
            onChangeText={(text) => onChange(text.replace(/\D/g, "").slice(0, 11))}
            keyboardType="number-pad"
            placeholder="1234567890"
            containerStyle={styles.input}
            error={errors.taxId?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="taxOffice"
        render={({ field: { onChange, value } }) => (
          <Input
            label={t("profile.taxOffice")}
            value={value}
            onChangeText={onChange}
            placeholder={t("profile.taxOfficePlaceholder")}
            containerStyle={styles.input}
            error={errors.taxOffice?.message}
          />
        )}
      />

      <Alert variant="info">{t("profile.corporateInfoNotice")}</Alert>
    </SectionCard>
  );
}
