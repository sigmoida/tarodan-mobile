import { useState } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Linking,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  theme,
  Button,
  Card,
  Snackbar,
  Text,
  Input,
  Textarea,
  ScreenHeader,
} from "@/ui";
import { supportApi } from "@/lib/api";
import { useTranslation } from "react-i18next";
import {
  SUPPORT_EMAIL,
  SUPPORT_PHONE,
  SUPPORT_WHATSAPP,
} from "@/constants/legalFacts";
import { styles } from './_contact/_lib/styles';

const { colors } = theme;

export default function ContactScreen() {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ visible: false, message: "" });

  const handleSubmit = async () => {
    if (!name || !email || !subject || !message) {
      setSnackbar({ visible: true, message: t("common.fillAllFields") });
      return;
    }
    // Backend DTO ile parite (GuestContactDto): name @MinLength(2), message @MinLength(10).
    if (name.trim().length < 2) {
      setSnackbar({
        visible: true,
        message: t("validation.displayNameMin"),
      });
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setSnackbar({
        visible: true,
        message: t("validation.invalidEmail"),
      });
      return;
    }
    if (message.trim().length < 10) {
      setSnackbar({
        visible: true,
        message: t("contact.messageTooShort"),
      });
      return;
    }

    setLoading(true);
    try {
      await supportApi.guestContact({ name, email, subject, message });
      setSnackbar({ visible: true, message: t("contact.success") });
      setName("");
      setEmail("");
      setSubject("");
      setMessage("");
    } catch {
      setSnackbar({
        visible: true,
        message: t("contact.sendFailed"),
      });
    } finally {
      setLoading(false);
    }
  };

  const contactMethods = [
    {
      icon: "mail-outline",
      title: t("common.email"),
      value: SUPPORT_EMAIL,
      action: () => Linking.openURL(`mailto:${SUPPORT_EMAIL}`),
    },
    {
      icon: "call-outline",
      title: t("common.phone"),
      value: SUPPORT_PHONE,
      action: () => Linking.openURL("tel:+902121234567"),
    },
    {
      icon: "logo-whatsapp",
      title: "WhatsApp",
      value: SUPPORT_WHATSAPP,
      action: () => Linking.openURL("https://wa.me/905321234567"),
    },
    {
      icon: "location-outline",
      title: t("common.address"),
      value: t("information.contactInfo.addressValue"),
      action: () => {},
    },
  ];

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={t("mobile.pageContact")}
        onBack={() =>
          router.canGoBack() ? router.back() : router.replace("/(tabs)")
        }
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Contact Methods */}
        <Text style={styles.sectionTitle}>{t("guides.contactLink")}</Text>
        <View style={styles.contactMethods}>
          {contactMethods.map((method, index) => (
            <TouchableOpacity
              key={index}
              style={styles.contactMethod}
              onPress={method.action}
            >
              <View style={styles.contactMethodIcon}>
                <Ionicons
                  name={method.icon as any}
                  size={24}
                  color={colors.primary[600]!}
                />
              </View>
              <View style={styles.contactMethodContent}>
                <Text style={styles.contactMethodTitle}>{method.title}</Text>
                <Text style={styles.contactMethodValue}>{method.value}</Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={colors.text.subtle}
              />
            </TouchableOpacity>
          ))}
        </View>

        {/* Contact Form */}
        <Text style={styles.sectionTitle}>{t("contact.formSectionTitle")}</Text>
        <Card style={styles.formCard}>
          <Input
            label={t("checkout.guestName")}
            value={name}
            onChangeText={setName}
            style={styles.input}
          />
          <Input
            label={t("common.email")}
            value={email}
            onChangeText={setEmail}
            style={styles.input}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Input
            label={t("contact.subject")}
            value={subject}
            onChangeText={setSubject}
            style={styles.input}
          />
          <Textarea
            label={t("contact.message")}
            value={message}
            onChangeText={setMessage}
            style={styles.input}
            rows={5}
          />
          <Button
            variant="primary"
            title={t("common.send")}
            onPress={handleSubmit}
            isLoading={loading}
            disabled={loading}
            style={styles.submitButton}
          />
        </Card>

        {/* Working Hours */}
        <Text style={styles.sectionTitle}>{t("contact.hoursTitle")}</Text>
        <Card style={styles.hoursCard}>
          <View style={styles.hoursRow}>
            <Text style={styles.hoursDay}>{t("contact.hoursWeekdays")}</Text>
            <Text style={styles.hoursTime}>09:00 - 18:00</Text>
          </View>
          <View style={styles.hoursRow}>
            <Text style={styles.hoursDay}>{t("contact.hoursSaturday")}</Text>
            <Text style={styles.hoursTime}>10:00 - 14:00</Text>
          </View>
          <View style={styles.hoursRow}>
            <Text style={styles.hoursDay}>{t("contact.hoursSunday")}</Text>
            <Text style={styles.hoursClosed}>{t("contact.hoursClosed")}</Text>
          </View>
        </Card>

        {/* FAQ Link */}
        <TouchableOpacity
          style={styles.faqLink}
          onPress={() => router.push("/help")}
        >
          <Ionicons
            name="help-circle-outline"
            size={24}
            color={colors.primary[600]!}
          />
          <Text style={styles.faqLinkText}>{t("faq.title")}</Text>
          <Ionicons
            name="chevron-forward"
            size={20}
            color={colors.primary[600]!}
          />
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      <Snackbar
        visible={snackbar.visible}
        onDismiss={() => setSnackbar({ ...snackbar, visible: false })}
        duration={3000}
      >
        {snackbar.message}
      </Snackbar>
    </View>
  );
}

