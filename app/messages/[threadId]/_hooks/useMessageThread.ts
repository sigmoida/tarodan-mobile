import { useState, useRef, useEffect, useCallback } from 'react';
import { FlatList, Platform } from 'react-native';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import { appAlert } from '@/ui';
import { useMessagesStore } from '@/stores/messagesStore';
import { useAuthStore } from '@/stores/authStore';
import { useThreadQuery, useMessagesQuery, useSendMessage, useMarkAsRead } from '@/hooks/messaging';
import { detectViolations, embedImageInMessage, getViolationMessage } from '@/utils/contentFilter';
import { mediaApi } from '@/lib/api';
import { getSocket } from '@/services/socket';
import { groupMessagesByDate } from '../_lib/helpers';
import { useBlockStatus, useBlockUser } from '@/hooks/useBlockUser';
import { useTypingIndicator } from './useTypingIndicator';
import { useAutoScroll } from './useAutoScroll';

/**
 * Message-thread controller — thread/messages artık React Query (#77), send/markRead
 * mutation hook'ları. Aktif thread `setCurrentThreadId` ile store'a yazılır (socket
 * köprüsü açık/kapalı ayrımı için). getOtherParticipant + canSendMessage client store.
 */
export function useMessageThread() {
  const { t } = useTranslation();
  const { threadId } = useLocalSearchParams<{ threadId: string }>();
  const { user, limits } = useAuthStore();
  const getOtherParticipant = useMessagesStore((s) => s.getOtherParticipant);
  const canSendMessage = useMessagesStore((s) => s.canSendMessage);
  const setCurrentThreadId = useMessagesStore((s) => s.setCurrentThreadId);
  const { data: currentThread = null } = useThreadQuery(threadId);
  const { data: messages = [], isLoading: isLoadingMessages } = useMessagesQuery(threadId);
  const sendMessage = useSendMessage();
  const markAsRead = useMarkAsRead();
  const typing = useTypingIndicator(threadId);

  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  // Seçilen foto gönderilmeden önce input üstünde önizlenir; kullanıcı onaylayınca gönderilir.
  const [pendingImage, setPendingImage] = useState<{ uri: string; name: string; type: string } | null>(null);
  const [filterWarning, setFilterWarning] = useState<string | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);
  // İlk açılışta liste en alta konumlanana dek gizli tutulur (zıplama görünmesin).
  const [isPositioned, setIsPositioned] = useState(false);
  const scrollViewRef = useRef<FlatList>(null);

  const messageLimit = limits?.maxMessagesPerDay || 50;
  const isUnlimited = messageLimit === -1;
  const canSend = canSendMessage();

  // Thread/messages query'leri enabled:threadId ile kendiliğinden çeker. Focus'ta:
  // aktif thread'i işaretle (socket köprüsü için), okundu yap, socket odasına gir.
  useFocusEffect(
    useCallback(() => {
      if (threadId) {
        setCurrentThreadId(threadId);
        markAsRead.mutate(threadId);
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

    // İzin iste
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      appAlert(t('order.permissionRequired'), t('order.galleryPermissionBody'));
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: false,
      quality: 0.8,
    });

    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    const filename = asset.uri.split('/').pop() || `image_${Date.now()}.jpg`;
    const match = /\.(\w+)$/.exec(filename);
    const type = asset.mimeType || (match ? `image/${match[1]}` : 'image/jpeg');

    setPendingImage({
      uri: Platform.OS === 'ios' ? asset.uri.replace('file://', '') : asset.uri,
      name: filename,
      type,
    });
  };

  const handleSend = async () => {
    const trimmed = inputText.trim();
    if ((!trimmed && !pendingImage) || !threadId || sending || uploadingImage || !canSend) return;

    typing.stopTyping();

    // Platform dışı iletişim tespiti (telefon, email, IBAN, WhatsApp vs.)
    if (trimmed) {
      const violations = detectViolations(trimmed);
      if (violations.length > 0) {
        setFilterWarning(getViolationMessage(violations));
        setTimeout(() => setFilterWarning(null), 5000);
        return;
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
          const response = await mediaApi.uploadMessageImage(pendingImage as any);
          const url = (response.data as any)?.url ?? (response.data as any)?.data?.url;
          if (!url) throw new Error(t('message.imageUploadedNoUrl'));
          // İşaret formatının TEK kaynağı `embedImageInMessage` — burada elle
          // kurmak `parseMessageContent` ile sessizce birbirinden ayrılabilirdi.
          content = embedImageInMessage(trimmed, url);
        } catch (e: any) {
          appAlert(t('common.error'), e?.response?.data?.message || t('message.imageSendFailed'));
          return;
        } finally {
          setUploadingImage(false);
        }
      }

      try {
        await sendMessage.mutateAsync({ threadId, content });
        setInputText('');
        setPendingImage(null);
        // Kullanıcının kendi mesajı: konumdan bağımsız HER ZAMAN dibe kaydır.
        forceScrollToBottom();
      } catch (e: any) {
        appAlert(
          t('message.sendFailed'),
          e?.message || e?.response?.data?.message || t('message.tryAgainBody')
        );
      }
    } finally {
      setSending(false);
    }
  };

  const groupedMessages = groupMessagesByDate(messages, t);
  const other = currentThread ? getOtherParticipant(currentThread) : null;

  // Engelleme/şikayet paylaşılan hook'ta: onay, bildirim ve invalidasyon TEK
  // yerde (Apple App Review 1.2 — satıcı profili ve ilan detayıyla aynı akış).
  const { isBlocked } = useBlockStatus(other?.id);
  const { requestBlock, requestUnblock } = useBlockUser({
    onBlocked: () => (router.canGoBack() ? router.back() : router.replace('/(tabs)')),
  });

  const handleHeaderMenu = () => {
    if (!other) return;
    appAlert(other.displayName, undefined, [
      { text: t('message.viewProfile'), onPress: () => router.push(`/seller/${other.id}`) },
      // iOS'ta alert modalı kapanırken yeni bir native Modal açılırsa görünmeyebilir; kapanışı bekle.
      { text: t('profile.report'), onPress: () => setTimeout(() => setShowReportModal(true), 300) },
      isBlocked
        ? { text: t('profile.unblock'), onPress: () => requestUnblock(other.id, other.displayName) }
        : {
            text: t('profile.block'),
            style: 'destructive' as const,
            onPress: () => requestBlock(other.id, other.displayName),
          },
      { text: t('common.cancel'), style: 'cancel' },
    ]);
  };

  return {
    user,
    currentThread,
    messages,
    isLoadingMessages,
    // input state
    inputText,
    setInputText,
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
    isUnlimited,
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
  };
}

export type MessageThreadController = ReturnType<typeof useMessageThread>;
