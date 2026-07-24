export enum TicketStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  WAITING_CUSTOMER = 'WAITING_CUSTOMER',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
}

export enum TicketPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export enum TicketCategory {
  ORDER_ISSUE = 'ORDER_ISSUE',
  PAYMENT_ISSUE = 'PAYMENT_ISSUE',
  SHIPPING_ISSUE = 'SHIPPING_ISSUE',
  PRODUCT_ISSUE = 'PRODUCT_ISSUE',
  ACCOUNT_ISSUE = 'ACCOUNT_ISSUE',
  TRADE_DISPUTE = 'TRADE_DISPUTE',
  REFUND_REQUEST = 'REFUND_REQUEST',
  TECHNICAL_ISSUE = 'TECHNICAL_ISSUE',
  OTHER = 'OTHER',
}

export interface SupportTicket {
  id: string;
  ticketNumber: string;
  userId: string;
  category: TicketCategory;
  subject: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  assignedTo?: string;
  orderId?: string;
  productId?: string;
  attachments?: string[];
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface TicketMessage {
  id: string;
  ticketId: string;
  senderId: string;
  senderRole: 'user' | 'admin';
  message: string;
  attachments?: string[];
  createdAt: Date;
}

export interface TicketWithMessages extends SupportTicket {
  user: {
    id: string;
    displayName: string;
    email: string;
  };
  assignee?: {
    id: string;
    displayName: string;
  };
  messages: TicketMessage[];
}

export interface CreateTicketDto {
  category: TicketCategory;
  subject: string;
  description: string;
  orderId?: string;
  productId?: string;
  attachments?: string[];
}

export interface ReplyToTicketDto {
  message: string;
  attachments?: string[];
}

export interface UpdateTicketStatusDto {
  status: TicketStatus;
  priority?: TicketPriority;
  assignedTo?: string;
}
