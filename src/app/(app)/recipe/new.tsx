import { useFocusEffect, useLocalSearchParams, useNavigation, useRouter } from 'expo-router'
import { useCallback, useEffect, useRef, useState } from 'react'
import { BackHandler, Keyboard, Platform, StyleSheet, View, useWindowDimensions } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { RecipeAuthoringNav } from '@/components/RecipeAuthoring'
import { useAuth } from '@/context/AuthContext'
import { createRecipe, generateRecipePhoto, uploadGeneratedRecipePhoto, uploadPhoto } from '@/lib/api'
import { releaseRecipePhoto } from '@/lib/foodPhoto'
import { readIncomingRecipeShare, recipeShareEnabled, type IncomingRecipeShare } from '@/lib/incomingRecipeShare'
import RecipeForm from '@/components/RecipeForm'
import RecipeImport from '@/components/RecipeImport'
import BlankLoadingState from '@/components/ui/BlankLoadingState'
import { radius, recipeAuthoring, spacing, useThemedStyles } from '@/theme'
import type { ThemeColors } from '@/theme'
import type { DraftPhoto, DraftPhotoSource, RecipeDraft, RecipeInput } from '@/types/recipe'

const textImportEnabled = __DEV__ || process.env.EXPO_PUBLIC_RECIPE_IMPORT_ENABLED === 'true'

export default function NewRecipeScreen() {
  const { incomingShare } = useLocalSearchParams()
  const shareId = recipeShareEnabled && typeof incomingShare === 'string' ? incomingShare : undefined
  return <NewRecipeEditor key={shareId ?? 'manual-entry'} shareId={shareId} />
}

