import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { qk } from "@/lib/query";
import { router } from "expo-router";
import { appAlert, useModalMessage, alertAfterClose } from "@/ui";
import { useAuthStore } from "@/stores/authStore";
import { authApi } from "@/lib/api";
import { useTranslation } from "react-i18next";
import {
  PHONE_INVALID_MESSAGE,
  parsePhoneForPayload,
  splitPhone,
} from "@/utils/phone";

/**
 * Güvenlik ekranı controller'ı — şifre değiştirme, 2FA kurulum/kapat/yedek-kod,
 * telefon doğrulama akışlarının tüm state'i, effect'leri ve handler'ları. Lifted
 * verbatim from the monolithic SecuritySettingsScreen. appAlert modal AÇIKKEN
 * donma yaptığı için modal-içi geri bildirimler useModalMessage ile gösterilir.
 */
export function useSecurity() {
  const { t } = useTranslation();
  const { isAuthenticated, logout, user, refreshUserData } = useAuthStore();
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [showTwoFactorSetup, setShowTwoFactorSetup] = useState(false);
  const [loading, setLoading] = useState(false);

  // Disable / yedek kod yenileme: backend her ikisinde de geçerli TOTP kodu ister.
  const [showDisableDialog, setShowDisableDialog] = useState(false);
  const [disableCode, setDisableCode] = useState("");
  const [showRegenerateDialog, setShowRegenerateDialog] = useState(false);
  const [regenerateCode, setRegenerateCode] = useState("");
  const [newBackupCodes, setNewBackupCodes] = useState<string[] | null>(null);

  // Gerçek 2FA durumunu sunucudan çek (user nesnesinde twoFactorEnabled yok —
  // o alan yalnız AdminUser'da; normal kullanıcıda kaynak TwoFactorSecret.isEnabled).
  // 2FA durumu React Query ile (CLAUDE.md §6). Ulaşılamazsa kapalı varsayılır —
  // eski davranış korundu; `retry: false` çünkü tek bir hata "bilinmiyor"
  // demek, tekrar denemek kullanıcıya bir şey kazandırmıyor.
  const twoFactorQuery = useQuery({
    queryKey: qk.user.twoFactorStatus,
    retry: false,
    queryFn: async () => {
      const res = await authApi.getTwoFactorStatus();
      const payload = (res.data as any)?.data ?? (res.data as any) ?? {};
      return !!payload.isEnabled;
    },
  });

  useEffect(() => {
    if (twoFactorQuery.data !== undefined) setTwoFactorEnabled(twoFactorQuery.data);
  }, [twoFactorQuery.data]);

  // Telefon doğrulama. Alan artık paylaşılan `PhoneInput` (ülke kodu + formatlı
  // lokal parça); gönderilen değer daima `parsePhoneForPayload` çıktısı E.164.
  const [showPhoneDialog, setShowPhoneDialog] = useState(false);
  const initialPhone = splitPhone(user?.phone || "");
  const [phoneCountryCode, setPhoneCountryCode] = useState(initialPhone.countryCode);
  const [phoneInput, setPhoneInput] = useState(initialPhone.phone);
  const [phoneCode, setPhoneCode] = useState("");
  const [phoneStep, setPhoneStep] = useState<"enter" | "verify">("enter");
  const [phoneVerified, setPhoneVerified] = useState(!!user?.isPhoneVerified);
  const [resendIn, setResendIn] = useState(0);
  // Modal-içi mesaj (bilgi/hata). appAlert modal AÇIKKEN çağrılırsa iOS'ta iki
  // transparent RNModal üst üste gelir ve dokunuşları kilitler → uygulama donar.
  // Bu yüzden modal içindeki geri bildirimleri alert yerine burada gösteriyoruz.
  const [phoneMsg, setPhoneMsg] = useState<{
    type: "info" | "error";
    text: string;
  } | null>(null);

  // 4 ayrı modal için mesaj örnekleri (şifre / 2FA kurulum / 2FA kapat / yedek kod)
  const pwMsg = useModalMessage();
  const twoFaMsg = useModalMessage();
  const disableMsg = useModalMessage();
  const regenMsg = useModalMessage();

  useEffect(() => {
    if (resendIn <= 0) return;
    const id = setInterval(() => setResendIn((s) => s - 1), 1000);
    return () => clearInterval(id);
  }, [resendIn]);

  const handleSendPhoneCode = async () => {
    // Çözülemeyen numarayı sunucuya sormadan burada durdur — kullanıcı reddin
    // sebebini görsün (diğer telefon yollarıyla aynı sözleşme, Plan 4).
    const e164 = parsePhoneForPayload(phoneInput, phoneCountryCode);
    if (!e164) {
      setPhoneMsg({ type: "error", text: PHONE_INVALID_MESSAGE });
      return;
    }
    setLoading(true);
    setPhoneMsg(null);
    try {
      await authApi.sendPhoneCode(e164);
      setPhoneStep("verify");
      setResendIn(60);
      // Modal açık: alert yerine modal-içi bilgi mesajı (iç içe modal donmasını önler).
      setPhoneMsg({
        type: "info",
        text: t('security.phoneCodeSent'),
      });
    } catch (e: any) {
      setPhoneMsg({
        type: "error",
        text: e?.response?.data?.message || t('security.phoneCodeSendFailed'),
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyPhone = async () => {
    setLoading(true);
    setPhoneMsg(null);
    try {
      await authApi.verifyPhone(phoneCode);
      setPhoneVerified(true);
      await refreshUserData();
      // Önce modal'ı kapat, başarı alert'ini modal TAMAMEN kapandıktan sonra göster.
      // Aynı anda kapatıp açmak iOS'ta modal sunum çakışması → donma yapıyordu.
      setShowPhoneDialog(false);
      setPhoneStep("enter");
      setPhoneCode("");
      setPhoneMsg(null);
      setTimeout(
        () => appAlert(t('common.success'), t('security.phoneVerified')),
        400,
      );
    } catch (e: any) {
      // Hata da modal açıkken: alert yerine modal-içi hata mesajı.
      setPhoneMsg({
        type: "error",
        text: e?.response?.data?.message || t('security.phoneCodeWrong'),
      });
    } finally {
      setLoading(false);
    }
  };

  // Password change
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // 2FA setup
  const [totpSecret, setTotpSecret] = useState("");
  // Ölçüldü (staging, /security/2fa/enable): gövde `secret`, `qrCodeUrl`,
  // `qrCodeImage`, `backupCodes` döndürüyor — `qrCode` diye bir alan yok.
  // QR'ı çizecek olan base64 data URI `qrCodeImage`'ta.
  const [totpQrImage, setTotpQrImage] = useState("");
  const [verificationCode, setVerificationCode] = useState("");

  const handlePasswordChange = async () => {
    pwMsg.clear();
    if (newPassword !== confirmPassword) {
      pwMsg.error(t('validation.passwordMatch'));
      return;
    }

    // API ChangePasswordDto ile birebir aynı kural — yoksa ham 400 dönüyordu
    const strongPassword =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!strongPassword.test(newPassword)) {
      pwMsg.error(
        t('security.passwordRules'),
      );
      return;
    }

    setLoading(true);
    try {
      await authApi.changePassword(currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      alertAfterClose(
        () => setShowPasswordDialog(false),
        t('common.success'),
        t('security.passwordChanged'),
      );
    } catch (error: any) {
      pwMsg.error(error.response?.data?.message || t('security.passwordChangeFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleSetupTwoFactor = async () => {
    setLoading(true);
    try {
      const response = await authApi.setupTwoFactor();
      const payload =
        (response.data as any)?.data ?? (response.data as any) ?? {};
      setTotpSecret(payload.secret ?? "");
      setTotpQrImage(payload.qrCodeImage ?? "");
      twoFaMsg.clear();
      setShowTwoFactorSetup(true);
    } catch (error: any) {
      appAlert(
        t('common.error'),
        error.response?.data?.message || t('security.twoFactorSetupFailed'),
      );
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyTwoFactor = async () => {
    twoFaMsg.clear();
    if (verificationCode.length !== 6) {
      twoFaMsg.error(t('security.enterSixDigitCode'));
      return;
    }

    setLoading(true);
    try {
      await authApi.verifyTwoFactor(verificationCode);
      setTwoFactorEnabled(true);
      setVerificationCode("");
      alertAfterClose(
        () => setShowTwoFactorSetup(false),
        t('common.success'),
        t('security.twoFactorEnabled'),
      );
    } catch (error: any) {
      twoFaMsg.error(error.response?.data?.message || t('security.verificationFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleDisableTwoFactor = () => {
    // Backend disable için geçerli TOTP kodu ister; kod giriş dialog'unu aç.
    setDisableCode("");
    disableMsg.clear();
    setShowDisableDialog(true);
  };

  const confirmDisableTwoFactor = async () => {
    disableMsg.clear();
    if (disableCode.length !== 6) {
      disableMsg.error(t('security.enterSixDigitCode'));
      return;
    }
    setLoading(true);
    try {
      await authApi.disableTwoFactor(disableCode);
      setTwoFactorEnabled(false);
      setDisableCode("");
      alertAfterClose(
        () => setShowDisableDialog(false),
        t('common.success'),
        t('security.twoFactorDisabled'),
      );
    } catch (error: any) {
      disableMsg.error(error.response?.data?.message || t('common.operationFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerateBackupCodes = async () => {
    regenMsg.clear();
    if (regenerateCode.length !== 6) {
      regenMsg.error(t('security.enterSixDigitCode'));
      return;
    }
    setLoading(true);
    try {
      const res = await authApi.regenerateBackupCodes(regenerateCode);
      const data: any = res.data;
      const codes: string[] = Array.isArray(data)
        ? data
        : (data?.backupCodes ?? data?.data ?? []);
      setNewBackupCodes(codes);
      setRegenerateCode("");
    } catch (error: any) {
      regenMsg.error(
        error.response?.data?.message || t('security.backupCodesRegenFailed'),
      );
    } finally {
      setLoading(false);
    }
  };

  const handleLogoutAllDevices = () => {
    appAlert(
      t('security.logoutAllTitle'),
      t('security.logoutAllBody'),
      [
        { text: t('common.cancel'), style: "cancel" },
        {
          text: t('common.logout'),
          style: "destructive",
          onPress: async () => {
            try {
              await authApi.logoutAll();
              logout();
              router.replace("/(auth)/login");
            } catch (error) {
              appAlert(t('common.error'), t('common.operationFailed'));
            }
          },
        },
      ],
    );
  };

  return {
    t,
    isAuthenticated,
    loading,
    // 2FA
    twoFactorEnabled,
    handleSetupTwoFactor,
    handleDisableTwoFactor,
    showTwoFactorSetup,
    setShowTwoFactorSetup,
    twoFaMsg,
    totpSecret,
    totpQrImage,
    verificationCode,
    setVerificationCode,
    handleVerifyTwoFactor,
    showDisableDialog,
    setShowDisableDialog,
    disableMsg,
    disableCode,
    setDisableCode,
    confirmDisableTwoFactor,
    // backup codes
    showRegenerateDialog,
    setShowRegenerateDialog,
    regenMsg,
    newBackupCodes,
    setNewBackupCodes,
    regenerateCode,
    setRegenerateCode,
    handleRegenerateBackupCodes,
    // password
    showPasswordDialog,
    setShowPasswordDialog,
    pwMsg,
    currentPassword,
    setCurrentPassword,
    newPassword,
    setNewPassword,
    confirmPassword,
    setConfirmPassword,
    handlePasswordChange,
    // phone
    user,
    phoneVerified,
    showPhoneDialog,
    setShowPhoneDialog,
    phoneInput,
    setPhoneInput,
    phoneCountryCode,
    setPhoneCountryCode,
    phoneCode,
    setPhoneCode,
    phoneStep,
    setPhoneStep,
    phoneMsg,
    setPhoneMsg,
    resendIn,
    handleSendPhoneCode,
    handleVerifyPhone,
    // sessions
    handleLogoutAllDevices,
  };
}

export type SecurityController = ReturnType<typeof useSecurity>;
