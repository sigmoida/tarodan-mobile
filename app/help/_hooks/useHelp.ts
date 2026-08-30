import { useMemo, useState } from "react";
import { supportApi } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import { useTranslation } from "react-i18next";
import { buildFaqCategories } from "../_lib/faq";

/**
 * Help center controller — owns the FAQ search/accordion state, the contact
 * form state + validation + submit (guest vs. authenticated ticket), and the
 * snackbar. Lifted verbatim from the monolithic HelpScreen.
 */
export function useHelp() {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedCategory, setExpandedCategory] = useState<string | null>(
    "general",
  );
  const [expandedQuestion, setExpandedQuestion] = useState<string | null>(null);
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactMessage, setContactMessage] = useState("");
  const [contactSubmitting, setContactSubmitting] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarVariant, setSnackbarVariant] = useState<"success" | "danger">(
    "danger",
  );

  const showSnack = (message: string, variant: "success" | "danger") => {
    setSnackbarMessage(message);
    setSnackbarVariant(variant);
    setSnackbarVisible(true);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.length > 2) {
      setExpandedCategory(null);
    }
  };

  const FAQ_CATEGORIES = useMemo(() => buildFaqCategories(t), [t]);

  const filteredFAQs =
    searchQuery.length > 2
      ? FAQ_CATEGORIES.map((cat) => ({
          ...cat,
          questions: cat.questions.filter(
            (q) =>
              q.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
              q.a.toLowerCase().includes(searchQuery.toLowerCase()),
          ),
        })).filter((cat) => cat.questions.length > 0)
      : FAQ_CATEGORIES;

  const handleSubmitContact = async () => {
    if (contactSubmitting) return;
    if (!contactName.trim() || !contactEmail.trim() || !contactMessage.trim()) {
      showSnack(t("common.fillAllFields"), "danger");
      return;
    }
    // Backend DTO ile parite (GuestContactDto / CreateTicketDto): name @MinLength(2),
    // message @MinLength(10).
    if (contactName.trim().length < 2) {
      showSnack(t("help.contactNameTooShort"), "danger");
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(contactEmail.trim())) {
      showSnack(t("validation.invalidEmail"), "danger");
      return;
    }
    if (contactMessage.trim().length < 10) {
      showSnack(t("validation.messageMin"), "danger");
      return;
    }

    setContactSubmitting(true);
    try {
      if (isAuthenticated) {
        // Giriş yapmış kullanıcı: takip edilebilir bir destek talebi (DB'de creatorId'li)
        // oluştur → "Destek Taleplerim"de görünür. guestContact yalnız Redis'e yazar
        // ve kullanıcı bir daha göremez.
        await supportApi.createTicket({
          subject: t("help.ticketSubject"),
          category: "other",
          message: contactMessage.trim(),
        });
        setContactMessage("");
        showSnack(t("help.ticketCreated"), "success");
      } else {
        // Misafir: kimlik bağlı ticket oluşturulamaz; misafir iletişim formuna düşer.
        await supportApi.guestContact({
          name: contactName.trim(),
          email: contactEmail.trim(),
          message: contactMessage.trim(),
        });
        setContactName("");
        setContactEmail("");
        setContactMessage("");
        showSnack(t("contact.success"), "success");
      }
    } catch {
      showSnack(t("contact.sendFailed"), "danger");
    } finally {
      setContactSubmitting(false);
    }
  };

  return {
    t,
    // FAQ
    searchQuery,
    handleSearch,
    expandedCategory,
    setExpandedCategory,
    expandedQuestion,
    setExpandedQuestion,
    filteredFAQs,
    // contact form
    contactName,
    setContactName,
    contactEmail,
    setContactEmail,
    contactMessage,
    setContactMessage,
    contactSubmitting,
    handleSubmitContact,
    // snackbar
    snackbarVisible,
    setSnackbarVisible,
    snackbarMessage,
    snackbarVariant,
  };
}

export type HelpController = ReturnType<typeof useHelp>;
