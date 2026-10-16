import { ContentPage } from "@/components/content/ContentPage";
import { useContactForm } from "./_hooks/useContactForm";
import {
  ContactFaqLink,
  ContactFormCard,
  ContactHoursCard,
  ContactInfoCard,
} from "./_components/ContactSections";

/**
 * İletişim — web `(corporate)/contact` düzeni: sayfa açıklaması + iletişim bilgileri kartı +
 * mesaj formu kartı (+ mobilde çalışma saatleri). Kişi başı ikon kutuları ve "yardım" kutusu
 * kalktı; bilgi/başarı mesajları toast. Mantık `useContactForm`'da.
 */
export default function ContactScreen() {
  const f = useContactForm();
  return (
    <ContentPage title={f.t("mobile.pageContact")} description={f.t("contact.subtitle")}>
      <ContactInfoCard f={f} />
      <ContactFormCard f={f} />
      <ContactHoursCard f={f} />
      <ContactFaqLink f={f} />
    </ContentPage>
  );
}
