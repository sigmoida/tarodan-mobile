import { LegalWebPage } from '@/components/legal/LegalWebPage';

/** Gizlilik Politikası / KVKK Aydınlatma Metni (KVKK bağlantıları da buraya gelir) — web `/app/privacy` (uygulama modu) WebView'de. */
export default function PrivacyPolicyScreen() {
  return <LegalWebPage doc="privacy" />;
}
