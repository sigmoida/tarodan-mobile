import { Platform } from 'react-native';
import type { ShareContent, ShareOptions } from 'react-native';

import { ownWebPageUrl } from '@/lib/web';
import { listingPath } from '@/types';

/**
 * Canonical listing link `https://<web origin>/listings/<slug>-<uuid>` (ADR 0017): the same builder
 * as web, so a shared link opens without the web's redirect hop. Without a title it is the bare uuid.
 */
export const productShareUrl = (listing: { id: string; title?: string | null }) =>
  ownWebPageUrl(listingPath(listing));
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
