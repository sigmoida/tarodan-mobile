import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import type { RNFile } from '@/lib/api';

/**
 * Galeriden en fazla `remaining` kanıt fotoğrafı seçer. İzin yoksa `'denied'`
 * döner — çağıran (iade ekranı) mesajı satır içi gösterir.
 */
export async function pickEvidencePhotos(remaining: number): Promise<RNFile[] | 'denied'> {
  if (remaining <= 0) return [];
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return 'denied';
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsMultipleSelection: true,
    selectionLimit: remaining,
    quality: 0.8,
  });
  if (result.canceled || !result.assets?.length) return [];
  return result.assets.slice(0, remaining).map((a, i) => ({
    uri: Platform.OS === 'android' ? a.uri : a.uri.replace('file://', ''),
    name: a.fileName || `evidence_${i}.jpg`,
    type: a.mimeType || 'image/jpeg',
  }));
}