function NewRecipeEditor({ shareId }: { shareId?: string }) {
  const { token } = useAuth()
  const styles = useThemedStyles(makeStyles)
  const navigation = useNavigation()
  const router = useRouter()
  const canChoose = textImportEnabled || !!shareId
  const [entry, setEntry] = useState<'choose' | 'manual' | RecipeDraft>(canChoose ? 'choose' : 'manual')
  const [choosing, setChoosing] = useState(!shareId)
  const [showIncomingShare, setShowIncomingShare] = useState(!!shareId)
  const { top } = useSafeAreaInsets()
  const { width, height } = useWindowDimensions()
  const wide = Platform.OS === 'web' && width >= recipeAuthoring.wideBreakpoint
  const [incoming, setIncoming] = useState<IncomingRecipeShare>()
  const [saving, setSaving] = useState(false)
  const [draftPhoto, setDraftPhoto] = useState<DraftPhoto>()
  const photoRequest = useRef<AbortController | null>(null)
  const localPhotoUris = useRef<string[]>([])
  const uploadedDraftPhotos = useRef(new Map<string, string>())
  const shareRead = useRef<{ pending?: Promise<IncomingRecipeShare>; version: number }>({ version: 0 })

  useEffect(() => {
    if (!shareId) return
    const read = shareRead.current
    const version = ++read.version
    const pending = read.pending ??= readIncomingRecipeShare(shareId)
    let mounted = true
    void pending.then(result => { if (mounted) setIncoming(result) })
    return () => {
      mounted = false
      // A replayed effect reuses the same read and still owns its copied file.
      void pending.then(result => {
        if (read.version === version && result.video) releaseRecipePhoto(result.video.uri)
      })
    }
  }, [shareId])

  useEffect(() => () => {
    photoRequest.current?.abort()
    for (const uri of localPhotoUris.current) releaseRecipePhoto(uri)
  }, [])

  function openDraft(draft: RecipeDraft, photo: DraftPhoto | undefined, generatePhoto: boolean) {
    setEntry(draft)
    if (photo) {
      if (photo.status === 'video') localPhotoUris.current = photo.frames.map(frame => frame.uri)
      if (photo.status === 'ready' && photo.source.kind === 'selected') localPhotoUris.current = [photo.source.uri]
      setDraftPhoto(photo)
      return
    }
    if (!generatePhoto || !draft.title || !token) return

    const request = new AbortController()
    photoRequest.current?.abort()
    photoRequest.current = request
    setDraftPhoto({ status: 'generating', startedAt: performance.now() })
    void generateRecipePhoto(draft.title, draft.ingredients.map(item => item.name), token, request.signal)
      .then(({ jpeg }) => {
        if (!request.signal.aborted) setDraftPhoto({ status: 'ready', source: { kind: 'generated', jpeg } })
      })
      .catch(() => {
        if (!request.signal.aborted) setDraftPhoto({ status: 'unavailable' })
      })
  }

  function dismiss() {
    if (router.canGoBack()) router.back()
    else router.replace('/')
  }

  const backToChooser = useCallback(() => {
    Keyboard.dismiss()
    photoRequest.current?.abort()
    for (const uri of localPhotoUris.current) releaseRecipePhoto(uri)
    localPhotoUris.current = []
    uploadedDraftPhotos.current.clear()
    setDraftPhoto(undefined)
    setShowIncomingShare(false)
    setChoosing(true)
    setEntry('choose')
  }, [])

  useFocusEffect(useCallback(() => {
    if (Platform.OS !== 'android' || (!saving && (entry === 'choose' || !canChoose))) return
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!saving) backToChooser()
      return true
    })
    return () => subscription.remove()
  }, [entry, canChoose, saving, backToChooser]))

  async function handleSubmit(data: RecipeInput, photo?: DraftPhotoSource) {
    if (!token) return
    setSaving(true)
    navigation.setOptions({ gestureEnabled: false })
    try {
      if (photo && !data.photoUrl) {
        const key = photo.kind === 'selected' ? photo.uri : photo.kind
        const photoUrl = uploadedDraftPhotos.current.get(key) ?? await (photo.kind === 'selected'
          ? uploadPhoto(photo.uri, token)
          : uploadGeneratedRecipePhoto(photo.jpeg, token))
        uploadedDraftPhotos.current.set(key, photoUrl)
        data = { ...data, photoUrl }
      }
      if (!navigation.isFocused()) return
      await createRecipe(data, token)
      if (navigation.isFocused()) dismiss()
    } finally {
      if (navigation.isFocused()) navigation.setOptions({ gestureEnabled: true })
      setSaving(false)
    }
  }

  const panelHeight = Math.min(
    height - spacing.xxl * 2,
    entry === 'choose' && choosing ? recipeAuthoring.chooserHeight : recipeAuthoring.editorHeight,
  )

  return (
    <View style={[styles.screen, wide && styles.wideScreen]}>
      <View style={[styles.content, wide ? [styles.panel, { height: panelHeight }] : [styles.fill, { paddingTop: top }]]}>
        {entry === 'choose' && token ? (
          showIncomingShare && !incoming ? (
            <>
              <RecipeAuthoringNav onPress={dismiss} />
              <BlankLoadingState />
            </>
          ) : (
            <RecipeImport
              token={token}
              initialShare={showIncomingShare ? incoming : undefined}
              onDraft={openDraft}
              onManual={() => setEntry('manual')}
              onCancel={dismiss}
              onModeChange={setChoosing}
            />
          )
        ) : (
          <>
            <RecipeAuthoringNav back={canChoose} onPress={canChoose ? backToChooser : dismiss} disabled={saving} />
            <RecipeForm
              draft={typeof entry === 'object' ? entry : undefined}
              draftPhoto={draftPhoto}
              onSubmit={handleSubmit}
              submitLabel="form.addRecipe"
            />
          </>
        )}
      </View>
    </View>
  )
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.bg },
  content: { width: '100%', backgroundColor: c.bg },
  fill: { flex: 1 },
  wideScreen: { backgroundColor: c.canvas, alignItems: 'center', justifyContent: 'center' },
  panel: {
    flexShrink: 0,
    maxWidth: recipeAuthoring.panelWidth,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: radius.button,
    overflow: 'hidden',
  },
})
