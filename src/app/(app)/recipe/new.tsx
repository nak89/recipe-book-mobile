import { Stack, useLocalSearchParams, useNavigation, useRouter } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import { Pressable, StyleSheet } from 'react-native'
import { Text } from '@/components/ui/Text'
import { useAuth } from '@/context/AuthContext'
import { useT } from '@/i18n'
import { createRecipe, generateRecipePhoto, uploadGeneratedRecipePhoto, uploadPhoto } from '@/lib/api'
import { releaseRecipePhoto } from '@/lib/foodPhoto'
import { readIncomingRecipeShare, recipeShareEnabled, type IncomingRecipeShare } from '@/lib/incomingRecipeShare'
import RecipeForm from '@/components/RecipeForm'
import RecipeImport from '@/components/RecipeImport'
import BlankLoadingState from '@/components/ui/BlankLoadingState'
import { sizes, useTypeScale } from '@/theme'
import type { DraftPhoto, DraftPhotoSource, RecipeDraft, RecipeInput } from '@/types/recipe'

const textImportEnabled = __DEV__ || process.env.EXPO_PUBLIC_RECIPE_IMPORT_ENABLED === 'true'

export default function NewRecipeScreen() {
  const { incomingShare } = useLocalSearchParams()
  const shareId = recipeShareEnabled && typeof incomingShare === 'string' ? incomingShare : undefined
  return <NewRecipeEditor key={shareId ?? 'manual-entry'} shareId={shareId} />
}

function NewRecipeEditor({ shareId }: { shareId?: string }) {
  const { token } = useAuth()
  const t = useT()
  const type = useTypeScale()
  const navigation = useNavigation()
  const router = useRouter()
  const [entry, setEntry] = useState<'choose' | 'manual' | RecipeDraft>(textImportEnabled || shareId ? 'choose' : 'manual')
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
    setDraftPhoto({ status: 'generating' })
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

  async function handleSubmit(data: RecipeInput, photo?: DraftPhotoSource) {
    if (!token) return
    setSaving(true)
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
      setSaving(false)
    }
  }

  return (
    <>
      <Stack.Screen options={{
        headerBackVisible: false,
        gestureEnabled: !saving,
        headerLeft: ({ tintColor }) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('common.cancel')}
            accessibilityState={{ disabled: saving }}
            disabled={saving}
            onPress={dismiss}
            style={({ pressed }) => [styles.cancel, (pressed || saving) && styles.inactive]}
          >
            <Text style={[type.sectionLabel, { color: tintColor }]}>{t('common.cancel')}</Text>
          </Pressable>
        ),
      }} />
      {entry === 'choose' && token ? (
        shareId && !incoming ? <BlankLoadingState /> : (
          <RecipeImport token={token} initialShare={incoming} onDraft={openDraft} onManual={() => setEntry('manual')} />
        )
      ) : (
        <RecipeForm
          draft={typeof entry === 'object' ? entry : undefined}
          draftPhoto={draftPhoto}
          onSubmit={handleSubmit}
          submitLabel="form.addRecipe"
        />
      )}
    </>
  )
}

const styles = StyleSheet.create({
  cancel: { minHeight: sizes.hitMin, justifyContent: 'center' },
  inactive: { opacity: 0.5 },
})
