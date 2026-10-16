import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { FlatList } from 'react-native';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import { appAlert, toast, type ActionSheetAction } from '@/ui';
import { useMessagesStore } from '@/stores/messagesStore';
import { useAuthStore } from '@/stores/authStore';
import {
  useThreadQuery,
  useMessagesQuery,
  useSendMessage,
  useMarkAsRead,
  useDailyMessageLimit,
} from '@/hooks/messaging';
import { detectViolations, embedImageInMessage, getViolationMessage } from '@/utils/contentFilter';
import { fromPickerAsset, pickerQuality, type LocalImageFile } from '@/lib/media';
import { apiErrorMessage } from '@/lib/api/errorText';
import { getSocket } from '@/services/socket';
import { groupMessagesByDate } from '../_lib/helpers';
import { uploadMessageAttachment } from '../_lib/uploadAttachment';
import { useBlockStatus, useBlockUser } from '@/hooks/useBlockUser';
import { useTypingIndicator } from './useTypingIndicator';
import { useAutoScroll } from './useAutoScroll';

/**
 * Message-thread controller — thread/messages artık React Query (#77), send/markRead
 * mutation hook'ları. Aktif thread `setCurrentThreadId` ile store'a yazılır (socket
 * köprüsü açık/kapalı ayrımı için). getOtherParticipant client store; günlük hak sunucudan (useDailyMessageLimit).
 */
