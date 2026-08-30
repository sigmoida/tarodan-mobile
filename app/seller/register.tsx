import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Button, Text, theme } from '@/ui';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScreenHeader, EmptyState } from '@/components/common';
import { useAuthStore } from '@/stores/authStore';

const { colors } = theme;

/**
 * İşletme Hesabı — bilgilendirme ekranı.
 *
 * Web/backend mantığı: işletme hesabı AYRI bir hesaptır (POST /auth/register/business
 * → yeni user create eder). Mevcut bireysel hesap "işletmeye yükseltilmez".
 * Bu ekran kullanıcıyı bilgilendirir ve ayrı kurumsal kayıt akışına yönlendirir.
 */
export default function SellerRegisterScreen() {
  const { t } = useTranslation();
  const { isAuthenticated, user } = useAuthStore();

  const handleBack = () =>
    router.canGoBack() ? router.back() : router.replace('/(tabs)');

  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <ScreenHeader title={t('seller.businessAccountTitle')} onBack={handleBack} />
        <EmptyState
          fullscreen
          icon="briefcase-outline"
          title={t('seller.useBusinessRegisterForm')}
          actionLabel={t('seller.openBusinessAccount')}
          onAction={() => router.push('/(auth)/register-business')}
        />
      </View>
    );
  }

  const isBusinessAccount = !!(user?.companyName && user?.taxId);
  const isBusinessTier = user?.membershipTier === 'business';

  // Zaten kurumsal hesap: yönlendirme yerine üyelik/yönetim aksiyonu göster.
  if (isBusinessAccount) {
    return (
      <View style={styles.container}>
        <ScreenHeader title={t('seller.businessAccountTitle')} onBack={handleBack} />
        <ScrollView contentContainerStyle={styles.scrollBody}>
          <View style={styles.infoCard}>
            <Ionicons name="checkmark-circle" size={22} color={colors.success[600]!} />
            <Text style={styles.infoCardText}>
              {t('seller.alreadyBusinessAccount')}
              {isBusinessTier
                ? t('seller.businessMembershipActiveNote')
                : t('seller.completeBusinessMembershipNote')}
            </Text>
          </View>

          <Button
            testID="seller-register-continue-application"
            variant="primary"
            fullWidth
            title={t('seller.completeOrEditApplication')}
            onPress={() => router.push('/settings/business-application' as never)}
            style={styles.submitBtn}
          />

          {!isBusinessTier ? (
            <Button
              variant="outline"
              fullWidth
              title={t('seller.switchToBusinessMembership')}
              onPress={() => router.replace('/membership')}
              style={styles.submitBtn}
            />
          ) : null}

          <Button variant="ghost" fullWidth title={t('common.goBack')} onPress={handleBack} />
        </ScrollView>
      </View>
    );
  }

  // Bireysel hesap: işletme olmak için ayrı hesap açması gerektiğini anlat.
  return (
    <View style={styles.container}>
      <ScreenHeader title={t('seller.businessAccountTitle')} onBack={handleBack} />
      <ScrollView contentContainerStyle={styles.scrollBody}>
        <View style={styles.benefitsCard}>
          <Text style={styles.benefitsTitle}>{t('seller.businessSellerBenefits')}</Text>
          <View style={styles.benefitRow}>
            <Ionicons name="checkmark-circle" size={18} color={colors.success[600]!} />
            <Text style={styles.benefitText}>{t('seller.benefitUnlimitedListings')}</Text>
          </View>
          <View style={styles.benefitRow}>
            <Ionicons name="checkmark-circle" size={18} color={colors.success[600]!} />
            <Text style={styles.benefitText}>{t('seller.benefitSearchPriority')}</Text>
          </View>
          <View style={styles.benefitRow}>
            <Ionicons name="checkmark-circle" size={18} color={colors.success[600]!} />
            <Text style={styles.benefitText}>{t('seller.benefitInvoicingBulkUpload')}</Text>
          </View>
          <View style={styles.benefitRow}>
            <Ionicons name="checkmark-circle" size={18} color={colors.success[600]!} />
            <Text style={styles.benefitText}>{t('seller.benefitBadgeAndStats')}</Text>
          </View>
        </View>

        <View style={styles.noteCard}>
          <MaterialCommunityIcons name="information-outline" size={18} color={colors.info[600]!} />
          <Text style={styles.noteText}>{t('seller.businessAccountSeparateNote')}</Text>
        </View>

        <Button
          variant="primary"
          fullWidth
          title={t('seller.openBusinessAccount')}
          onPress={() => router.push('/(auth)/register-business')}
          style={styles.submitBtn}
        />

        <Button variant="ghost" fullWidth title={t('seller.cancel')} onPress={handleBack} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface.alt,
  },
  scrollBody: {
    padding: theme.spacing[4],
    gap: theme.spacing[3],
    paddingBottom: theme.spacing[10],
  },
  infoCard: {
    flexDirection: 'row',
    gap: theme.spacing[2],
    alignItems: 'flex-start',
    backgroundColor: colors.success[50]!,
    padding: theme.spacing[3],
    borderRadius: theme.radius['2xl'],
  },
  infoCardText: {
    flex: 1,
    fontSize: 13,
    color: colors.success[600]!,
  },
  benefitsCard: {
    backgroundColor: colors.primary[50]!,
    borderRadius: 12,
    padding: theme.spacing[3.5],
    gap: theme.spacing[2],
  },
  benefitsTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primary[600]!,
    marginBottom: theme.spacing[1],
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[2],
  },
  benefitText: {
    flex: 1,
    fontSize: 13,
    color: colors.text.heading,
  },
  noteCard: {
    flexDirection: 'row',
    gap: theme.spacing[2],
    alignItems: 'flex-start',
    backgroundColor: colors.info[50]!,
    padding: theme.spacing[3],
    borderRadius: theme.radius['2xl'],
  },
  noteText: {
    flex: 1,
    fontSize: 12,
    color: colors.info[600]!,
    lineHeight: 17,
  },
  submitBtn: {
    borderRadius: theme.radius['2xl'],
    marginTop: theme.spacing[2],
  },
});
