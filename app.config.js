const base = require('./app.json').expo

module.exports = () => {
  const origins = [process.env.EXPO_PUBLIC_API_URL, process.env.EXPO_PUBLIC_SUPABASE_URL]
    .filter(Boolean).map(value => new URL(value).origin)
  const images = ['https://images.unsplash.com', 'https://images.squarespace-cdn.com']
  const csp = [
    "default-src 'self'", "script-src 'self'", "style-src 'self' 'unsafe-inline'",
    `connect-src 'self' ${[...origins, ...images].join(' ')}`,
    `img-src 'self' data: blob: ${[...origins.filter(origin => origin.includes('.supabase.co')), ...images].join(' ')}`,
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
  return { ...base, plugins: base.plugins.map(plugin => plugin === 'expo-router' ? ['expo-router', { headers }] : plugin) }
}