export function useMessageThread() {
  const { t } = useTranslation();
  const { threadId } = useLocalSearchParams<{ threadId: string }>();
  const user = useAuthStore((s) => s.user);
  const getOtherParticipant = useMessagesStore((s) => s.getOtherParticipant);
  const setCurrentThreadId = useMessagesStore((s) => s.setCurrentThreadId);
  const { data: currentThread = null } = useThreadQuery(threadId);
  const { data: messages = [], isLoading: isLoadingMessages } = useMessagesQuery(threadId);
  const sendMessage = useSendMessage();
  const markAsRead = useMarkAsRead();
  const typing = useTypingIndicator(threadId);

  // Yazılan metin BURADA değil, `MessageInputBar`'ın kendi state'inde: her tuş vuruşu yalnız
  // input barını yeniden çizer (controller + mesaj listesi değil). Gönderimde `handleSend(text)`.
  const [sending, setSending] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  // Seçilen foto gönderilmeden önce input üstünde önizlenir; kullanıcı onaylayınca gönderilir.
  const [pendingImage, setPendingImage] = useState<LocalImageFile | null>(null);
  const [filterWarning, setFilterWarning] = useState<string | null>(null);
  // İçerik filtresi uyarısını 5 sn sonra gizleyen zamanlayıcı — yeni uyarıda ve unmount'ta temizlenir.
  const filterWarningTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (filterWarningTimer.current) clearTimeout(filterWarningTimer.current);
    },
    [],
  );
  const [showReportModal, setShowReportModal] = useState(false);
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false);
  // İlk açılışta liste en alta konumlanana dek gizli tutulur (zıplama görünmesin).
  const [isPositioned, setIsPositioned] = useState(false);
  const scrollViewRef = useRef<FlatList>(null);

  // Sunucu sayımı (GET /messages/daily-limit); bilinmiyorsa engellenmez.
  const { limit: messageLimit, canSend, refetch: refetchDailyLimit } = useDailyMessageLimit();

  // Thread/messages query'leri enabled:threadId ile kendiliğinden çeker. Focus'ta:
  // aktif thread'i işaretle (socket köprüsü için), okundu yap, socket odasına gir.
  useFocusEffect(
    useCallback(() => {
      if (threadId) {
        setCurrentThreadId(threadId);
        markAsRead(threadId);
        getSocket()?.emit('join:thread', { threadId });
      }
      return () => {
        if (threadId) {
          getSocket()?.emit('leave:thread', { threadId });
          setCurrentThreadId(null);
        }
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [threadId])
  );

  // Ekrana her dönüşte hak tazelenir: gece yarısını (UTC) aşıp açık kalan ya da arka
  // plandan dönen thread bayat "hak bitti" ile kilitli kalmasın. `cancelRefetch:false`:
  // ilk açılıştaki sorgu zaten uçuştaysa ikinci istek atılmaz.
  useFocusEffect(
    useCallback(() => {
      void refetchDailyLimit({ cancelRefetch: false });
    }, [refetchDailyLimit]),
  );

  // Thread değişince ilk konumlama sıfırlanır
  useEffect(() => {
    setIsPositioned(false);
  }, [threadId]);

  // İlk yüklemede animasyonsuz en alta konumla (liste o ana dek gizli);
  // sonraki içerik değişimlerinde yalnız kullanıcı dibe yakınsa veya kendi
  // mesajını gönderdiyse kaydır (bkz. layout denetimi B3 — useAutoScroll).
  const { handleScroll, handleContentSizeChange, forceScrollToBottom } = useAutoScroll(
    scrollViewRef,
    isPositioned,
    setIsPositioned,
    messages.length > 0 || !isLoadingMessages,
  );

  /**
   * Resim seç → önizleme olarak input üstüne ekle. Gönderim, kullanıcı
   * gönder butonuna basınca handleSend içinde yapılır (yanlışlıkla
   * direkt gönderim olmasın diye onay adımı).
   */
  const handleAttachImage = async () => {
    if (!threadId || uploadingImage || sending || !canSend) return;

    // İzin İSTENMEZ: iOS PHPicker ve Android Photo Picker galeriye erişim izni gerektirmez
    // (avatar / koleksiyon kapağı seçicileri de istemiyor). Eski istek reddedilince seçici hiç
    // açılmıyordu — gereksiz bir çıkmaz.
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: false,
      quality: pickerQuality(),
    });

    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    // Önizleme yerel URI'yle; küçültme ve iOS FormData biçimi gönderim anında.
    setPendingImage(fromPickerAsset(asset, asset.uri.split('/').pop() || `image_${Date.now()}.jpg`));
  };

  /**
   * Metni (input barının state'i) gönderir. `true` → gönderildi, input bar metni temizler;
   * `false` → gönderilmedi (filtre, hata, koşul), metin olduğu gibi kalır.
   */
  const handleSend = async (inputText: string): Promise<boolean> => {
    const trimmed = inputText.trim();
    if ((!trimmed && !pendingImage) || !threadId || sending || uploadingImage || !canSend) return false;

    typing.stopTyping();

    // Platform dışı iletişim tespiti (telefon, email, IBAN, WhatsApp vs.)
    if (trimmed) {
      const violations = detectViolations(trimmed);
      if (violations.length > 0) {
        setFilterWarning(getViolationMessage(violations));
        if (filterWarningTimer.current) clearTimeout(filterWarningTimer.current);
        filterWarningTimer.current = setTimeout(() => {
          filterWarningTimer.current = null;
          setFilterWarning(null);
        }, 5000);
        return false;
      }
    }

    setSending(true);
    try {
      let content = trimmed;

      // Önizlenen foto varsa önce yükle, "[IMG:url]" formatında mesaja ekle.
      // Web `apps/web/src/app/messages/page.tsx:337` ile aynı format.
      if (pendingImage) {
        setUploadingImage(true);
        try {
          const url = await uploadMessageAttachment(pendingImage);
          if (!url) throw new Error(t('message.imageUploadedNoUrl'));
          // İşaret formatının TEK kaynağı `embedImageInMessage` — burada elle
          // kurmak `parseMessageContent` ile sessizce birbirinden ayrılabilirdi.
          content = embedImageInMessage(trimmed, url);
        } catch (e: any) {
          toast.error(apiErrorMessage(e, t('message.imageSendFailed')));
          return false;
        } finally {
          setUploadingImage(false);
        }
      }

      try {
        await sendMessage.mutateAsync({ threadId, content });
        setPendingImage(null);
        // Kullanıcının kendi mesajı: konumdan bağımsız HER ZAMAN dibe kaydır.
        forceScrollToBottom();
        return true;
      } catch (e: any) {
        // Sunucu mesajı önce: `e.message` axios'un ham "Request failed with
        // status code 400" metni idi.
        toast.error(apiErrorMessage(e, t('message.sendFailed')));
        return false;
      }
    } finally {
      setSending(false);
    }
  };

  // Referans kararlı: controller başka bir state yüzünden render olduğunda liste satırları
  // (MessageList `rows` useMemo'su) yeniden türetilmesin.
  const groupedMessages = useMemo(() => groupMessagesByDate(messages, t), [messages, t]);
  const other = currentThread ? getOtherParticipant(currentThread) : null;

  // Engelleme/şikayet paylaşılan hook'ta: onay, bildirim ve invalidasyon TEK
  // yerde (Apple App Review 1.2 — satıcı profili ve ilan detayıyla aynı akış).
  const { isBlocked } = useBlockStatus(other?.id);
  const { requestBlock, requestUnblock } = useBlockUser({
    onBlocked: () => (router.canGoBack() ? router.back() : router.replace('/(tabs)')),
  });

  // Başlık menüsü (ActionSheet): her eylem sheet TAMAMEN kapandıktan sonra çalışır, bu yüzden
  // şikayet modalı / engel onayı (appAlert) zamanlayıcı hack'i olmadan açılır (§12).
  const handleHeaderMenu = () => {
    if (other) setHeaderMenuOpen(true);
  };
  const closeHeaderMenu = () => setHeaderMenuOpen(false);
  const headerMenuActions: ActionSheetAction[] = other
    ? [
        { key: 'profile', label: t('message.viewProfile'), onPress: () => router.push(`/seller/${other.id}`) },
        { key: 'report', label: t('profile.report'), onPress: () => setShowReportModal(true) },
        isBlocked
          ? { key: 'unblock', label: t('profile.unblock'), onPress: () => requestUnblock(other.id, other.displayName) }
          : {
              key: 'block',
              label: t('profile.block'),
              destructive: true,
              onPress: () => requestBlock(other.id, other.displayName),
            },
      ]
    : [];

  return {
    user,
    currentThread,
    messages,
    isLoadingMessages,
    // input state (metin MessageInputBar'da)
    sending,
    uploadingImage,
    pendingImage,
    setPendingImage,
    filterWarning,
    showReportModal,
    setShowReportModal,
    isPositioned,
    scrollViewRef,
    // limit
    messageLimit,
    canSend,
    // derived
    groupedMessages,
    other,
    // typing indicator
    isPeerTyping: typing.isPeerTyping,
    notifyTyping: typing.notifyTyping,
    // handlers
    handleContentSizeChange,
    handleScroll,
    handleAttachImage,
    handleSend,
    handleHeaderMenu,
    headerMenuOpen,
    closeHeaderMenu,
    headerMenuActions,
  };
}

export type MessageThreadController = ReturnType<typeof useMessageThread>;
