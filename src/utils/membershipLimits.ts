/**
 * Membership Limits Utility
 * Provides helper functions for checking user membership limits and permissions
 */

import type { TFunction } from 'i18next';
import { theme } from '@/ui';
import { useAuthStore, MembershipTier, MembershipLimits } from '../stores/authStore';

const { colors } = theme;

// Free member specific limits
export const FREE_MEMBER_LIMITS = {
  maxListings: 10,
  maxImagesPerListing: 5,
  maxAddresses: 10,
  maxSavedSearches: 5,
  maxMessagesPerDay: 50,
  listingExpireDays: 60,
  maxReviewChars: 500,
  maxValuePerListing: 5000, // TRY - increases to 5000 when verified
  canTrade: false,
  canCreateCollections: false,
  canFeatureListings: false,
  canBulkUpload: false,
  canScheduleListings: false,
  priorityInSearch: false,
  isAdFree: false,
};

// Premium member limits
export const PREMIUM_MEMBER_LIMITS = {
  maxListings: -1, // Unlimited
  maxImagesPerListing: 15,
  maxAddresses: 10,
  maxSavedSearches: -1, // Unlimited
  maxMessagesPerDay: -1, // Unlimited
  listingExpireDays: -1, // Never expire
  maxReviewChars: 2000,
  maxValuePerListing: 50000, // TRY for verified premium
  canTrade: true,
  canCreateCollections: true,
  canFeatureListings: true,
  canBulkUpload: true,
  canScheduleListings: true,
  priorityInSearch: true,
  isAdFree: true,
};

// Feature check types
export type FeatureCheck = 
  | 'createListing'
  | 'trade'
  | 'createCollection'
  | 'featureListing'
  | 'bulkUpload'
  | 'scheduleListing'
  | 'saveFavorites'
  | 'messageUsers'
  | 'rateProducts'
  | 'rateSellers'
  | 'writeReviews'
  | 'followSellers'
  | 'reportContent'
  | 'blockUsers'
  | 'viewAnalytics'
  | 'saveSearch';

// Upgrade prompt types
export type UpgradePromptType =
  | 'listingLimit'
  | 'tradeFeature'
  | 'collectionFeature'
  | 'featureListing'
  | 'messageLimit'
  | 'addressLimit'
  | 'savedSearchLimit'
  | 'imageLimit'
  | 'valueLimit';

// Check if user can perform a specific action
export const canPerformAction = (action: FeatureCheck): boolean => {
  const { user, limits, isAuthenticated } = useAuthStore.getState();
  
  if (!isAuthenticated || !user) {
    // Guest restrictions - most actions not allowed
    const guestAllowed: FeatureCheck[] = [];
    return guestAllowed.includes(action);
  }
  
  // Free member - all basic actions allowed
  switch (action) {
    case 'createListing':
      return limits ? (limits.maxListings === -1 || user.listingCount < limits.maxListings) : false;
    
    case 'trade':
      return limits?.canTrade || false;
    
    case 'createCollection':
      return limits?.canCreateCollections || false;
    
    case 'featureListing':
      return limits?.canFeatureListings || false;
    
    case 'bulkUpload':
      return limits?.canBulkUpload || false;
    
    case 'scheduleListing':
      return limits?.canScheduleListings || false;
    
    // These are allowed for all authenticated users
    case 'saveFavorites':
    case 'messageUsers':
    case 'rateProducts':
    case 'rateSellers':
    case 'writeReviews':
    case 'followSellers':
    case 'reportContent':
    case 'blockUsers':
    case 'viewAnalytics':
    case 'saveSearch':
      return true;
    
    default:
      return false;
  }
};

// Get the appropriate upgrade prompt for a blocked action
export const getUpgradePrompt = (action: FeatureCheck): UpgradePromptType | null => {
  const { limits } = useAuthStore.getState();
  
  if (!limits) return null;
  
  switch (action) {
    case 'createListing':
      return 'listingLimit';
    case 'trade':
      return 'tradeFeature';
    case 'createCollection':
      return 'collectionFeature';
    case 'featureListing':
      return 'featureListing';
    default:
      return null;
  }
};

