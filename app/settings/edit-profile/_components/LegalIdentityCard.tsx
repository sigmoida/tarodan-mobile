import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Card, Spinner, Text, theme } from '@/ui';
import { useLegalIdentityStatus } from '@/hooks/useLegalIdentity';
import {
  LEGAL_IDENTITY_FIELD_I18N_KEYS,
  type LegalIdentityField,
} from '@/lib/shared/legalIdentity';
import { styles as screenStyles } from '../_lib/styles';

/**
 * Üyenin yasal kimliği — SALT OKUNUR (web `profile/_sections/LegalIdentitySection`).
 * Kimlik adımında bir kez girilir; üye sonradan değiştiremez (düzeltme yalnız
 * destek/admin). TCKN sunucudan maskeli gelir, tam numara istemciye hiç dönmez.
 * Durum alınamazsa kart çizilmez (bilgi kartı; ekranı bozmasın).
 */
export function LegalIdentityCard() {
  const { t } = useTranslation();
  const { status, isLoading, isError } = useLegalIdentityStatus();
  if (isError) return null;

  const rows: Array<{ key: LegalIdentityField; value: string | null }> = [
    { key: 'legalFirstName', value: status?.legalFirstName ?? null },
    { key: 'legalLastName', value: status?.legalLastName ?? null },
    { key: 'nationalId', value: status?.nationalIdMasked ?? null },
  ];

  return (
    <Card style={screenStyles.card} testID="legal-identity-card">
      <Text variant="h3" style={screenStyles.sectionTitle}>
        {t('identity.profile.title')}
      </Text>
      <Text variant="bodySm" tone="muted" style={styles.description}>
        {t('identity.profile.description')}
      </Text>
      {isLoading ? (
        <Spinner />
      ) : (
        <>
          {rows.map(({ key, value }) => (
            <View key={key} style={styles.row} testID={`legal-identity-${key}`}>
              <Text variant="bodySm" tone="muted">
                {t(LEGAL_IDENTITY_FIELD_I18N_KEYS[key])}
              </Text>
              <Text
                variant={value ? 'body' : 'bodySm'}
                tone={value ? 'heading' : 'subtle'}
                weight={value ? 'semibold' : undefined}
              >
                {value ?? t('identity.profile.notProvided')}
              </Text>
            </View>
          ))}
          <Text variant="caption" tone="muted">
            {t('identity.profile.lockedNote')}
          </Text>
        </>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  description: { marginBottom: theme.spacing[3] },
  row: { marginBottom: theme.spacing[3], gap: theme.spacing[1] },
});
