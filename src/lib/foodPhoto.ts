import { File } from 'expo-file-system'
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator'
import { Platform } from 'react-native'
import type { ImagePickerAsset } from 'expo-image-picker'

export async function prepareRecipePhoto(asset: ImagePickerAsset, maxEdge = 768) {
  const context = ImageManipulator.manipulate(asset.uri)
  try {
    if (Math.max(asset.width, asset.height) > maxEdge) {
      context.resize(asset.width >= asset.height ? { width: maxEdge } : { height: maxEdge })
    }
    const rendered = await context.renderAsync()
    try {
      const photo = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 0.8 })
      return photo.uri
    } finally {
      rendered.release()
    }
  } finally {
    context.release()
  }
}

export function releaseRecipePhoto(uri: string) {
  if (Platform.OS === 'web') {
    if (uri.startsWith('blob:')) URL.revokeObjectURL(uri)
    return
  }
  try {
    const file = new File(uri)
    if (file.exists) file.delete()
  } catch {
    // The operating system can reclaim the cache file if cleanup fails.
  }
}
