import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/ui";
import { supportApi } from "@/lib/api";
import { qk } from "@/lib/query";
import { useAuthStore } from "@/stores/authStore";
import { useTranslation } from "react-i18next";
import { useTimingValues } from "@/hooks/useTimingPolicy";
import { buildFaqCategories } from "../_lib/faq";

/**
 * Help center controller — owns the FAQ search/accordion state, the contact
 * form state + validation + submit (guest vs. authenticated ticket). Lifted verbatim from
 * the monolithic HelpScreen; feedback is `toast` (web react-hot-toast).
 */
export function useHelp() {
  const { t } = useTranslation();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedCategory, setExpandedCategory] = useState<string | null>(
    "general",
  );
  const [expandedQuestion, setExpandedQuestion] = useState<string | null>(null);
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactMessage, setContactMessage] = useState("");
  const [contactSubmitting, setContactSubmitting] = useState(false);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.length > 2) {
      setExpandedCategory(null);
    }
  };

  const timing = useTimingValues();
  const FAQ_CATEGORIES = useMemo(() => buildFaqCategories(t, timing), [t, timing]);

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
      toast.error(t("common.fillAllFields"));
      return;
    }
    // Backend DTO ile parite (GuestContactDto / CreateTicketDto): name @MinLength(2),
    // message @MinLength(10).
    if (contactName.trim().length < 2) {
      toast.error(t("help.contactNameTooShort"));
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(contactEmail.trim())) {
      toast.error(t("validation.invalidEmail"));
      return;
    }
    if (contactMessage.trim().length < 10) {
      toast.error(t("validation.messageMin"));
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
        // "Destek Taleplerim" listesi yalnız bayatsa tazeleniyor → yeni talep görünsün.
        void queryClient.invalidateQueries({ queryKey: qk.support.tickets });
        toast.success(t("help.ticketCreated"));
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
        toast.success(t("contact.success"));
      }
    } catch {
      toast.error(t("contact.sendFailed"));
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
  };
}

export type HelpController = ReturnType<typeof useHelp>;
