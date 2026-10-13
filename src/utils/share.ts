import { Platform } from 'react-native';
import type { ShareContent, ShareOptions } from 'react-native';

import { ownWebPageUrl } from '@/lib/web';

export const productShareUrl = (id: string) => ownWebPageUrl(`/listings/${id}`);
export const collectionShareUrl = (id: string) => ownWebPageUrl(`/collections/${id}`);

// Link her iki platformda da message'a gömülür → "Kopyala" seçilince link düşmez.
// iOS'ta ayrıca ayrı `url` alanı kalır (zengin önizleme/şablon için).
export function buildShareContent(
  text: string,
  url: string,
  title?: string,
): { content: ShareContent; options: ShareOptions } {
  return Platform.OS === 'ios'
    ? { content: { message: `${text}\n${url}`, url, title }, options: { subject: title } }
    : { content: { message: `${text}\n${url}`, title }, options: { dialogTitle: title } };
}
