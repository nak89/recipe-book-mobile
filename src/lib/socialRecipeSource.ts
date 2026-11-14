const tiktokHosts = new Set(['tiktok.com', 'www.tiktok.com', 'm.tiktok.com', 'vm.tiktok.com', 'vt.tiktok.com'])
const instagramHosts = new Set(['instagram.com', 'www.instagram.com', 'm.instagram.com'])
const facebookHosts = new Set(['facebook.com', 'www.facebook.com', 'm.facebook.com', 'web.facebook.com', 'fb.watch'])

export function socialRecipeSource(raw: string) {
  try {
    const url = new URL(raw.trim())
    if (url.protocol !== 'https:' || url.username || url.password || url.port) return null
    const { hostname, pathname } = url
    if (tiktokHosts.has(hostname) && pathname !== '/') return url.origin + pathname
    if (instagramHosts.has(hostname) && /^\/(?:reels?|p|tv|share)\/.+/.test(pathname)) return url.origin + pathname
    if (facebookHosts.has(hostname)) {
      if (/^\/(?:watch\/?|video\.php)$/.test(pathname)) {
        const id = url.searchParams.get('v')
        return id && /^\d+$/.test(id) ? `${url.origin}${pathname}?v=${id}` : null
      }
      if (hostname === 'fb.watch' && /^\/[\w-]+\/?$/.test(pathname)) return url.origin + pathname
      if (/\/(?:reels?|videos|posts|share)\/.+/.test(pathname)) return url.origin + pathname
    }
    return null
  } catch {
    return null
  }
}

export function splitSharedRecipeText(value: string) {
  const text = value.trim().slice(0, 8000)
  const links = text.matchAll(/https:\/\/[^\s<>"“”]+/gi)
  for (const match of links) {
    const source = socialRecipeSource(match[0].replace(/[),.!?\]]+$/, ''))
    if (source) {
      const caption = (text.slice(0, match.index) + text.slice(match.index + match[0].length)).trim()
      return { source, caption }
    }
  }
  return { source: '', caption: /^https?:\/\/\S+$/i.test(text) ? '' : text }
}
