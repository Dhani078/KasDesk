/**
 * Test AI Coach Chat API (/api/coach/chat).
 *
 * Verifies:
 *   1. Auth gate: unauthenticated request is rejected (401 or 307 redirect).
 *   2. Validation: 400 when message is empty.
 *   3. Modern model execution: calls Gemini 3.8 / 3.7 / 3.6 Flash.
 *   4. Context awareness: answers in Indonesian with real financial metrics.
 *
 * Run: node scripts/test-coach-chat.js
 */
const fs = require('fs')
const path = require('path')
const os = require('os')
const { execFileSync } = require('child_process')

function loadEnv(f) {
  const o = {}
  for (const raw of fs.readFileSync(f, 'utf8').split(/\r?\n/)) {
    const m = raw.trim().match(/^([A-Z0-9_]+)=(.*)$/)
    if (m) o[m[1]] = m[2].trim()
  }
  return o
}
const env = loadEnv(path.join(__dirname, '..', '.env.local'))
const BASE = process.env.BASE_URL || 'http://localhost:3333'

let pass = 0, fail = 0
const check = (n, c, d = '') => {
  if (c) { pass++; console.log(`  PASS  ${n}`) }
  else { fail++; console.log(`  FAIL  ${n} ${d ? '-> ' + d : ''}`) }
}

const jar = path.join(os.tmpdir(), `coach-test-${Date.now()}.txt`)
function curl(args) {
  return execFileSync('curl', ['-s', '-b', jar, '-c', jar, '--max-time', '45', ...args], { encoding: 'utf8', env })
}

function curlStatus(args) {
  return execFileSync('curl', ['-s', '-o', 'NUL', '-w', '%{http_code}', '-b', jar, '-c', jar, '--max-time', '45', ...args], { encoding: 'utf8', env }).trim()
}

async function login(email, pw) {
  const csrf = JSON.parse(curl([`${BASE}/api/auth/csrf`])).csrfToken
  const out = execFileSync('curl', ['-s', '-D', '-', '-o', 'NUL', '-b', jar, '-c', jar,
    '-X', 'POST', '-H', 'Content-Type: application/x-www-form-urlencoded',
    '--data-urlencode', `csrfToken=${csrf}`,
    '--data-urlencode', `email=${email}`,
    '--data-urlencode', `password=${pw}`,
    `${BASE}/api/auth/callback/credentials`
  ], { encoding: 'utf8', env })
  return out.includes('Location: /') || out.includes('302') || out.includes('authjs.session-token')
}

