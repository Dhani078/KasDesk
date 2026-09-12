type Level = 'info' | 'warn' | 'error'
type Field = string | number | boolean | null | undefined
type Fields = Record<string, Field>

const BLOCKED_KEY = /password|secret|token|authorization|cookie|image|receipt|email|phone/i
const BEARER = /bearer\s+[a-z0-9._~+\/-]+=*/gi
const KEY_VALUE_SECRET = /(password|secret|token|api[_-]?key)=([^\s&]+)/gi

function sanitize(value: Field): Field {
  if (typeof value !== 'string') return value
  return value.slice(0, 500).replace(BEARER, 'Bearer [REDACTED]').replace(KEY_VALUE_SECRET, '$1=[REDACTED]')
}

export function log(level: Level, event: string, fields: Fields = {}) {
  const safe = Object.fromEntries(
    Object.entries(fields)
      .filter(([key, value]) => !BLOCKED_KEY.test(key) && value !== undefined)
      .map(([key, value]) => [key, sanitize(value)]),
  )
  const record = JSON.stringify({ level, event: event.slice(0, 120), at: new Date().toISOString(), ...safe })
  if (level === 'error') console.error(record)
  else if (level === 'warn') console.warn(record)
  else console.info(record)
}
