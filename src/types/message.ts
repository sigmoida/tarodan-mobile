export interface Conversation {
  id: string;
  participant1Id: string;
  participant2Id: string;
  lastMessageAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConversationWithDetails extends Conversation {
  participant1: {
    id: string;
    displayName: string;
    avatarUrl?: string;
  };
  participant2: {
    id: string;
    displayName: string;
    avatarUrl?: string;
  };
  lastMessage?: Message;
  unreadCount: number;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  isRead: boolean;
  readAt?: Date;
  attachments?: MessageAttachment[];
  createdAt: Date;
}

export interface MessageWithSender extends Message {
  sender: {
    id: string;
    displayName: string;
    avatarUrl?: string;
  };
}

export interface MessageAttachment {
  id: string;
  messageId: string;
  type: 'image' | 'file';
  url: string;
  name: string;
  size: number;
}

export interface SendMessageDto {
  conversationId?: string;
  recipientId?: string;
  content: string;
  attachmentUrls?: string[];
}

export interface CreateConversationDto {
  recipientId: string;
  initialMessage?: string;
}
