import { View, Pressable, Image } from "react-native";
import {
  Alert,
  Avatar,
  Badge,
  Button,
  DateField,
  Input,
  SectionCard,
  theme,
} from "@/ui";
import { router } from "expo-router";
import { Controller } from "react-hook-form";
import { Ionicons } from "@expo/vector-icons";
import { MembershipBadgeCard } from "@/components/PremiumBadge";
import { CAN_BUY_DIGITAL } from "@/lib/purchases";
import { useTranslation } from "react-i18next";
import { resolveImageUrl } from "@/utils/imageUrl";
import { PhoneInput } from "@/components/common";
import { styles } from "../_lib/styles";
import { MAX_BIO_LENGTH, minBirthDate } from "../_lib/schema";
import type { EditProfileController } from "../_hooks/useEditProfile";

const { colors, iconSize } = theme;

/** Avatar seçici (kamera rozeti işlev taşır: fotoğraf değiştir) + üyelik rozeti. */
export function AvatarSection({ f }: { f: EditProfileController }) {
  const { t } = useTranslation();
  return (
    <>
      <View style={styles.avatarSection}>
        <Pressable
          onPress={f.pickAvatar}
          accessibilityRole="button"
          accessibilityLabel={t("profile.changePhoto")}
        >
          {f.avatar ? (
            <Image source={{ uri: resolveImageUrl(f.avatar) }} style={styles.avatar} />
          ) : (
            <Avatar size="xl" name={f.user?.displayName || "U"} />
          )}
          <View style={styles.avatarEditBadge}>
            <Ionicons name="camera" size={iconSize.sm} color={colors.text.inverted} />
          </View>
        </Pressable>
      </View>

      {/* Kartın tamamını sarmak rozeti de gizlerdi; bu yüzden yalnız onUpgrade prop'u
          koşullanır — undefined'ken kart yükseltme düğmesini zaten render etmiyor. */}
      <MembershipBadgeCard
        membershipTier={f.user?.membershipTier || "free"}
        isVerified={f.user?.isVerified}
        onUpgrade={CAN_BUY_DIGITAL ? () => router.push("/upgrade") : undefined}
      />
    </>
  );
}

/** Kişisel bilgiler — isim / e-posta (salt okunur) / telefon / doğum / bio. */
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

      {/* E-posta — salt okunur (web ile parite) */}
      <Input
        label={t("auth.emailAddress")}
        value={f.user?.email || ""}
        editable={false}
        helperText={t("profile.emailChangeNote")}
        containerStyle={styles.input}
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

/** Hesap bağlantıları — e-posta ve kullanıcı adı değişikliği ayrı ekranlarda. */
export function AccountLinks() {
  const { t } = useTranslation();
  return (
    <View style={styles.links}>
      <Button
        variant="outline"
        fullWidth
        title={t("settings.emailChangeLink")}
        onPress={() => router.push("/settings/email-change" as never)}
        testID="edit-profile-email-change"
      />
      <Button
        variant="outline"
        fullWidth
        title={t("settings.usernameLink")}
        onPress={() => router.push("/settings/username" as never)}
        testID="edit-profile-username"
      />
    </View>
  );
}