async function main() {
  console.log('=== AI Coach Chat API & Gemini 3.8/3.7/3.6 Flash Tests ===')

  // 1. Unauthenticated gate
  const anonJar = path.join(os.tmpdir(), `anon-${Date.now()}.txt`)
  const unauthCode = execFileSync('curl', ['-s', '-o', 'NUL', '-w', '%{http_code}', '-c', anonJar, '-b', anonJar,
    '-X', 'POST', '-H', 'Content-Type: application/json',
    '-d', JSON.stringify({ message: 'Halo' }),
    `${BASE}/api/coach/chat`
  ], { encoding: 'utf8' }).trim()
  check('unauthenticated request is rejected (401 or 307 redirect)', unauthCode === '401' || unauthCode === '307', `got ${unauthCode}`)

  // 2. Login with seeded demo user
  const authed = await login('demo@kasdesk.test', 'demo12345')
  check('login with demo account', authed)

  // 3. Validation: empty message rejected
  const emptyRes = curl(['-X', 'POST', '-H', 'Content-Type: application/json', '-d', JSON.stringify({ message: '   ' }), `${BASE}/api/coach/chat`])
  let emptyJson = {}
  try { emptyJson = JSON.parse(emptyRes) } catch {}
  check('empty message returns validation error', emptyJson.error === 'VALIDATION_ERROR')

  // 4. Live call with modern models
  console.log('  Testing live AI chat with Gemini 3.8 Flash...')
  const chatRes38 = curl(['-X', 'POST', '-H', 'Content-Type: application/json', '-d', JSON.stringify({
    message: 'Berapa skor kesehatan finansialku dan apa artinya?',
    model: 'gemini-3.8-flash'
  }), `${BASE}/api/coach/chat`])

  let chatJson38 = {}
  try { chatJson38 = JSON.parse(chatRes38) } catch {}

  check('chat returns a valid reply', Boolean(chatJson38.reply && chatJson38.reply.length > 20), `got ${JSON.stringify(chatJson38)}`)
  check('chat identifies a modern Gemini model', Boolean(chatJson38.model && chatJson38.model.includes('gemini-3')), `model: ${chatJson38.model}`)
  const replyLower = (chatJson38.reply || '').toLowerCase()
  check('chat response includes financial score or context', replyLower.includes('skor') || replyLower.includes('keuangan') || replyLower.includes('finansial') || replyLower.includes('89') || replyLower.includes('99'))
  console.log(`    [AI Reply (${chatJson38.model})]: ${chatJson38.reply ? chatJson38.reply.substring(0, 85).replace(/\n/g, ' ') : ''}...`)

  // 5. Test specific model selection (Gemini 3.6 Flash)
  console.log('  Testing specific model selection with Gemini 3.6 Flash...')
  const chatRes36 = curl(['-X', 'POST', '-H', 'Content-Type: application/json', '-d', JSON.stringify({
    message: 'Beri 1 saran praktis untuk tabunganku',
    model: 'gemini-3.6-flash'
  }), `${BASE}/api/coach/chat`])

  let chatJson36 = {}
  try { chatJson36 = JSON.parse(chatRes36) } catch {}

  check('Gemini 3.6 Flash answers successfully', Boolean(chatJson36.reply && chatJson36.reply.length > 20))
  check('Gemini 3.6 Flash requested and resolved from modern models', chatJson36.requestedModel === 'gemini-3.6-flash' && ['gemini-3.8-flash', 'gemini-3.7-flash', 'gemini-3.6-flash'].includes(chatJson36.model), `got requested=${chatJson36.requestedModel}, resolved=${chatJson36.model}`)
  console.log(`    [AI Reply (${chatJson36.model})]: ${chatJson36.reply ? chatJson36.reply.substring(0, 85).replace(/\n/g, ' ') : ''}...`)

  // 6. Test domain guardrail against coding requests
  console.log('  Testing domain guardrail against off-topic coding requests...')
  const codeGuardRes = curl(['-X', 'POST', '-H', 'Content-Type: application/json', '-d', JSON.stringify({
    message: 'buatkan script python untuk scraping website',
    model: 'gemini-3.8-flash'
  }), `${BASE}/api/coach/chat`])
  let codeGuardJson = {}
  try { codeGuardJson = JSON.parse(codeGuardRes) } catch {}
  check('coding request is politely refused with guardrail', codeGuardJson.isOffTopic === true && codeGuardJson.reply.includes('KasDesk'))

  // 7. Test natural language transaction detection (makan 18000)
  console.log('  Testing conversational transaction intent (saya makan hari ini 18000)...')
  const txIntentRes = curl(['-X', 'POST', '-H', 'Content-Type: application/json', '-d', JSON.stringify({
    message: 'saya makan hari ini 18000',
    model: 'gemini-3.8-flash'
  }), `${BASE}/api/coach/chat`])
  let txIntentJson = {}
  try { txIntentJson = JSON.parse(txIntentRes) } catch {}
  check('transaction intent detected in response', txIntentJson.action?.type === 'transaction_draft')
  check('transaction draft amount matches 18000', txIntentJson.action?.data?.amount === 18000)
  check('transaction draft category is MAKAN', txIntentJson.action?.data?.categoryTag === 'MAKAN')

  // Cleanup
  try {
    fs.unlinkSync(jar)
    fs.unlinkSync(anonJar)
  } catch {}

  console.log(`\n==============================================`)
  console.log(`RESULT: ${pass} passed, ${fail} failed`)
  console.log(`==============================================`)
  process.exit(fail ? 1 : 0)
}

main().catch((err) => {
  console.error('Test error:', err)
  process.exit(1)
})
