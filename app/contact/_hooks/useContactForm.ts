import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "@/ui";
import { supportApi } from "@/lib/api";

/**
 * İletişim formu denetleyicisi — alan durumu, doğrulama ve misafir iletişim gönderimi. İş mantığı
 * önceki ekrandan AYNEN taşındı; yalnız geri bildirim Snackbar'dan toast'a geçti (web
 * react-hot-toast). Doğrulama sırası ve mesajlar değişmedi.
 */
export function useContactForm() {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!name || !email || !subject || !message) {
      toast.error(t("common.fillAllFields"));
      return;
    }
    // Backend DTO ile parite (GuestContactDto): name @MinLength(2), message @MinLength(10).
    if (name.trim().length < 2) {
      toast.error(t("validation.displayNameMin"));
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      toast.error(t("validation.invalidEmail"));
      return;
    }
    if (message.trim().length < 10) {
      toast.error(t("contact.messageTooShort"));
      return;
    }

    setLoading(true);
    try {
      await supportApi.guestContact({ name, email, subject, message });
      toast.success(t("contact.success"));
      setName("");
      setEmail("");
      setSubject("");
      setMessage("");
    } catch {
      toast.error(t("contact.sendFailed"));
    } finally {
      setLoading(false);
    }
  };

  return {
    t,
    name,
    setName,
    email,
    setEmail,
    subject,
    setSubject,
    message,
    setMessage,
    loading,
    handleSubmit,
  };
}

export type ContactFormController = ReturnType<typeof useContactForm>;
