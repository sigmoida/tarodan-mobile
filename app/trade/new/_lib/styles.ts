import { StyleSheet } from 'react-native';
import { theme } from '@/ui';

const { colors } = theme;

// Takas oluşturma sihirbazının route-local stylesheet'i. Adım kartları ortak `SectionCard`
// (beyaz) + `Stepper` + `TradePickCard`; burada yalnız kart içi düzen ve kapı ekranı stilleri.
export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface.alt,
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing[8],
  },
  subtitle: {
    textAlign: 'center',
    marginVertical: theme.spacing[4],
    color: colors.text.muted,
  },
  spinner: {
    marginVertical: theme.spacing[6],
  },
  chipsRow: {
    flexDirection: 'row',
    gap: theme.spacing[2],
  },
  chip: {
    flex: 1,
  },
  cashInput: {
    marginTop: theme.spacing[3],
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[3],
    paddingVertical: theme.spacing[2],
  },
  summaryImage: {
    width: 40,
    height: 40,
    borderRadius: theme.radiusRole.productCard,
    backgroundColor: colors.border.DEFAULT,
  },
  summaryItemTitle: {
    flex: 1,
  },
  price: {
    color: theme.priceColor.card,
  },
  summaryDivider: {
    marginVertical: theme.spacing[2],
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing[1],
  },
  premiumRequired: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing[8],
    backgroundColor: colors.surface.DEFAULT,
  },
  premiumTitle: {
    marginTop: theme.spacing[6],
    textAlign: 'center',
    color: colors.text.heading,
  },
  premiumSubtitle: {
    marginTop: theme.spacing[2],
    textAlign: 'center',
    color: colors.text.muted,
  },
  premiumFeatures: {
    marginTop: theme.spacing[6],
    alignSelf: 'flex-start',
    width: '100%',
  },
  premiumFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: theme.spacing[2],
  },
  premiumFeatureText: {
    marginLeft: theme.spacing[3],
    color: colors.text.heading,
  },
  upgradeButton: {
    marginTop: theme.spacing[6],
    width: '100%',
  },
});
