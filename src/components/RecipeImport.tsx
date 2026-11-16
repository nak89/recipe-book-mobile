import { useCallback, useEffect, useRef, useState } from 'react'
import type { ComponentProps } from 'react'
import { useFocusEffect } from 'expo-router'
import * as Clipboard from 'expo-clipboard'
import { Ionicons } from '@expo/vector-icons'
import { BackHandler, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { Image } from 'expo-image'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { RecipeAuthoringHeading, RecipeAuthoringNav } from '@/components/RecipeAuthoring'
import Chip from '@/components/ui/Chip'
import Field from '@/components/ui/Field'
import { finishGeneration, GenerationLoading, GenerationRecovery, useGenerationDelay } from '@/components/ui/GenerationFeedback'
import PrimaryButton from '@/components/ui/PrimaryButton'
import { Text } from '@/components/ui/Text'
import TextLink from '@/components/ui/TextLink'
import { en, km, useLanguage, useNum, useT } from '@/i18n'
import type { Language, StringKey } from '@/i18n'
import { apiErrorKey } from '@/i18n/errors'
import { ApiError, importRecipeFromPhoto, importRecipeText, importRecipeVideo, MAX_IMPORT_VIDEO_BYTES } from '@/lib/api'
import { prepareRecipePhoto, releaseRecipePhoto } from '@/lib/foodPhoto'
import { formatRecipeImportReset, recipeGenerationIssue, recipeImportLimit, type RecipeGenerationIssue } from '@/lib/generation'
import type { IncomingRecipeShare } from '@/lib/incomingRecipeShare'
import { isTikTokVideoSource, socialRecipeSource } from '@/lib/socialRecipeSource'
import { extractVideoFrames } from '@/lib/videoFrames'
import { duration, radius, recipeAuthoring, sizes, spacing, useTheme, useThemedStyles } from '@/theme'
import type { ThemeColors, TypeScale } from '@/theme'
import type { DraftPhoto, RecipeDraft, VideoFrame } from '@/types/recipe'

const maxCharacters = 8000
const videoFormats = 'MP4 / WebM'
const recipeLanguages = ['en', 'km'] as const
const recipeStrings = { en, km }

const recoveryCopy = {
  text: ['generation.noRecipe', 'generation.noRecipeDetail'],
  video: ['generation.videoUnreadable', 'generation.videoDetail'],
  videoSize: ['generation.videoUnreadable', 'import.videoSize'],
  videoFormat: ['generation.videoUnreadable', 'import.videoFormat'],
  caption: ['generation.unreadableCaption', 'import.tiktokCaptionUnavailable'],
  photo: ['generation.photoUnreadable', 'import.noFoodPhoto'],
  photoSize: ['generation.photoUnreadable', 'import.foodPhotoSize'],
  photoRead: ['generation.photoUnreadable', 'import.foodPhotoReadFailed'],
  timeout: ['generation.timeout', 'generation.timeoutDetail'],
  failed: ['generation.failed', 'generation.failedDetail'],
  input: ['generation.failed', 'error.api.invalid'],
  restricted: ['generation.failed', 'error.generic'],
  unavailable: ['generation.failed', 'import.unavailable'],
} as const satisfies Record<RecipeGenerationIssue, readonly [StringKey, StringKey]>

export default function RecipeImport({ token, initialShare, onDraft, onManual, onCancel, onModeChange }: {
  token: string
  initialShare?: IncomingRecipeShare
  onDraft: (draft: RecipeDraft, photo: DraftPhoto | undefined, generatePhoto: boolean) => void
  onManual: () => void
  onCancel: () => void
  onModeChange: (choosing: boolean) => void
}) {
  const [mode, setMode] = useState<'choose' | 'text' | 'video' | 'photo'>(initialShare ? 'video' : 'choose')
  const [source, setSource] = useState('')
  const [caption, setCaption] = useState(initialShare?.caption ?? '')
  const [video, setVideo] = useState(initialShare?.video)
  const [foodPhoto, setFoodPhoto] = useState<ImagePicker.ImagePickerAsset>()
  const [link, setLink] = useState(initialShare?.source ?? '')
  const [recipeLanguage, setRecipeLanguage] = useState<Language>()
  const [captionOnly, setCaptionOnly] = useState(false)
  const [focusSource, setFocusSource] = useState(false)
  const [load, setLoad] = useState<{ startedAt: number; phase?: StringKey; complete?: boolean }>()
  const [failure, setFailure] = useState<{
    issue: RecipeGenerationIssue
    detail?: StringKey
    limit?: ReturnType<typeof recipeImportLimit>
  }>()
  const pending = !!load
  const showLoading = useGenerationDelay(load?.startedAt ?? null)
  const [error, setError] = useState<StringKey | undefined>(initialShare?.error)
  const insets = useSafeAreaInsets()
  const { colors: c } = useTheme()
  const inFlight = useRef<AbortController | null>(null)
  const styles = useThemedStyles(makeStyles)
  const t = useT()
  const { language } = useLanguage()
  const n = useNum()
  const importingVideo = mode === 'video'
  const importingPhoto = mode === 'photo'
  const text = importingVideo ? caption : source
  const selectedVideo = importingVideo && !captionOnly ? video : undefined
  const hasVideo = !!selectedVideo
  const sourceUrl = importingVideo && link.trim() ? socialRecipeSource(link) : ''
  const tiktokUrl = !captionOnly && sourceUrl && isTikTokVideoSource(sourceUrl) ? sourceUrl : undefined
  const hasValidSource = importingPhoto
    ? !!foodPhoto
    : (!!text.trim() || hasVideo || !!tiktokUrl) && text.length <= maxCharacters && sourceUrl !== null

  useEffect(() => () => {
    const request = inFlight.current
    inFlight.current = null
    request?.abort()
  }, [])

  function openMode(next: typeof mode) {
    Keyboard.dismiss()
    setError(undefined)
    setRecipeLanguage(undefined)
    setFocusSource(false)
    setFailure(undefined)
    setMode(next)
    onModeChange(next === 'choose')
  }

  const cancelGeneration = useCallback(() => {
    const request = inFlight.current
    inFlight.current = null
    request?.abort()
    setLoad(undefined)
  }, [])

  useFocusEffect(useCallback(() => {
    if (Platform.OS !== 'android' || mode === 'choose') return
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (inFlight.current) {
        cancelGeneration()
      } else if (failure) {
        setFailure(undefined)
      } else {
        Keyboard.dismiss()
        setError(undefined)
        setRecipeLanguage(undefined)
        setMode('choose')
        onModeChange(true)
      }
      return true
    })
    return () => subscription.remove()
  }, [mode, failure, onModeChange, cancelGeneration]))

  async function pasteRecipe() {
    try {
      const value = await Clipboard.getStringAsync()
      if (!value.trim()) {
        setError('import.pasteEmpty')
        return
      }
      setError(undefined)
      setSource(value.slice(0, maxCharacters + 1))
    } catch {
      setError('import.pasteFailed')
    }
  }

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
      setCaptionOnly(false)
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
    if (!recipeLanguage || !hasValidSource || inFlight.current) return
    Keyboard.dismiss()
    const controller = new AbortController()
    inFlight.current = controller
    const startedAt = performance.now()
    const sourceKind = importingPhoto ? 'photo' : selectedVideo ? 'video' : 'text'
    const phase = sourceKind === 'video' ? 'generation.videoFrames' : sourceKind === 'photo' ? 'generation.photoPrepare' : undefined
    setLoad({ startedAt, phase })
    setError(undefined)
    setFailure(undefined)
    setFocusSource(false)
    let preparingMedia = !!phase
    let preparedPhoto: string | undefined
    let frames: VideoFrame[] = []
    let photo: DraftPhoto | undefined
    try {
      let draft: RecipeDraft
      if (importingPhoto && foodPhoto) {
        preparedPhoto = await prepareRecipePhoto(foodPhoto)
        if (controller.signal.aborted) return
        preparingMedia = false
        setLoad({ startedAt })
        draft = await importRecipeFromPhoto(preparedPhoto, recipeLanguage, token, controller.signal)
        photo = { status: 'ready', source: { kind: 'selected', uri: preparedPhoto } }
      } else if (selectedVideo) {
        frames = await extractVideoFrames(selectedVideo, controller.signal)
        if (controller.signal.aborted) return
        preparingMedia = false
        setLoad({ startedAt })
        const { recommendedFrame, ...recipe } = await importRecipeVideo(selectedVideo, text.trim(), frames, recipeLanguage, token, controller.signal, tiktokUrl)
        draft = recipe
        photo = { status: 'video', frames, recommendedFrame: recommendedFrame ?? null }
      } else {
        draft = await importRecipeText(text.trim(), recipeLanguage, token, controller.signal, tiktokUrl)
      }
      if (controller.signal.aborted) return
      if (sourceUrl) {
        const credit = recipeStrings[recipeLanguage]['import.sourceCredit']
        draft.description = [draft.description, `${credit} ${sourceUrl}`].filter(Boolean).join('\n\n')
      }
      if (performance.now() - startedAt >= duration.generationDelay) {
        await finishGeneration(controller.signal, () => setLoad({ startedAt, complete: true }))
      }
      if (controller.signal.aborted) return
      onDraft(draft, photo, !importingVideo)
      // The editor now owns the cached photo and can upload it on Save.
      preparedPhoto = undefined
      frames = []
    } catch (err) {
      if (controller.signal.aborted) return
      const apiError = err instanceof ApiError ? err : undefined
      setFailure({
        issue: recipeGenerationIssue(sourceKind, apiError?.status, preparingMedia),
        detail: apiErrorKey(err),
        limit: apiError && recipeImportLimit(apiError),
      })
    } finally {
      if (preparedPhoto) releaseRecipePhoto(preparedPhoto)
      for (const frame of frames) releaseRecipePhoto(frame.uri)
      // A canceled request can finish after its replacement has started.
      if (inFlight.current === controller) {
        inFlight.current = null
        setLoad(undefined)
      }
    }
  }

  function editSource(onlyCaption = false) {
    if (onlyCaption) setCaptionOnly(true)
    setFocusSource(true)
    setFailure(undefined)
  }

  if (failure) {
    const back = { label: 'generation.backToInput', onPress: () => setFailure(undefined) } as const
    const manual = { label: 'import.manual', onPress: onManual } as const
    if (failure.limit) {
      const { scope } = failure.limit
      const reset = formatRecipeImportReset('retryAt' in failure.limit ? failure.limit.retryAt : undefined, language)
      const detail = reset
        ? t(scope === 'user' ? 'generation.importUserReset' : 'generation.importSharedReset').replace('{reset}', reset)
        : t('generation.importLimitDetail')
      return (
        <GenerationRecovery
          title="generation.importLimit"
          detail={detail}
          video={importingVideo}
          primary={back}
          secondary={manual}
          bottomInset={insets.bottom}
        />
      )
    }
    const captionAction = { label: 'generation.useCaption', onPress: () => editSource(true) } as const
    const videoAction = {
      label: 'generation.chooseVideo',
      onPress: () => { setFailure(undefined); void chooseVideo() },
    } as const
    const photoAction = {
      label: 'generation.choosePhoto',
      onPress: () => { setFailure(undefined); void chooseFoodPhoto() },
    } as const
    const retry = { label: 'common.retry', onPress: () => { void extract() } } as const
    const actions = {
      text: {
        primary: { label: 'generation.editText', onPress: () => editSource() },
        secondary: manual,
      },
      video: { primary: videoAction, secondary: captionAction },
      videoSize: { primary: videoAction, secondary: captionAction },
      videoFormat: { primary: videoAction, secondary: captionAction },
      caption: { primary: captionAction, secondary: videoAction },
      photo: { primary: photoAction, secondary: back },
      photoSize: { primary: photoAction, secondary: back },
      photoRead: { primary: photoAction, secondary: back },
      timeout: { primary: retry, secondary: back },
      failed: { primary: retry, secondary: back },
      input: { primary: back },
      restricted: { primary: back },
      unavailable: { primary: back, secondary: manual },
    } as const
    const { issue } = failure
    const [title, defaultDetail] = recoveryCopy[issue]
    const detail = (issue === 'input' || issue === 'restricted') && failure.detail ? failure.detail : defaultDetail
    return (
      <GenerationRecovery
        {...actions[issue]}
        title={title}
        video={importingVideo}
        detail={t(detail).replace('{formats}', videoFormats)}
        bottomInset={insets.bottom}
      />
    )
  }

  if (showLoading && load) return (
    <GenerationLoading
      scene={hasVideo ? 'video' : importingVideo ? 'caption' : importingPhoto ? 'photoRecipe' : 'recipe'}
      phase={load.phase}
      complete={load.complete}
      bottomInset={insets.bottom}
      onCancel={cancelGeneration}
    />
  )

  const choosing = mode === 'choose'
  const title = t(importingPhoto ? 'import.fromFoodPhoto' : importingVideo ? 'import.video' : 'import.paste')
  const description = t(importingPhoto ? 'import.foodPhotoHelp' : importingVideo ? 'import.videoIntro' : 'import.pasteHelp')
  const count = t('import.characterCount')
    .replace('{count}', n(text.length.toLocaleString('en-US')))
    .replace('{max}', n(maxCharacters.toLocaleString('en-US')))

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={insets.top}
    >
      <RecipeAuthoringNav
        back={!choosing}
        disabled={pending}
        onPress={choosing ? onCancel : () => openMode('choose')}
      />
      <ScrollView
        key={mode}
        contentContainerStyle={[styles.content, choosing && styles.chooserContent]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {choosing ? (
          <>
            <RecipeAuthoringHeading title={t('nav.newRecipe')} description={t('import.chooseMethod')} featured />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('import.paste')}
              accessibilityHint={t('import.pasteHint')}
              onPress={() => openMode('text')}
              style={({ pressed }) => [styles.feature, pressed && styles.pressed]}
            >
              <View style={styles.featureCopy}>
                <Ionicons name="clipboard-outline" size={23} color={c.primary} />
                <Text style={styles.featureTitle}>{t('import.paste')}</Text>
                <Text style={styles.hint}>{t('import.pasteHint')}</Text>
                <Ionicons name="arrow-forward" size={22} color={c.primary} />
              </View>
              <View
                accessible={false}
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
                pointerEvents="none"
                style={styles.art}
              >
                <View style={styles.artBack} />
                <View style={styles.artFront}>
                  <View style={styles.artTitle} />
                  <View style={styles.artLine} />
                  <View style={[styles.artLine, styles.artLineShort]} />
                  <View style={styles.artLine} />
                  <View style={styles.artCorner} />
                </View>
              </View>
            </Pressable>
            <View style={styles.methods}>
              <ImportMethod icon="camera-outline" label={t('import.fromFoodPhoto')} hint={t('import.foodPhotoHint')} onPress={() => openMode('photo')} />
              <ImportMethod icon="film-outline" label={t('import.video')} hint={t('import.videoHint')} onPress={() => openMode('video')} />
              <ImportMethod icon="create-outline" label={t('import.manual')} hint={t('import.manualHint')} onPress={onManual} />
            </View>
          </>
        ) : (
          <>
            <RecipeAuthoringHeading title={title} description={description} />
            {importingPhoto ? (
              <>
                {foodPhoto ? (
                  <View style={styles.photoPreview}>
                    <Image source={foodPhoto.uri} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="none" />
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={t('form.changePhoto')}
                      disabled={pending}
                      onPress={chooseFoodPhoto}
                      style={({ pressed }) => [styles.changePhoto, pressed && styles.pressed]}
                    >
                      <Ionicons name="images-outline" size={17} color={c.text} />
                      <Text style={styles.label}>{t('form.changePhoto')}</Text>
                    </Pressable>
                  </View>
                ) : (
                  <ImportMethod
                    icon="camera-outline"
                    label={t('import.chooseFoodPhoto')}
                    hint={t('import.photoPickerHint')}
                    onPress={chooseFoodPhoto}
                    disabled={pending}
                    variant="photo"
                  />
                )}
                <View style={styles.photoNote}>
                  <Ionicons name="information-circle-outline" size={21} color={c.primary} />
                  <View style={styles.methodCopy}>
                    <Text style={styles.methodTitle}>{t('import.photoNoteTitle')}</Text>
                    <Text style={styles.hint}>{t('import.photoNote')}</Text>
                  </View>
                </View>
              </>
            ) : (
              <>
                {importingVideo && (
                  <View style={styles.videoPicker}>
                    {initialShare && sourceUrl && !tiktokUrl && !caption.trim() && !selectedVideo && !captionOnly && (
                      <Text style={styles.hint}>{t('import.sharedLinkHelp')}</Text>
                    )}
                    <ImportMethod
                      icon="videocam-outline"
                      label={t(selectedVideo ? 'import.changeVideo' : 'import.chooseVideo')}
                      hint={selectedVideo ? (selectedVideo.fileName || t('import.videoSelected')) : t('import.videoLimits').replace('{formats}', videoFormats)}
                      onPress={chooseVideo}
                      disabled={pending}
                      variant="video"
                    />
                    {selectedVideo && !pending && <TextLink label={t('import.removeVideo')} onPress={() => {
                      setVideo(undefined)
                      setError(undefined)
                    }} />}
                  </View>
                )}
                <View style={styles.inputGroup}>
                  <Field
                    boxed
                    label={t(importingVideo ? 'import.caption' : 'import.source')}
                    labelAction={!importingVideo && (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={t('import.pasteAction')}
                        disabled={pending}
                        onPress={pasteRecipe}
                        style={({ pressed }) => [styles.paste, pressed && styles.pressed]}
                      >
                        <Ionicons name="clipboard-outline" size={17} color={c.primary} />
                        <Text style={styles.pasteLabel}>{t('import.pasteAction')}</Text>
                      </Pressable>
                    )}
                    placeholder={importingVideo ? t('import.captionPlaceholder') : undefined}
                    value={text}
                    autoFocus={focusSource}
                    onFocus={() => setFocusSource(false)}
                    onChangeText={value => {
                      if (importingVideo) setCaption(value)
                      else setSource(value)
                      setError(undefined)
                    }}
                    multiline
                    style={importingVideo ? styles.caption : styles.source}
                    maxLength={maxCharacters + 1}
                    editable={!pending}
                    invalid={text.length > maxCharacters}
                    hint={text.length > maxCharacters ? t('import.textTooLong') : undefined}
                  />
                  {(!importingVideo || text.length > 0) && <Text style={styles.count}>{count}</Text>}
                </View>
                {importingVideo && (
                  <Field
                    boxed
                    label={t('import.socialLink')}
                    labelDetail={t('form.optional')}
                    placeholder={t('import.sourceLinkPlaceholder')}
                    value={link}
                    onChangeText={value => {
                      setLink(value)
                      setError(undefined)
                    }}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="url"
                    editable={!pending}
                    maxLength={2048}
                    invalid={sourceUrl === null}
                    hint={sourceUrl === null ? t('import.invalidLink') : undefined}
                  />
                )}
              </>
            )}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('import.recipeLanguage')}</Text>
              <View style={styles.languageOptions}>
                {recipeLanguages.map(language => (
                  <Chip
                    key={language}
                    authoring
                    label={t(`language.${language}`)}
                    active={recipeLanguage === language}
                    disabled={pending}
                    onPress={() => {
                      Keyboard.dismiss()
                      setRecipeLanguage(language)
                    }}
                  />
                ))}
              </View>
            </View>
          </>
        )}
      </ScrollView>
      {!choosing && (
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
          {!importingPhoto && (
            <View style={styles.disclosure}>
              <Ionicons name="information-circle-outline" size={18} color={c.primary} />
              <Text style={styles.disclosureText}>{t(hasVideo ? 'import.videoDisclosure' : importingVideo ? 'import.videoNote' : 'import.disclosure')}</Text>
            </View>
          )}
          {error && <Text accessibilityRole="alert" style={styles.error}>{t(error).replace('{formats}', videoFormats)}</Text>}
          <PrimaryButton
            authoring
            label={t(importingPhoto ? 'import.generateFromPhoto' : 'import.createDraft')}
            onPress={extract}
            loading={pending}
            disabled={!recipeLanguage || !hasValidSource}
          />
        </View>
      )}
    </KeyboardAvoidingView>
  )
}

