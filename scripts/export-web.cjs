// SDK 57's single-page exporter doesn't emit the hosting header manifest.
// Emit the same subset used by Expo's static exporter, keeping web.output=single.
const { spawnSync } = require('node:child_process')
const fs = require('node:fs')
const path = require('node:path')
const cli = require.resolve('expo/bin/cli')
const env = { ...process.env, NODE_ENV: 'production' }
const output = process.argv[2] || 'dist'
const exported = spawnSync(process.execPath, [cli, 'export', '--platform', 'web', '--output-dir', output], { env, stdio: 'inherit' })
if (exported.status !== 0) process.exit(exported.status || 1)
const configured = spawnSync(process.execPath, [cli, 'config', '--json'], { env, encoding: 'utf8' })
if (configured.status !== 0) throw new Error('Could not read export configuration')
const config = JSON.parse(configured.stdout)
const router = config.plugins.find(plugin => Array.isArray(plugin) && plugin[0] === 'expo-router')
if (!router?.[1]?.headers?.['Content-Security-Policy']) throw new Error('Missing security headers')
fs.mkdirSync(path.join(output, '_expo'), { recursive: true })
fs.writeFileSync(path.join(output, '_expo', '.routes.json'), JSON.stringify({ headers: router[1].headers, redirects: [] }, null, 2))
console.log('Security header manifest exported.')
