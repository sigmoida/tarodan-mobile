export enum NotificationType {
  ORDER_CREATED = 'ORDER_CREATED',
  ORDER_PAID = 'ORDER_PAID',
  ORDER_SHIPPED = 'ORDER_SHIPPED',
  ORDER_DELIVERED = 'ORDER_DELIVERED',
  ORDER_COMPLETED = 'ORDER_COMPLETED',
  ORDER_CANCELLED = 'ORDER_CANCELLED',
  PAYMENT_RECEIVED = 'PAYMENT_RECEIVED',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  OFFER_RECEIVED = 'OFFER_RECEIVED',
  OFFER_ACCEPTED = 'OFFER_ACCEPTED',
  OFFER_REJECTED = 'OFFER_REJECTED',
  OFFER_COUNTERED = 'OFFER_COUNTERED',
  TRADE_PROPOSED = 'TRADE_PROPOSED',
  TRADE_ACCEPTED = 'TRADE_ACCEPTED',
  TRADE_REJECTED = 'TRADE_REJECTED',
  TRADE_COMPLETED = 'TRADE_COMPLETED',
  MESSAGE_RECEIVED = 'MESSAGE_RECEIVED',
  PRODUCT_APPROVED = 'PRODUCT_APPROVED',
  PRODUCT_REJECTED = 'PRODUCT_REJECTED',
  PRODUCT_SOLD = 'PRODUCT_SOLD',
  RATING_RECEIVED = 'RATING_RECEIVED',
  MEMBERSHIP_UPGRADED = 'MEMBERSHIP_UPGRADED',
  MEMBERSHIP_EXPIRING = 'MEMBERSHIP_EXPIRING',
  SYSTEM_ANNOUNCEMENT = 'SYSTEM_ANNOUNCEMENT',
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  isRead: boolean;
  readAt?: Date;
  createdAt: Date;
}

export interface NotificationPreferences {
  userId: string;
  emailNotifications: boolean;
  pushNotifications: boolean;
  orderUpdates: boolean;
  offerUpdates: boolean;
  tradeUpdates: boolean;
  messageNotifications: boolean;
  marketingEmails: boolean;
  priceDropAlerts: boolean;
}

export interface PushToken {
  id: string;
  userId: string;
  token: string;
  platform: 'ios' | 'android' | 'web';
  isActive: boolean;
  createdAt: Date;
}

export interface CreatePushTokenDto {
  token: string;
  platform: 'ios' | 'android' | 'web';
}
