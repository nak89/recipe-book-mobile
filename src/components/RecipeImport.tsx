import { useEffect, useRef, useState } from 'react'
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { Image } from 'expo-image'
import Field from '@/components/ui/Field'
import PrimaryButton from '@/components/ui/PrimaryButton'
import { Text } from '@/components/ui/Text'
import TextLink from '@/components/ui/TextLink'
import { useLanguage, useNum, useT } from '@/i18n'
import type { StringKey } from '@/i18n'
import { apiErrorKey } from '@/i18n/errors'
import { ApiError, importRecipeFromPhoto, importRecipeText, importRecipeVideo, MAX_IMPORT_VIDEO_BYTES } from '@/lib/api'
import { prepareRecipePhoto, releaseRecipePhoto } from '@/lib/foodPhoto'
import type { IncomingRecipeShare } from '@/lib/incomingRecipeShare'
import { socialRecipeSource } from '@/lib/socialRecipeSource'
import { extractVideoFrames } from '@/lib/videoFrames'
import { minHeights, radius, spacing, useThemedStyles } from '@/theme'
import type { ThemeColors, TypeScale } from '@/theme'
import type { DraftPhoto, RecipeDraft, VideoFrame } from '@/types/recipe'

const maxCharacters = 8000
const videoFormats = 'MP4 / WebM'

