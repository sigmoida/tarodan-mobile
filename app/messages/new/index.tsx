import { Button } from "@/ui";
import { PageShell } from "@/components/common/PageShell";
import { useTranslation } from "react-i18next";
import { useNewMessage } from "./_hooks/useNewMessage";
import { NewMessageBody } from "./_components/NewMessageBody";

/** Yeni mesaj — PageShell (klavye kaçınma, güvenli alan) + SectionCard bölümleri, sabit "Gönder". */
export default function NewMessageScreen() {
  const { t } = useTranslation();
  const f = useNewMessage();

  return (
    <PageShell
      title={t("mobile.messagesNew")}
      onBack={f.handleBack}
      footer={
        <Button
          variant="primary"
          fullWidth
          size="lg"
          title={t("common.send")}
          onPress={f.handleSend}
          disabled={
            !f.selectedUser || !f.messageText.trim() || !f.canSend || f.sending
          }
          isLoading={f.sending}
        />
      }
    >
      <NewMessageBody f={f} />
    </PageShell>
  );
}
