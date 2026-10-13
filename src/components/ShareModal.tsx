import { logger, safeError } from '@/services/logger';
import React, { useState } from 'react';
import { View, StyleSheet, Share, Linking, TouchableOpacity, Clipboard } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { theme, Text, Button, Snackbar, Divider, Modal, useModalMessage, ModalMessage, Icon, type IconName } from '@/ui';

// NOT: bu bileşenin bugün hiçbir çağıranı yok (repo genelinde grep — sıfır
// sonuç), yine de bu slice'ın kapsamında adıyla anıldığı için çevrildi.
// Sağlayıcı adları (WhatsApp/Telegram/Twitter/Facebook/Instagram) marka —
// çevrilmez.

const { colors } = theme;

// QR kod opsiyonel bağımlılık — paket yüklenmediğinde ekran bu bölümü gizler.
let QRCode: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  QRCode = require('react-native-qrcode-svg').default;
} catch {
  QRCode = null;
}

interface ShareModalProps {
  visible: boolean;
  onDismiss: () => void;
  title: string;
  shareUrl: string;
  shareText?: string;
  type: 'collection' | 'product' | 'profile';
}

interface ShareOption {
  id: string;
  name: string;
  /** Marka logosu (Ionicons) — Heroicons'ta marka yok. */
  icon?: string;
  /** Marka olmayan seçenekler Heroicons kullanır. */
  heroIcon?: IconName;
  color: string;
  action: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  visible,
  onDismiss,
  title,
  shareUrl,
  shareText,
  type,
}) => {
  const { t } = useTranslation();
  const [snackbar, setSnackbar] = useState({ visible: false, message: '' });
  const [showQR, setShowQR] = useState(false);
  const msg = useModalMessage();

  const fullShareText = shareText || `${title} - Tarodan Diecast Marketplace`;

  const handleNativeShare = async () => {
    try {
      await Share.share({
        message: `${fullShareText}\n\n${shareUrl}`,
        title: title,
        url: shareUrl,
      });
    } catch (error) {
      logger.error('Share error', { err: safeError(error) });
    }
  };

  const handleCopyLink = async () => {
    msg.clear();
    try {
      Clipboard.setString(shareUrl);
      setSnackbar({ visible: true, message: t('common.copied') });
    } catch (error) {
      msg.error(t('common.copyFailed'));
    }
  };

  const handleWhatsAppShare = () => {
    msg.clear();
    const whatsappUrl = `whatsapp://send?text=${encodeURIComponent(`${fullShareText}\n\n${shareUrl}`)}`;
    Linking.openURL(whatsappUrl).catch(() => {
      msg.error(t('shareModal.whatsappOpenFailed'));
    });
  };

  const handleTelegramShare = () => {
    msg.clear();
    const telegramUrl = `tg://msg_url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(fullShareText)}`;
    Linking.openURL(telegramUrl).catch(() => {
      msg.error(t('shareModal.telegramOpenFailed'));
    });
  };

  const handleTwitterShare = () => {
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(fullShareText)}&url=${encodeURIComponent(shareUrl)}`;
    Linking.openURL(twitterUrl);
  };

  const handleFacebookShare = () => {
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
    Linking.openURL(facebookUrl);
  };

  const handleInstagramShare = () => {
    // Instagram doesn't have a direct share URL, just open the app
    Linking.openURL('instagram://app').catch(() => {
      Linking.openURL('https://www.instagram.com');
    });
    setSnackbar({ visible: true, message: t('shareModal.instagramCopyHint') });
    handleCopyLink();
  };

  const handleEmailShare = () => {
    const subject = encodeURIComponent(title);
    const body = encodeURIComponent(`${fullShareText}\n\n${shareUrl}`);
    Linking.openURL(`mailto:?subject=${subject}&body=${body}`);
  };

  const shareOptions: ShareOption[] = [
    {
      id: 'whatsapp',
      name: 'WhatsApp',
      icon: 'logo-whatsapp',
      color: colors.success[600]!,
      action: handleWhatsAppShare,
    },
    {
      id: 'telegram',
      name: 'Telegram',
      heroIcon: 'paper-airplane',
      color: colors.info[600]!,
      action: handleTelegramShare,
    },
    {
      id: 'twitter',
      name: 'Twitter / X',
      icon: 'logo-twitter',
      color: colors.info[600]!,
      action: handleTwitterShare,
    },
    {
      id: 'facebook',
      name: 'Facebook',
      icon: 'logo-facebook',
      color: colors.info[700]!,
      action: handleFacebookShare,
    },
    {
      id: 'instagram',
      name: 'Instagram',
      icon: 'logo-instagram',
      color: colors.danger[600]!,
      action: handleInstagramShare,
    },
    {
      id: 'email',
      name: t('common.email'),
      heroIcon: 'envelope',
      color: colors.text.muted,
      action: handleEmailShare,
    },
  ];

  const getTypeText = () => {
    switch (type) {
      case 'collection':
        return t('shareModal.typeCollection');
      case 'product':
        return t('shareModal.typeProduct');
      case 'profile':
        return t('shareModal.typeProfile');
      default:
        return t('product.share'); // reuse — jenerik "Paylaş"
    }
  };

  return (
    <Modal isOpen={visible} onClose={onDismiss} title={getTypeText()}>
      {/* Share URL Display */}
      <View style={styles.urlContainer}>
        <Text style={styles.urlLabel}>{t('shareModal.urlLabel')}</Text>
        <TouchableOpacity style={styles.urlBox} onPress={handleCopyLink}>
          <Text numberOfLines={1} style={styles.urlText}>
            {shareUrl}
          </Text>
          <Icon name="clipboard-document" size={20} color={colors.primary[600]!} />
        </TouchableOpacity>
      </View>

      <Divider style={styles.divider} />

      {/* QR Code Section */}
      <TouchableOpacity
        style={styles.qrToggle}
        onPress={() => setShowQR(!showQR)}
      >
        <Icon name="qr-code" size={24} color={colors.primary[600]!} />
        <Text style={styles.qrToggleText}>
          {showQR ? t('shareModal.qrHide') : t('shareModal.qrShow')}
        </Text>
        <Icon
          name={showQR ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={colors.text.muted}
        />
      </TouchableOpacity>

      {showQR && QRCode && (
        <View style={styles.qrContainer}>
          <View style={styles.qrCode}>
            <QRCode
              value={shareUrl}
              size={160}
              color={colors.text.heading}
              backgroundColor={colors.surface.DEFAULT}
            />
          </View>
          <Text style={styles.qrHint}>
            {t('shareModal.qrHint')}
          </Text>
        </View>
      )}

      <Divider style={styles.divider} />

      {/* Social Share Options */}
      <Text style={styles.sectionTitle}>{t('shareModal.socialShareTitle')}</Text>
      <View style={styles.shareGrid}>
        {shareOptions.map((option) => (
          <TouchableOpacity
            key={option.id}
            style={styles.shareOption}
            onPress={option.action}
          >
            <View style={[styles.shareIcon, { backgroundColor: colors.surface.alt }]}>
              {option.heroIcon ? (
                <Icon name={option.heroIcon} variant="solid" size={24} color={option.color} />
              ) : (
                <Ionicons name={option.icon as any} size={24} color={option.color} />
              )}
            </View>
            <Text style={styles.shareLabel}>{option.name}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Divider style={styles.divider} />

      {/* Native Share Button */}
      <Button
        variant="primary"
        title={t('shareModal.otherApps')}
        onPress={handleNativeShare}
        icon="share"
        style={styles.shareButton}
      />

      {/* Embed Code (for collections) */}
      {type === 'collection' && (
        <TouchableOpacity
          style={styles.embedLink}
          onPress={() => {
            const embedCode = `<iframe src="${shareUrl}/embed" width="100%" height="400" frameborder="0"></iframe>`;
            Clipboard.setString(embedCode);
            setSnackbar({ visible: true, message: t('shareModal.embedCopied') });
          }}
        >
          <Icon name="code-bracket" size={20} color={colors.primary[600]!} />
          <Text style={styles.embedText}>
            {t('shareModal.embedCopyCta')}
          </Text>
        </TouchableOpacity>
      )}

      <ModalMessage state={msg.state} />

      <Snackbar
        visible={snackbar.visible}
        onDismiss={() => setSnackbar({ ...snackbar, visible: false })}
        duration={2000}
      >
        {snackbar.message}
      </Snackbar>
    </Modal>
  );
};

const styles = StyleSheet.create({
  urlContainer: {
    marginBottom: theme.spacing[2],
  },
  urlLabel: {
    color: colors.text.muted,
    marginBottom: theme.spacing[1],
    fontSize: 11,
  },
  urlBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface.alt,
    borderRadius: theme.radius.xl,
    padding: theme.spacing[3],
  },
  urlText: {
    flex: 1,
    color: colors.text.heading,
    marginRight: theme.spacing[2],
    fontSize: 11,
  },
  divider: {
    marginVertical: theme.spacing[3],
  },
  qrToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing[2],
  },
  qrToggleText: {
    flex: 1,
    marginLeft: theme.spacing[3],
    color: colors.text.heading,
  },
  qrContainer: {
    alignItems: 'center',
    paddingVertical: theme.spacing[4],
  },
  qrCode: {
    padding: theme.spacing[4],
    backgroundColor: colors.white,
    borderRadius: 12,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  qrHint: {
    marginTop: theme.spacing[3],
    color: colors.text.muted,
    textAlign: 'center',
    fontSize: 11,
  },
  sectionTitle: {
    marginBottom: theme.spacing[3],
    color: colors.text.heading,
    fontSize: 13,
    fontWeight: '600',
  },
  shareGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  shareOption: {
    width: '30%',
    alignItems: 'center',
    marginBottom: theme.spacing[4],
  },
  shareIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing[1],
  },
  shareLabel: {
    textAlign: 'center',
    color: colors.text.heading,
    fontSize: 11,
  },
  shareButton: {
    marginBottom: theme.spacing[3],
  },
  embedLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing[3],
    marginBottom: theme.spacing[2],
  },
  embedText: {
    marginLeft: theme.spacing[2],
    color: colors.primary[600]!,
    fontSize: 11,
  },
});

export default ShareModal;
