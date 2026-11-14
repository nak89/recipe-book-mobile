module.exports = ({ config: base }) => {
  const origins = [process.env.EXPO_PUBLIC_API_URL, process.env.EXPO_PUBLIC_SUPABASE_URL]
    .filter(Boolean).map(value => new URL(value).origin)
  const images = ['https://images.unsplash.com', 'https://images.squarespace-cdn.com']
  const csp = [
    "default-src 'self'", "script-src 'self'", "style-src 'self' 'unsafe-inline'",
    `connect-src 'self' data: blob: ${[...origins, ...images].join(' ')}`,
    `img-src 'self' data: blob: ${[...origins, ...images].join(' ')}`,
    "media-src 'self' blob: data:",
    "font-src 'self' data:", "worker-src 'self' blob:", "object-src 'none'",
    "base-uri 'none'", "frame-ancestors 'none'", "form-action 'self'",
  ].join('; ')
  const headers = {
    'Content-Security-Policy': csp,
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    'Permissions-Policy': 'geolocation=(), microphone=()',
  }
  const config = { ...base, plugins: base.plugins.map(plugin => plugin === 'expo-router' ? ['expo-router', { headers }] : plugin) }
  if (process.env.APP_VARIANT !== 'development') return config

  const id = 'com.nak89.krouengpsom.dev'
  return {
    ...config,
    name: 'Recipe Book Dev',
    scheme: 'recipebookdev',
    ios: { ...config.ios, bundleIdentifier: id },
    android: { ...config.android, package: id },
    extra: { ...config.extra, recipeBookDevShare: true },
    plugins: [
      ...config.plugins,
      ['expo-sharing', {
        ios: {
          enabled: true,
          activationRule: { supportsText: true, supportsWebUrlWithMaxCount: 1, supportsMovieWithMaxCount: 1 },
        },
        android: { enabled: true, singleShareMimeTypes: ['text/plain', 'video/*'] },
      }],
      './plugins/with-recipe-share-name',
    ],
  }
}
