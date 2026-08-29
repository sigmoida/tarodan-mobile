import { View, ScrollView, TouchableOpacity } from "react-native";
import { Button, Snackbar, Text, ScreenHeader } from "@/ui";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { useEditProfile } from "./_hooks/useEditProfile";
import { styles } from "./_lib/styles";
import {
  AvatarSection,
  PersonalInfoCard,
  BusinessInfoCard,
} from "./_components/EditProfileSections";

export default function EditProfileScreen() {
  const { t } = useTranslation();
  const f = useEditProfile();

  if (!f.isAuthenticated) {
    return (
      <View style={styles.centeredContainer}>
        <Text variant="h3">{t("membership.loginRequiredTitle")}</Text>
        <Button
          variant="primary"
          title={t("common.login")}
          onPress={() => router.push("/(auth)/login")}
          style={{ alignSelf: "center" }}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={t("mobile.settingsEditProfile")}
        onBack={() =>
          router.canGoBack() ? router.back() : router.replace("/(tabs)")
        }
        right={
          <TouchableOpacity onPress={f.handleSubmit(f.onSubmit)}>
            <Text style={styles.saveButton}>{t("mobile.save")}</Text>
          </TouchableOpacity>
        }
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <AvatarSection f={f} />
        <PersonalInfoCard f={f} />
        <BusinessInfoCard f={f} />

        <Button
          variant="ghost"
          title={t("settings.emailChangeLink")}
          onPress={() => router.push('/settings/email-change' as never)}
          testID="edit-profile-email-change"
        />

        <Button
          variant="ghost"
          title={t("settings.usernameLink")}
          onPress={() => router.push('/settings/username' as never)}
          testID="edit-profile-username"
        />

        <Button
          variant="primary"
          fullWidth
          title={t("product.saveChanges")}
          icon="checkmark"
          onPress={f.handleSubmit(f.onSubmit)}
          isLoading={f.updateMutation.isPending}
          disabled={f.updateMutation.isPending}
          style={styles.submitButton}
        />

        <View style={{ height: 50 }} />
      </ScrollView>

      <Snackbar
        visible={f.snackbar.visible}
        onDismiss={() => f.setSnackbar({ ...f.snackbar, visible: false })}
        duration={3000}
        variant={f.snackbar.variant ?? "default"}
      >
        {f.snackbar.message}
      </Snackbar>
    </View>
  );
}
