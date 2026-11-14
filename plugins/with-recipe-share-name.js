const fs = require('node:fs')
const path = require('node:path')
const plist = require('@expo/plist').default
const { withXcodeProject } = require('expo/config-plugins')

// Expo generates the extension's plist before the Xcode project is configured.
module.exports = config => withXcodeProject(config, config => {
  const filename = path.join(config.modRequest.platformProjectRoot, 'expo-sharing-extension', 'Info.plist')
  const info = plist.parse(fs.readFileSync(filename, 'utf8'))
  info.CFBundleDisplayName = config.name
  fs.writeFileSync(filename, plist.build(info))
  return config
})
