import { ImageManipulator, SaveFormat } from 'expo-image-manipulator'
import type { ImagePickerAsset } from 'expo-image-picker'
import { createVideoPlayer } from 'expo-video'
import { Platform } from 'react-native'
import { releaseRecipePhoto } from './foodPhoto'
import type { VideoFrame } from '@/types/recipe'

const maxEdge = 512
const maxEncodedFrameSize = 128 * 1024

function frameTimes(duration: number) {
  if (!Number.isFinite(duration) || duration <= 0) throw new Error('Missing video duration')
  return [0.72, 0.84, 0.94].map(fraction => duration * fraction)
}

async function nativeFrames(asset: ImagePickerAsset, signal: AbortSignal, frames: VideoFrame[]) {
  const player = createVideoPlayer(null)
  try {
    let finish: (duration: number) => void = () => {}
    const loaded = new Promise<number>(resolve => { finish = resolve })
    const onLoad = player.addListener('sourceLoad', ({ duration }) => finish(duration))
    const onStatus = player.addListener('statusChange', ({ status }) => {
      if (status === 'error') finish(0)
    })
    const abort = () => finish(0)
    signal.addEventListener('abort', abort, { once: true })
    try {
      await player.replaceAsync(asset.uri)
      if (signal.aborted) return
      const duration = player.duration || await loaded
      if (signal.aborted || duration > 180) return
      const times = frameTimes(duration)
      const thumbnails = await player.generateThumbnailsAsync(times, { maxWidth: maxEdge, maxHeight: maxEdge })
      try {
        for (const thumbnail of [...thumbnails].sort((a, b) => a.requestedTime - b.requestedTime)) {
          if (signal.aborted) return
          const context = ImageManipulator.manipulate(thumbnail)
          try {
            const image = await context.renderAsync()
            try {
              const { uri, base64 } = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.72, base64: true })
              if (base64 && base64.length <= maxEncodedFrameSize) frames.push({ uri, jpeg: base64, seconds: thumbnail.requestedTime })
              else releaseRecipePhoto(uri)
            } finally {
              image.release()
            }
          } finally {
            context.release()
          }
        }
      } finally {
        for (const thumbnail of thumbnails) thumbnail.release()
      }
    } finally {
      signal.removeEventListener('abort', abort)
      onLoad.remove()
      onStatus.remove()
    }
  } finally {
    player.release()
  }
}

function videoEvent(video: HTMLVideoElement, event: 'loadeddata' | 'seeked', signal: AbortSignal) {
  if (signal.aborted) return Promise.reject(new Error('Frame extraction stopped'))
  return new Promise<void>((resolve, reject) => {
    function finish(error?: unknown) {
      video.removeEventListener(event, onReady)
      video.removeEventListener('error', onError)
      signal.removeEventListener('abort', onAbort)
      if (error) reject(error)
      else resolve()
    }
    const onReady = () => finish()
    const onError = () => finish(new Error('Could not decode the video'))
    const onAbort = () => finish(new Error('Frame extraction stopped'))
    video.addEventListener(event, onReady, { once: true })
    video.addEventListener('error', onError, { once: true })
    signal.addEventListener('abort', onAbort, { once: true })
  })
}

async function webFrames(asset: ImagePickerAsset, signal: AbortSignal, frames: VideoFrame[]) {
  const video = document.createElement('video')
  video.muted = true
  video.preload = 'auto'
  const objectUrl = asset.file ? URL.createObjectURL(asset.file) : undefined
  try {
    const loaded = videoEvent(video, 'loadeddata', signal)
    video.src = objectUrl ?? asset.uri
    await loaded
    let duration = video.duration
    if (!Number.isFinite(duration)) {
      // Some recorder-produced WebM files omit duration from the container header.
      const seek = videoEvent(video, 'seeked', signal)
      video.currentTime = 181
      await seek
      duration = Number.isFinite(video.duration) ? video.duration : video.currentTime
    }
    if (duration > 180) return
    const canvas = document.createElement('canvas')
    const scale = Math.min(1, maxEdge / Math.max(video.videoWidth, video.videoHeight))
    canvas.width = Math.max(1, Math.round(video.videoWidth * scale))
    canvas.height = Math.max(1, Math.round(video.videoHeight * scale))
    const context = canvas.getContext('2d')
    if (!context) return
    for (const seconds of frameTimes(duration)) {
      if (signal.aborted) return
      const seek = videoEvent(video, 'seeked', signal)
      video.currentTime = seconds
      await seek
      context.drawImage(video, 0, 0, canvas.width, canvas.height)
      const uri = canvas.toDataURL('image/jpeg', 0.72)
      const jpeg = uri.slice(uri.indexOf(',') + 1)
      if (jpeg && jpeg.length <= maxEncodedFrameSize) frames.push({ uri, jpeg, seconds })
    }
  } finally {
    video.removeAttribute('src')
    video.load()
    if (objectUrl) URL.revokeObjectURL(objectUrl)
  }
}

export async function extractVideoFrames(asset: ImagePickerAsset, signal: AbortSignal) {
  const frames: VideoFrame[] = []
  const controller = new AbortController()
  const abort = () => controller.abort()
  if (signal.aborted) return frames
  signal.addEventListener('abort', abort, { once: true })
  const deadline = setTimeout(abort, 8000)
  try {
    await (Platform.OS === 'web' ? webFrames(asset, controller.signal, frames) : nativeFrames(asset, controller.signal, frames))
  } catch {
    // The draft can still use the transcript and any frames already recovered.
  } finally {
    clearTimeout(deadline)
    signal.removeEventListener('abort', abort)
  }
  if (!signal.aborted) return frames
  for (const frame of frames) releaseRecipePhoto(frame.uri)
  return []
}
