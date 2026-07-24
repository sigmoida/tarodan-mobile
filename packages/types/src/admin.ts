export interface DashboardStats {
  totalUsers: number;
  totalProducts: number;
  totalOrders: number;
  totalTrades: number;
  totalRevenue: number;
  totalCommission: number;
  newUsersToday: number;
  newOrdersToday: number;
  pendingApprovals: number;
  activeDisputes: number;
}

export interface SalesReport {
  period: string;
  totalSales: number;
  totalOrders: number;
  averageOrderValue: number;
  topCategories: {
    categoryId: string;
    categoryName: string;
    salesCount: number;
    revenue: number;
  }[];
  topSellers: {
    sellerId: string;
    sellerName: string;
    salesCount: number;
    revenue: number;
  }[];
}

export interface UserReport {
  period: string;
  totalUsers: number;
  newUsers: number;
  activeUsers: number;
  sellerConversions: number;
  membershipDistribution: {
    tier: string;
    count: number;
  }[];
}

export interface CommissionRule {
  id: string;
  name: string;
  description?: string;
  categoryId?: string;
  membershipTier?: string;
  percentage: number;
  minAmount?: number;
  maxAmount?: number;
  isActive: boolean;
  priority: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCommissionRuleDto {
  name: string;
  description?: string;
  categoryId?: string;
  membershipTier?: string;
  percentage: number;
  minAmount?: number;
  maxAmount?: number;
  priority?: number;
}

export interface SystemSettings {
  siteName: string;
  siteDescription: string;
  maintenanceMode: boolean;
  allowGuestCheckout: boolean;
  defaultCommissionRate: number;
  minWithdrawalAmount: number;
  maxUploadSize: number;
  supportedPaymentMethods: string[];
  supportedCarriers: string[];
  emailSettings: {
    fromName: string;
    fromEmail: string;
    smtpHost: string;
    smtpPort: number;
  };
}

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  entity: string;
  entityId: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  ipAddress: string;
  userAgent: string;
  createdAt: Date;
}

export interface ModerationItem {
  id: string;
  type: 'product' | 'message' | 'rating' | 'user';
  entityId: string;
  reason: string;
  reportedBy?: string;
  status: 'pending' | 'approved' | 'rejected';
  notes?: string;
  createdAt: Date;
}