function ImportMethod({ icon, label, hint, onPress, disabled, variant = 'method' }: {
  icon: ComponentProps<typeof Ionicons>['name']
  label: string
  hint: string
  onPress: () => void
  disabled?: boolean
  variant?: 'method' | 'photo' | 'video'
}) {
  const { colors: c } = useTheme()
  const styles = useThemedStyles(makeStyles)
  const photo = variant === 'photo'
  const picker = variant !== 'method'
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      accessibilityState={{ disabled }}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.method,
        picker && styles.picker,
        photo && styles.photoTarget,
        (pressed || disabled) && styles.pressed,
      ]}
    >
      <View style={[styles.methodIcon, picker && styles.pickerIcon, photo && styles.photoIcon]}>
        <Ionicons name={icon} size={photo ? 28 : 23} color={c.primary} />
      </View>
      <View style={photo ? styles.photoTargetCopy : styles.methodCopy}>
        <Text style={styles.methodTitle}>{label}</Text>
        <Text style={[styles.hint, photo && styles.center]}>{hint}</Text>
      </View>
      {!photo && <Ionicons name="chevron-forward" size={20} color={c.textSecondary} />}
    </Pressable>
  )
}

const makeStyles = (c: ThemeColors, type: TypeScale) => StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: spacing.gutter, paddingTop: spacing.xl, paddingBottom: spacing.xxl, gap: spacing.xl },
  chooserContent: { paddingTop: spacing.md, gap: spacing.xxl },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: recipeAuthoring.featureHeight,
    backgroundColor: c.recipeImportFeature,
    borderWidth: 1,
    borderColor: c.recipeImportRule,
    borderRadius: radius.card,
    padding: spacing.sectionSpacing,
  },
  featureCopy: { gap: spacing.sm, flex: 1 },
  featureTitle: { ...type.authoringFeature, color: c.text },
  art: { width: '30%', maxWidth: 106, height: 130, justifyContent: 'center' },
  artBack: {
    position: 'absolute', top: 13, left: '21%', width: '76%', height: 102,
    borderWidth: 1, borderRadius: spacing.xs, borderColor: c.recipeImportRule, backgroundColor: c.recipeImportArt,
    transform: [{ rotate: '19deg' }],
  },
  artFront: {
    position: 'absolute', top: 13, left: '7%', width: '77%', height: 102,
    borderWidth: 1, borderRadius: spacing.xs, borderColor: c.recipeImportRule, backgroundColor: c.bg,
    paddingHorizontal: spacing.md, paddingTop: spacing.sectionSpacing, gap: spacing.sm, overflow: 'hidden',
    transform: [{ rotate: '5deg' }],
  },
  artTitle: { width: '72%', height: spacing.sm, borderTopWidth: 1, borderBottomWidth: 1, borderColor: c.primary },
  artLine: { width: '96%', height: 1, backgroundColor: c.recipeImportRule },
  artLineShort: { width: '78%' },
  artCorner: { position: 'absolute', bottom: 0, right: 0, borderRightWidth: spacing.md, borderTopWidth: spacing.md, borderRightColor: c.recipeImportArt, borderTopColor: c.bg },
  methods: { marginTop: -spacing.md },
  method: {
    minHeight: recipeAuthoring.methodHeight, flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingVertical: spacing.md, borderBottomWidth: 1, borderColor: c.border,
  },
  methodIcon: {
    width: sizes.hitMin, height: sizes.hitMin, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: c.border, borderRadius: radius.thumb,
  },
  methodCopy: { flex: 1, minWidth: 0, gap: spacing.xs },
  methodTitle: { ...type.authoringOption, color: c.text },
  hint: { ...type.authoringCaption, color: c.textSecondary },
  label: { ...type.authoringLabel, color: c.text },
  pressed: { opacity: 0.68 },
  picker: {
    minHeight: recipeAuthoring.mediaTargetHeight,
    borderWidth: 1, borderStyle: 'dashed', borderColor: c.borderFaint,
    borderRadius: radius.notice, backgroundColor: c.mediaPickerSurface, paddingHorizontal: spacing.md,
  },
  pickerIcon: { borderWidth: 0 },
  photoTarget: { minHeight: recipeAuthoring.photoTargetHeight, flexDirection: 'column', justifyContent: 'center' },
  photoIcon: { width: sizes.mark, height: sizes.mark, backgroundColor: c.accentSoft },
  photoTargetCopy: { flexShrink: 1, alignItems: 'center', gap: spacing.xs },
  center: { textAlign: 'center' },
  photoPreview: { height: recipeAuthoring.photoPreviewHeight, borderRadius: radius.notice, overflow: 'hidden', backgroundColor: c.oat },
  changePhoto: {
    position: 'absolute', bottom: spacing.md, right: spacing.md, flexDirection: 'row', alignItems: 'center',
    minHeight: sizes.hitMin, paddingHorizontal: spacing.md, gap: spacing.xs, borderRadius: radius.thumb, backgroundColor: c.bg,
  },
  photoNote: { flexDirection: 'row', gap: spacing.md, paddingTop: spacing.lg, borderTopWidth: 1, borderColor: c.border },
  videoPicker: { gap: spacing.sm },
  inputGroup: { gap: spacing.sm },
  languageOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  source: { height: recipeAuthoring.recipeTextHeight, minHeight: recipeAuthoring.recipeTextHeight },
  caption: { height: recipeAuthoring.captionHeight, minHeight: recipeAuthoring.captionHeight },
  count: { ...type.metadataSmall, color: c.textSecondary, textAlign: 'right' },
  paste: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, minHeight: sizes.hitMin },
  pasteLabel: { ...type.authoringLabel, color: c.primary },
  error: { ...type.authoringBody, color: c.danger },
  footer: { paddingHorizontal: spacing.gutter, paddingTop: spacing.sm, borderTopWidth: 1, borderColor: c.border, backgroundColor: c.bg, gap: spacing.md },
  disclosure: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, paddingTop: spacing.xs },
  disclosureText: { ...type.authoringCaption, color: c.textSecondary, flex: 1 },
})