// Get upgrade message based on prompt type. `t` MUST come from a live
// useTranslation()/schemaT call at the call site — this module is shared and
// cannot resolve its own translator (see CLAUDE.md §8, membershipLimits is
// state/logic, not a component/hook).
export const getUpgradeMessage = (t: TFunction, promptType: UpgradePromptType): { title: string; message: string } => {
  switch (promptType) {
    case 'listingLimit':
      return {
        title: t('upgradePrompt.listingLimitTitle'),
        message: t('upgradePrompt.listingLimitMessage'),
      };
    case 'tradeFeature':
      return {
        title: t('trade.featureTitle'),
        message: t('upgradePrompt.tradeFeatureMessage'),
      };
    case 'collectionFeature':
      return {
        title: t('membership.featureDigitalGarage'),
        message: t('upgradePrompt.collectionFeatureMessage'),
      };
    case 'featureListing':
      return {
        title: t('upgradePrompt.featureListingTitle'),
        message: t('upgradePrompt.featureListingMessage'),
      };
    case 'messageLimit':
      return {
        title: t('upgradePrompt.messageLimitTitle'),
        message: t('upgradePrompt.messageLimitMessage'),
      };
    case 'addressLimit':
      return {
        title: t('address.limitTitle'),
        message: t('address.limitBody', { max: FREE_MEMBER_LIMITS.maxAddresses }),
      };
    case 'savedSearchLimit':
      return {
        title: t('membership.savedSearchLimitTitle'),
        message: t('membership.savedSearchLimitMessage'),
      };
    case 'imageLimit':
      return {
        title: t('upgradePrompt.imageLimitTitle'),
        message: t('upgradePrompt.imageLimitMessage'),
      };
    case 'valueLimit':
      return {
        title: t('membership.valueLimitTitle'),
        message: t('membership.valueLimitMessage'),
      };
    default:
      return {
        title: t('membership.premiumFeatureTitle'),
        message: t('membership.premiumFeatureMessage'),
      };
  }
};

// Check verification criteria for free members
export interface VerificationCriteria {
  emailVerified: boolean;
  phoneVerified: boolean;
  hasTransaction: boolean;
  accountAgeOk: boolean;
  noDisputes: boolean;
  profileComplete: boolean;
  allMet: boolean;
}

export const getVerificationCriteria = (): VerificationCriteria => {
  const { user } = useAuthStore.getState();
  
  if (!user) {
    return {
      emailVerified: false,
      phoneVerified: false,
      hasTransaction: false,
      accountAgeOk: false,
      noDisputes: false,
      profileComplete: false,
      allMet: false,
    };
  }
  
  const emailVerified = user.isEmailVerified;
  const phoneVerified = user.isPhoneVerified;
  const hasTransaction = user.totalSales > 0 || user.totalPurchases > 0;
  const accountAgeOk = user.accountAge >= 30;
  const noDisputes = user.disputeCount === 0;
  const profileComplete = user.profileCompletion >= 80;
  
  return {
    emailVerified,
    phoneVerified,
    hasTransaction,
    accountAgeOk,
    noDisputes,
    profileComplete,
    allMet: emailVerified && phoneVerified && hasTransaction && accountAgeOk && noDisputes && profileComplete,
  };
};

// Get tier display info. `t` from a live useTranslation()/schemaT (see note above).
export const getTierDisplayInfo = (t: TFunction, tier: MembershipTier): { name: string; color: string; icon: string } => {
  switch (tier) {
    case 'free':
      return { name: t('membership.memberLabelFree'), color: colors.gray[500], icon: 'account' };
    case 'basic':
      return { name: t('membership.memberLabelBasic'), color: colors.info[600]!, icon: 'account-check' };
    case 'premium':
      return { name: t('membership.memberLabelPremium'), color: colors.primary[500], icon: 'crown' };
    case 'business':
      return { name: t('footer.corporate'), color: colors.primary[700], icon: 'domain' };
    default:
      return { name: t('membership.memberLabelDefault'), color: colors.gray[500], icon: 'account' };
  }
};

// Format limit value for display. `t` from a live useTranslation()/schemaT.
export const formatLimit = (t: TFunction, value: number): string => {
  if (value === -1) return t('membership.unlimited');
  return value.toString();
};

// Check if user should see upgrade prompt after certain actions
export const shouldShowUpgradePrompt = (
  triggerType: 'listingLimitReached' | 'after5Sales' | 'tryCreateCollection' | 'messageLimitReached'
): boolean => {
  const { user, limits } = useAuthStore.getState();
  
  if (!user || !limits) return false;
  
  switch (triggerType) {
    case 'listingLimitReached':
      return limits.maxListings !== -1 && user.listingCount >= limits.maxListings;
    
    case 'after5Sales':
      return user.totalSales >= 5 && !limits.canTrade;
    
    case 'tryCreateCollection':
      return !limits.canCreateCollections;
    
    case 'messageLimitReached':
      // This would need daily message count tracking
      return false;
    
    default:
      return false;
  }
};

// Get remaining count for a limit
export const getRemainingCount = (
  limitType: 'listings' | 'addresses' | 'savedSearches' | 'images'
): number => {
  const { user, limits } = useAuthStore.getState();
  
  if (!user || !limits) return 0;
  
  switch (limitType) {
    case 'listings':
      if (limits.maxListings === -1) return -1;
      return Math.max(0, limits.maxListings - user.listingCount);
    
    case 'addresses':
      // Would need address count from API
      return limits.maxAddresses;
    
    case 'savedSearches':
      // Would need saved search count from API
      return limits.maxSavedSearches;
    
    case 'images':
      return limits.maxImagesPerListing;
    
    default:
      return 0;
  }
};

export default {
  canPerformAction,
  getUpgradePrompt,
  getUpgradeMessage,
  getVerificationCriteria,
  getTierDisplayInfo,
  formatLimit,
  shouldShowUpgradePrompt,
  getRemainingCount,
  FREE_MEMBER_LIMITS,
  PREMIUM_MEMBER_LIMITS,
};
