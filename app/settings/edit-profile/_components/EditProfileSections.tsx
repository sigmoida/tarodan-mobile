import { View, TouchableOpacity, Image } from "react-native";
import {
  Avatar,
  Card,
  DateField,
  Input,
  Text,
  theme,
} from "@/ui";
import { router } from "expo-router";
import { Controller } from "react-hook-form";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { MembershipBadgeCard } from "@/components/PremiumBadge";
import { useTranslation } from "react-i18next";
import { resolveImageUrl } from "@/utils/imageUrl";
import { PhoneInput } from "@/components/common";
import { styles } from "../_lib/styles";
import { MAX_BIO_LENGTH, minBirthDate } from "../_lib/schema";
import type { EditProfileController } from "../_hooks/useEditProfile";

const { colors } = theme;

/** Avatar seçici + üyelik rozeti başlığı. */
export function AvatarSection({ f }: { f: EditProfileController }) {
  return (
    <>
      <View style={styles.avatarSection}>
        <TouchableOpacity onPress={f.pickAvatar}>
          {f.avatar ? (
            <Image
              source={{ uri: resolveImageUrl(f.avatar) }}
              style={styles.avatar}
            />
          ) : (
            <Avatar size="xl" name={f.user?.displayName || "U"} />
          )}
          <View style={styles.avatarEditBadge}>
            <Ionicons name="camera" size={18} color={colors.white} />
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.membershipSection}>
        <MembershipBadgeCard
          membershipTier={f.user?.membershipTier || "free"}
          isVerified={f.user?.isVerified}
          onUpgrade={() => router.push("/upgrade")}
        />
      </View>
    </>
  );
}

/** Kişisel bilgiler kartı — isim / e-posta (salt okunur) / telefon / doğum / bio. */
export function PersonalInfoCard({ f }: { f: EditProfileController }) {
  const { t } = useTranslation();
  const { control, errors } = f;

  return (
    <Card style={styles.card}>
      <Text variant="h3" style={styles.sectionTitle}>
        {t("profile.personalInfo")}
      </Text>

      <Controller
        control={control}
        name="displayName"
        render={({ field: { onChange, value } }) => (
          <Input
            label={`${t("profile.displayName")} *`}
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
        containerStyle={styles.input}
      />
      <Text variant="bodySm" style={styles.hintText}>
        {`🔒 ${t("profile.emailChangeNote")}`}
      </Text>

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
            containerStyle={styles.input}
            placeholder={t("mobile.bioPlaceholder")}
            error={errors.bio?.message}
          />
        )}
      />
    </Card>
  );
}

/** İşletme bilgileri kartı — sadece business tier'da render edilir. */
export function BusinessInfoCard({ f }: { f: EditProfileController }) {
  const { t } = useTranslation();
  if (!f.isBusinessTier) return null;
  const { control, errors } = f;

  return (
    <Card style={styles.card}>
      <View style={styles.businessHeader}>
        <View style={styles.premiumFeatureHeader}>
          <MaterialCommunityIcons
            name="office-building"
            size={20}
            color={colors.primary[600]!}
          />
          <Text variant="h3" style={styles.premiumFeatureTitle}>
            {t("sellerDashboard.businessInfo")}
          </Text>
        </View>
        <View style={styles.tierBadge}>
          <Text variant="bodySm" style={styles.tierBadgeText}>
            {t("profile.businessMembershipBadge")}
          </Text>
        </View>
      </View>

      <Controller
        control={control}
        name="companyName"
        render={({ field: { onChange, value } }) => (
          <Input
            label={`${t("profile.companyLegalNameLabel")} *`}
            value={value}
            onChangeText={onChange}
            placeholder={t("profile.companyPlaceholder")}
            containerStyle={styles.input}
            error={errors.companyName?.message}
          />
        )}
      />
      {!f.companyNameValue && (
        <Text variant="bodySm" style={styles.warningText}>
          {`⚠️ ${t("profile.companyNameRequiredWarning")}`}
        </Text>
      )}

      <Controller
        control={control}
        name="taxId"
        render={({ field: { onChange, value } }) => (
          <Input
            label={t("auth.taxId")}
            value={value}
            onChangeText={(text) =>
              onChange(text.replace(/\D/g, "").slice(0, 11))
            }
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

      <View style={styles.infoBox}>
        <Text variant="bodySm" style={styles.infoBoxText}>
          {`ℹ️ ${t("profile.corporateInfoNotice")}`}
        </Text>
      </View>
    </Card>
  );
}
