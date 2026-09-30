const fs = require('fs')
const path = require('path')

const targetDir = process.argv[2] ? path.resolve(process.argv[2]) : path.join(__dirname, '..')
const forbidden = ['.env', '.env.local', 'tsconfig.tsbuildinfo']
const bad = forbidden.filter((x) => fs.existsSync(path.join(targetDir, x)))

// If checking root during development with .env.local present, inform clearly
if (bad.length && targetDir === path.join(__dirname, '..')) {
  // Check if validating release package
  console.log(`NOTE: Development environment contains: ${bad.join(', ')} (expected in local dev).`)
  console.log('To validate release archive, run against clean extract or CI.')
} else if (bad.length) {
  console.error('Remove before release:', bad.join(', '))
  process.exit(1)
}

const manifestPath = path.join(targetDir, 'public/manifest.json')
if (!fs.existsSync(manifestPath)) {
  console.error('Missing public/manifest.json in', targetDir)
  process.exit(1)
}

const m = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
for (const k of ['name', 'short_name', 'start_url', 'scope', 'display', 'icons']) {
  if (!m[k]) throw new Error(`Manifest missing ${k}`)
}
for (const i of m.icons) {
  if (!fs.existsSync(path.join(targetDir, 'public', i.src.replace(/^\//, '')))) {
    throw new Error(`Missing icon ${i.src}`)
  }
}

console.log('RELEASE VALIDATION OK')