export default function RecipeImport({ token, initialShare, onDraft, onManual }: {
  token: string
  initialShare?: IncomingRecipeShare
  onDraft: (draft: RecipeDraft, photo: DraftPhoto | undefined, generatePhoto: boolean) => void
  onManual: () => void
}) {
  const [mode, setMode] = useState<'choose' | 'text' | 'video' | 'photo'>(initialShare ? 'video' : 'choose')
  const [source, setSource] = useState('')
  const [caption, setCaption] = useState(initialShare?.caption ?? '')
  const [video, setVideo] = useState(initialShare?.video)
  const [foodPhoto, setFoodPhoto] = useState<ImagePicker.ImagePickerAsset>()
  const [link, setLink] = useState(initialShare?.source ?? '')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<StringKey | undefined>(initialShare?.error)
  const inFlight = useRef<AbortController | null>(null)
  const styles = useThemedStyles(makeStyles)
  const { language } = useLanguage()
  const t = useT()
  const n = useNum()
  const importingVideo = mode === 'video'
  const importingPhoto = mode === 'photo'
  const text = importingVideo ? caption : source
  const hasVideo = importingVideo && !!video
  const sourceUrl = importingVideo && link.trim() ? socialRecipeSource(link) : ''
  const canExtract = importingPhoto
    ? !!foodPhoto
    : (!!text.trim() || hasVideo) && text.length <= maxCharacters && sourceUrl !== null

  useEffect(() => () => { inFlight.current?.abort() }, [])

  async function chooseVideo() {
    setError(undefined)
    try {
      const selected = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['videos'],
        preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Current,
      })
      if (selected.canceled) return
      const asset = selected.assets[0]
      // The web picker reads HTMLVideoElement.duration in seconds and WebM can report Infinity.
      const duration = (asset.duration ?? 0) / (Platform.OS === 'web' ? 1 : 1000)
      if ((asset.fileSize ?? 0) > MAX_IMPORT_VIDEO_BYTES || (Number.isFinite(duration) && duration > 180)) {
        setError('import.videoSize')
        return
      }
      setVideo(asset)
    } catch {
      setError('import.videoPickFailed')
    }
  }

  async function chooseFoodPhoto() {
    setError(undefined)
    try {
      const selected = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], exif: false })
      if (!selected.canceled) setFoodPhoto(selected.assets[0])
    } catch {
      setError('import.foodPhotoReadFailed')
    }
  }

  async function extract() {
    if (!canExtract || inFlight.current) return
    const controller = new AbortController()
    inFlight.current = controller
    setPending(true)
    setError(undefined)
    let preparedPhoto: string | undefined
    let frames: VideoFrame[] = []
    let photo: DraftPhoto | undefined
    try {
      let draft: RecipeDraft
      if (importingPhoto && foodPhoto) {
        preparedPhoto = await prepareRecipePhoto(foodPhoto)
        if (controller.signal.aborted) return
        draft = await importRecipeFromPhoto(preparedPhoto, language, token, controller.signal)
        photo = { status: 'ready', source: { kind: 'selected', uri: preparedPhoto } }
      } else if (importingVideo && video) {
        frames = await extractVideoFrames(video, controller.signal)
        if (controller.signal.aborted) return
        const { recommendedFrame, ...recipe } = await importRecipeVideo(video, text.trim(), frames, language, token, controller.signal)
        draft = recipe
        photo = { status: 'video', frames, recommendedFrame: recommendedFrame ?? null }
      } else {
        draft = await importRecipeText(text.trim(), language, token, controller.signal)
      }
      if (controller.signal.aborted) return
      if (sourceUrl) {
        draft.description = [draft.description, `${t('import.sourceCredit')} ${sourceUrl}`].filter(Boolean).join('\n\n')
      }
      onDraft(draft, photo, !importingVideo)
      // The editor now owns the cached photo and can upload it on Save.
      preparedPhoto = undefined
      frames = []
    } catch (err) {
      if (controller.signal.aborted) return
      if (err instanceof ApiError && err.status === 422) {
        setError(importingPhoto ? 'import.noFoodPhoto' : hasVideo ? 'import.noVideoRecipe' : 'import.noRecipe')
      } else if (err instanceof ApiError && err.status === 503) setError('import.unavailable')
      else if (err instanceof ApiError && err.status === 413 && hasVideo) setError('import.videoSize')
      else if (err instanceof ApiError && err.status === 413 && importingPhoto) setError('import.foodPhotoSize')
      else if (importingPhoto && (!preparedPhoto || (err instanceof ApiError && err.status === 415))) setError('import.foodPhotoReadFailed')
      else if (err instanceof ApiError && err.status === 415) setError('import.videoFormat')
      else setError(apiErrorKey(err))
    } finally {
      if (preparedPhoto) releaseRecipePhoto(preparedPhoto)
      for (const frame of frames) releaseRecipePhoto(frame.uri)
      inFlight.current = null
      if (!controller.signal.aborted) setPending(false)
    }
  }

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {mode !== 'choose' ? (
          <>
            {importingPhoto && (
              <>
                <Text style={styles.body}>{t('import.foodPhotoHelp')}</Text>
                {foodPhoto && <Image source={foodPhoto.uri} style={styles.foodPhoto} contentFit="cover" cachePolicy="none" />}
                <PrimaryButton
                  label={t(foodPhoto ? 'import.changeFoodPhoto' : 'import.chooseFoodPhoto')}
                  onPress={chooseFoodPhoto}
                  disabled={pending}
                  variant="outline"
                />
              </>
            )}
            {importingVideo && (
              <>
                <Text style={styles.body}>{t('import.videoHelp').replace('{formats}', videoFormats)}</Text>
                {initialShare && sourceUrl && !caption.trim() && !video && (
                  <Text style={styles.body}>{t('import.sharedLinkHelp')}</Text>
                )}
                <PrimaryButton
                  label={t(video ? 'import.changeVideo' : 'import.chooseVideo')}
                  onPress={chooseVideo}
                  disabled={pending}
                  variant="outline"
                />
                {video && (
                  <>
                    <Text style={styles.body}>{video.fileName || t('import.videoSelected')}</Text>
                    {!pending && <TextLink label={t('import.removeVideo')} onPress={() => {
                      setVideo(undefined)
                      setError(undefined)
                    }} />}
                  </>
                )}
                <Field
                  label={t('import.socialLink')}
                  accessibilityLabel={t('import.socialLink')}
                  value={link}
                  onChangeText={setLink}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                  editable={!pending}
                  maxLength={2048}
                  invalid={sourceUrl === null}
                  hint={sourceUrl === null ? t('import.invalidLink') : undefined}
                />
              </>
            )}
            {!importingPhoto && (
              <>
                <Field
                  label={t(importingVideo ? 'import.caption' : 'import.source')}
                  accessibilityLabel={t(importingVideo ? 'import.caption' : 'import.source')}
                  value={text}
                  onChangeText={value => {
                    if (importingVideo) setCaption(value)
                    else setSource(value)
                    setError(undefined)
                  }}
                  multiline
                  style={styles.source}
                  maxLength={maxCharacters + 1}
                  editable={!pending}
                  invalid={text.length > maxCharacters}
                />
                <Text style={styles.meta}>
                  {t('import.characterCount').replace('{count}', n(text.length)).replace('{max}', n(maxCharacters))}
                </Text>
                <Text style={styles.body}>{t(hasVideo ? 'import.videoDisclosure' : 'import.disclosure')}</Text>
              </>
            )}
            {error && <Text accessibilityRole="alert" style={styles.error}>{t(error).replace('{formats}', videoFormats)}</Text>}
            <PrimaryButton
              label={t(importingPhoto ? 'import.generateFromPhoto' : 'import.createDraft')}
              onPress={extract}
              loading={pending}
              disabled={!canExtract}
            />
            <PrimaryButton label={t('common.back')} variant="outline" disabled={pending} onPress={() => {
              setError(undefined)
              setMode('choose')
            }} />
          </>
        ) : (
          <>
            <PrimaryButton label={t('import.paste')} onPress={() => setMode('text')} />
            <PrimaryButton label={t('import.fromFoodPhoto')} variant="outline" onPress={() => setMode('photo')} />
            <PrimaryButton label={t('import.video')} variant="outline" onPress={() => setMode('video')} />
            <PrimaryButton label={t('import.manual')} variant="outline" onPress={onManual} />
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const makeStyles = (colors: ThemeColors, type: TypeScale) => StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: spacing.gutter, gap: spacing.lg },
  source: { minHeight: minHeights.field * 3, maxHeight: minHeights.field * 5 },
  foodPhoto: { width: '100%', aspectRatio: 4 / 3, borderRadius: radius.card, backgroundColor: colors.surfaceAlt },
  meta: { ...type.metadataSmall, color: colors.text, textAlign: 'right' },
  body: { ...type.body, color: colors.text },
  error: { ...type.body, color: colors.danger },
})
