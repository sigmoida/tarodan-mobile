import React from 'react';
import { Pressable, type StyleProp, type TextStyle } from 'react-native';
import { router } from 'expo-router';
import { Text } from '@/ui';
import { reviewAuthorId } from '@/utils/reviewAuthor';

/**
 * Yorumcunun adı — yazarın profiline bağlar. Yorumlar UGC (Apple 1.2): şikayet
 * ve engelleme profildeki ⋮ menüsünde, yorumdan oraya ulaşılabilmeli.
 * Yazar kimliği yoksa düz metin.
 */
export function ReviewAuthorName({
  review,
  name,
  style,
}: {
  review: Record<string, unknown> | null | undefined;
  name: string;
  style?: StyleProp<TextStyle>;
}) {
  const authorId = reviewAuthorId(review);
  if (!authorId) return <Text style={style}>{name}</Text>;
  return (
    <Pressable
      testID="review-author-link"
      accessibilityRole="link"
      onPress={() => router.push(`/seller/${authorId}`)}
      hitSlop={6}
    >
      <Text style={style}>{name}</Text>
    </Pressable>
  );
}
