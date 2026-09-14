/**
 * Safe arithmetic expression evaluator for inline transaction inputs.
 * Supports +, -, *, x, /, and standard operator precedence without using eval().
 */

export function evaluateMathExpression(expr: string): number | null {
  if (!expr || typeof expr !== 'string') return null

  // Normalize: replace dots (thousand separators), spaces, 'x' or 'X' to '*', '÷' to '/'
  const sanitized = expr
    .replace(/\./g, '')
    .replace(/\s+/g, '')
    .replace(/[xX×]/g, '*')
    .replace(/÷/g, '/')

  // Only allow digits and operators +, -, *, /
  if (!/^[\d+\-*/]+$/.test(sanitized)) return null

  // Must not start or end with an operator (except leading minus/plus is ok)
  if (/[+\-*/]$/.test(sanitized)) return null

  try {
    // Tokenize into numbers and operators
    const tokens: (number | string)[] = []
    let currentNumber = ''

    for (let i = 0; i < sanitized.length; i++) {
      const char = sanitized[i]
      if (char >= '0' && char <= '9') {
        currentNumber += char
      } else if (['+', '-', '*', '/'].includes(char)) {
        if (currentNumber) {
          tokens.push(Number(currentNumber))
          currentNumber = ''
        } else if (char === '-' && (i === 0 || ['+', '-', '*', '/'].includes(sanitized[i - 1]))) {
          // Negative sign prefix
          currentNumber = '-'
          continue
        } else {
          return null // Consecutive invalid operators
        }
        tokens.push(char)
      }
    }
    if (currentNumber) {
      tokens.push(Number(currentNumber))
    }

    if (tokens.length === 0) return null
    if (tokens.length === 1 && typeof tokens[0] === 'number') {
      return tokens[0]
    }

    // Step 1: Handle * and /
    const higherPrecedence: (number | string)[] = []
    let idx = 0
    while (idx < tokens.length) {
      const token = tokens[idx]
      if (token === '*' || token === '/') {
        const prev = higherPrecedence.pop()
        const next = tokens[idx + 1]
        if (typeof prev !== 'number' || typeof next !== 'number') return null
        if (token === '/' && next === 0) return null // Division by zero
        const result = token === '*' ? prev * next : Math.round(prev / next)
        higherPrecedence.push(result)
        idx += 2
      } else {
        higherPrecedence.push(token)
        idx++
      }
    }

    // Step 2: Handle + and -
    let total = higherPrecedence[0]
    if (typeof total !== 'number') return null

    let opIdx = 1
    while (opIdx < higherPrecedence.length) {
      const op = higherPrecedence[opIdx]
      const nextVal = higherPrecedence[opIdx + 1]
      if (typeof nextVal !== 'number') return null

      if (op === '+') {
        total += nextVal
      } else if (op === '-') {
        total -= nextVal
      } else {
        return null
      }
      opIdx += 2
    }

    const rounded = Math.round(total)
    if (!Number.isFinite(rounded) || rounded < 0 || rounded > 100_000_000_000) {
      return null
    }

    return rounded
  } catch {
    return null
  }
}

/** Check if text contains a math operator */
export function hasMathOperator(text: string): boolean {
  return /[+\-*/xX×÷]/.test(text)
}
