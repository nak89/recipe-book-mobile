import Constants from 'expo-constants'
import { isRunningInExpoGo } from 'expo'
import { File, Paths } from 'expo-file-system'
import type { ImagePickerAsset } from 'expo-image-picker'
import { clearSharedPayloads, getSharedPayloads } from 'expo-sharing'
import { Platform } from 'react-native'
import { MAX_IMPORT_VIDEO_BYTES } from './api'
import { releaseRecipePhoto } from './foodPhoto'
import { splitSharedRecipeText } from './socialRecipeSource'

export const recipeShareEnabled = Platform.OS !== 'web' && !isRunningInExpoGo() &&
  Constants.expoConfig?.extra?.recipeBookDevShare === true

let nextId = 0
let pendingShare: string | undefined

export function noteIncomingRecipeShare() {
  pendingShare = String(++nextId)
  return pendingShare
}

export function pendingRecipeShareDestination() {
  if (!pendingShare) return
  return { pathname: '/recipe/new', params: { incomingShare: pendingShare } } as const
}

export interface IncomingRecipeShare {
  source: string
  caption: string
  video?: ImagePickerAsset
  error?: 'import.videoSize' | 'import.videoFormat' | 'import.sharedContentUnavailable'
}

export async function readIncomingRecipeShare(id: string): Promise<IncomingRecipeShare> {
  const result: IncomingRecipeShare = { source: '', caption: '' }
  if (!recipeShareEnabled || pendingShare !== id) return { ...result, error: 'import.sharedContentUnavailable' }

  let localCopy: File | undefined
  try {
    // Read raw payloads so external links are never resolved or downloaded automatically.
    const payloads = getSharedPayloads()
    for (const payload of payloads) {
      if (payload.shareType !== 'text' && payload.shareType !== 'url') continue
      const { source, caption } = splitSharedRecipeText(payload.value)
      result.source ||= source
      if (payload.shareType === 'text') result.caption ||= caption
    }

    const attachment = payloads.find(payload =>
      (payload.shareType === 'video' || payload.mimeType?.startsWith('video/')) &&
      (Platform.OS === 'ios'
        ? payload.value.startsWith('file:///') && payload.value.includes('/Library/Caches/expo-sharing/')
        : payload.value.startsWith('content://')),
    )
    if (attachment) {
      const file = new File(attachment.value)
      const size = file.size
      if (size > MAX_IMPORT_VIDEO_BYTES) {
        result.error = 'import.videoSize'
      } else if (size <= 0) {
        result.error = 'import.sharedContentUnavailable'
      } else {
        const webm = attachment.mimeType === 'video/webm' || /\.webm$/i.test(file.name)
        const mp4 = attachment.mimeType === 'video/mp4' || /\.mp4$/i.test(file.name)
        if (!webm && !mp4) return { ...result, error: 'import.videoFormat' }
        const fileName = webm ? 'shared-video.webm' : 'shared-video.mp4'
        localCopy = new File(Paths.cache, `recipe-share-${Date.now()}-${id}-${fileName}`)
        await file.copy(localCopy)
        if (localCopy.size > MAX_IMPORT_VIDEO_BYTES) {
          releaseRecipePhoto(localCopy.uri)
          return { ...result, error: 'import.videoSize' }
        }
        result.video = {
          uri: localCopy.uri, fileName, fileSize: localCopy.size, type: 'video',
          mimeType: webm ? 'video/webm' : 'video/mp4', width: 0, height: 0,
        }
      }
    }
    if (!result.video && !result.source && !result.caption) result.error ??= 'import.sharedContentUnavailable'
  } catch {
    if (localCopy) releaseRecipePhoto(localCopy.uri)
    result.error = 'import.sharedContentUnavailable'
  } finally {
    if (pendingShare === id) {
      pendingShare = undefined
      try { clearSharedPayloads() } catch { /* The native cache can expire independently. */ }
    }
  }
  return result
}
