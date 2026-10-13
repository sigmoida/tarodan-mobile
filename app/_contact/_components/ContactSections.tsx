import { Linking, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { Button, Input, SectionCard, Text, Textarea, theme } from "@/ui";
import { DocLink } from "@/components/content/DocBlocks";
import { LEGAL_ENTITY, SUPPORT_EMAIL } from "@/constants/legalFacts";
import type { ContactFormController } from "../_hooks/useContactForm";

const { spacing } = theme;

/** Etiket (muted) + değer — web `dl` satırı. */
function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.infoRow}>
      <Text variant="bodySm" tone="muted">
        {label}
      </Text>
      {children}
    </View>
  );
}

/** İletişim bilgileri (web ContactClient ilk kart): e-posta bağlantısı + resmi adres. */
export function ContactInfoCard({ f }: { f: ContactFormController }) {
  return (
    <SectionCard title={f.t("information.contactInfo.title")}>
      <View style={styles.info}>
        <InfoRow label={f.t("common.email")}>
          <Text
            variant="bodySm"
            tone="primary"
            accessibilityRole="link"
            onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`)}
          >
            {SUPPORT_EMAIL}
          </Text>
        </InfoRow>
        {/* Telefon / WhatsApp hattı henüz yok — yer tutucu numara gösterilmez.
            Adres: sözleşmelerde yayınlanan resmi künye — tek kaynak. */}
        <InfoRow label={f.t("common.address")}>
          <Text variant="bodySm">{LEGAL_ENTITY.address}</Text>
        </InfoRow>
      </View>
    </SectionCard>
  );
}

/** Mesaj formu (web ContactClient ikinci kart). */
export function ContactFormCard({ f }: { f: ContactFormController }) {
  return (
    <SectionCard title={f.t("contact.formSectionTitle")}>
      <Input label={f.t("checkout.guestName")} value={f.name} onChangeText={f.setName} />
      <Input
        label={f.t("common.email")}
        value={f.email}
        onChangeText={f.setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <Input label={f.t("contact.subject")} value={f.subject} onChangeText={f.setSubject} />
      <Textarea
        label={f.t("contact.message")}
        value={f.message}
        onChangeText={f.setMessage}
        rows={5}
      />
      <Button
        variant="primary"
        size="lg"
        fullWidth
        title={f.t("common.send")}
        onPress={f.handleSubmit}
        isLoading={f.loading}
        disabled={f.loading}
      />
    </SectionCard>
  );
}

/** Çalışma saatleri. */
export function ContactHoursCard({ f }: { f: ContactFormController }) {
  const rows = [
    { day: f.t("contact.hoursWeekdays"), time: "09:00 - 18:00", closed: false },
    { day: f.t("contact.hoursSaturday"), time: "10:00 - 14:00", closed: false },
    { day: f.t("contact.hoursSunday"), time: f.t("contact.hoursClosed"), closed: true },
  ];
  return (
    <SectionCard title={f.t("contact.hoursTitle")}>
      <View style={styles.info}>
        {rows.map((row) => (
          <View key={row.day} style={styles.hoursRow}>
            <Text variant="bodySm" tone="muted">
              {row.day}
            </Text>
            <Text variant="bodySm" weight="medium" tone={row.closed ? "danger" : "heading"}>
              {row.time}
            </Text>
          </View>
        ))}
      </View>
    </SectionCard>
  );
}

/** Yardım merkezi (SSS) bağlantısı. */
export function ContactFaqLink({ f }: { f: ContactFormController }) {
  return <DocLink label={f.t("faq.title")} onPress={() => router.push("/help")} />;
}

const styles = StyleSheet.create({
  info: { gap: spacing[3] },
  infoRow: { gap: spacing[0.5] },
  hoursRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
});
