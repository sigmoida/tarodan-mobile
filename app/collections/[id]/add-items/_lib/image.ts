import * as ImagePicker from 'expo-image-picker';
import { fromPickerAsset, pickerQuality, type LocalImageFile } from '@/lib/media';

/**
 * A custom item's picture: picked from the library with no forced crop (web uploads the file as it
 * is). `null` when the user cancels. The file is prepared and uploaded on submit, not on pick, so a
 * cancelled form leaves no upload behind.
 */
export async function pickCollectionItemImage(): Promise<LocalImageFile | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: false,
    quality: pickerQuality(),
  });
  const asset = result.canceled ? undefined : result.assets?.[0];
  return asset ? fromPickerAsset(asset, 'collection-item.jpg') : null;
}
