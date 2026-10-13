import { useTranslation } from 'react-i18next';
import { Button } from '@/ui';
import { PageShell } from '@/components/common/PageShell';

import { useSecurityAuthGate } from './_hooks/useSecurityAuthGate';
import { usePhoneVerificationFlow } from './_hooks/usePhoneVerificationFlow';
import { PhoneCodeStep, PhoneEnterStep } from './_components/PhoneSteps';

/**
 * Telefon doğrulama (web PhoneVerificationModal'ın ekran hâli): numara → SMS kodu. Ana düğme
 * PageShell alt çubuğunda (klavyenin üstünde); kod adımında geri oku / Android geri tuşu numara
 * adımına döner. Başarı: geri + toast (`useDoVerifyPhone`).
 */
export default function PhoneVerificationScreen() {
  const { t } = useTranslation();
  const isAuthenticated = useSecurityAuthGate();
  const f = usePhoneVerificationFlow();
  if (!isAuthenticated) return null;

  const isEnter = f.step === 'enter';
  return (
    <PageShell
      title={t('profile.security.phoneVerification')}
      onBack={f.onBack}
      footer={
        isEnter ? (
          <Button
            variant="primary"
            size="lg"
            fullWidth
            title={t('profile.sendCode')}
            onPress={f.submitPhone}
            isLoading={f.isSending}
            disabled={!f.canSend}
            testID="phone-send-code"
          />
        ) : (
          <Button
            variant="primary"
            size="lg"
            fullWidth
            title={t('profile.verify')}
            onPress={f.submitCode}
            isLoading={f.isVerifying}
            disabled={!f.canVerify}
            testID="phone-verify-submit"
          />
        )
      }
    >
      {isEnter ? <PhoneEnterStep f={f} /> : <PhoneCodeStep f={f} />}
    </PageShell>
  );
}
