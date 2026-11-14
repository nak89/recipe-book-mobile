import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { socialRecipeSource, splitSharedRecipeText } from '@/lib/socialRecipeSource'

describe('social recipe sources', () => {
  it('recognises social video and short links and drops tracking parameters', () => {
    assert.equal(socialRecipeSource('https://vm.tiktok.com/abc/?_t=tracker'), 'https://vm.tiktok.com/abc/')
    assert.equal(socialRecipeSource('https://www.instagram.com/reel/abc/?igsh=tracker'), 'https://www.instagram.com/reel/abc/')
    assert.equal(socialRecipeSource('https://www.facebook.com/share/r/abc/?mibextid=tracker'), 'https://www.facebook.com/share/r/abc/')
    assert.equal(socialRecipeSource('https://fb.watch/abc/'), 'https://fb.watch/abc/')
  })

  it('keeps the video ID on Facebook watch links', () => {
    assert.equal(socialRecipeSource('https://m.facebook.com/watch/?v=12345&ref=sharing'), 'https://m.facebook.com/watch/?v=12345')
    assert.equal(socialRecipeSource('https://m.facebook.com/watch/?ref=sharing'), null)
  })

  it('rejects unrelated, lookalike, and non-HTTPS links', () => {
    for (const url of [
      'https://facebook.com.example.org/reel/123',
      'https://tiktok.com@localhost/123',
      'http://instagram.com/reel/abc/',
      'https://tiktok.com:444/abc',
      'https://www.instagram.com/username/',
    ]) assert.equal(socialRecipeSource(url), null)
  })

  it('separates a caption from a link in the shared text', () => {
    assert.deepEqual(splitSharedRecipeText('ឆាមាន់\nhttps://www.tiktok.com/@cook/video/123?share=1'), {
      source: 'https://www.tiktok.com/@cook/video/123',
      caption: 'ឆាមាន់',
    })
    assert.deepEqual(splitSharedRecipeText('https://www.instagram.com/reel/abc/'), {
      source: 'https://www.instagram.com/reel/abc/',
      caption: '',
    })
    assert.deepEqual(splitSharedRecipeText('https://example.org/recipe'), { source: '', caption: '' })
    assert.deepEqual(splitSharedRecipeText('Stir the sauce.'), { source: '', caption: 'Stir the sauce.' })
  })
})
