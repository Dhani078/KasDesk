---
name: context7-docs
description: Fetch version-specific library documentation before writing code that uses an external API. Use when writing database/ORM queries, framework config, or any library call whose API may have changed — or when you hit an unfamiliar build/runtime error.
version: 1.0.0
---

# Context7 — Version-Specific Docs

## What it solves

LLMs rely on training data that may be a year old. That produces:

- Code examples from outdated APIs
- Hallucinated methods that never existed
- Answers for the wrong major version

Context7 pulls **current, version-specific** docs straight from the source.

## The core rule

> **Before writing code against a library whose API may have changed,
> verify the API with Context7. Do not rely on memory.**

This matters most for:

| Situation | Why |
| :--- | :--- |
| Major version just released | Training data predates it |
| Build/runtime error you don't recognize | Likely a breaking change |
| Framework config | Flags move between versions |
| ORM / query builder | Method names change |
| Auth libraries | Breaking changes are frequent |

## Commands

```bash
# 1. Find the library ID
ctx7 library "drizzle-orm mysql"

# 2. Fetch docs for a specific question
ctx7 docs /drizzle-team/drizzle-orm-docs "how to use db.transaction"

# 3. In a prompt (MCP mode): append "use context7" or
#    "use library /vercel/next.js"
```

**Always pass a specific question** to `ctx7 docs`. Generic queries return
generic snippets. Include the version number when it matters:

```bash
ctx7 docs /vercel/next.js "Next.js 16 turbopack webpack config error"
```

## Known-good library IDs (this project)

| Library | ID |
| :--- | :--- |
| Next.js | `/vercel/next.js` |
| Drizzle ORM | `/drizzle-team/drizzle-orm-docs` |
| Zod | `/colinhacks/zod` |
| Tailwind CSS | `/tailwindlabs/tailwindcss.com` |
| Auth.js | `/nextauthjs/next-auth` |

Verify with `ctx7 library "<name>"` if an ID fails to resolve.

## Workflow

1. **Resolve** — `ctx7 library "<name>"`
2. **Query** — `ctx7 docs <id> "<specific question>"`
3. **Compare** — does the returned snippet match what you were about to write?
4. **Adopt or adjust** — prefer the documented API over recalled API

## Anti-patterns

- ❌ Writing library code from memory when the major version is new
- ❌ Asking `ctx7 docs` without a specific question
- ❌ Assuming the first search result is the right library — check the
  benchmark score and snippet count
- ❌ Ignoring a returned snippet that contradicts your plan

## Proven example (this repo)

Error: `This build is using Turbopack, with a webpack config and no turbopack config`

```bash
ctx7 docs /vercel/next.js "Next.js 16 turbopack webpack config error"
```

Returned the exact fix — add `--webpack` to the build script:

```json
{ "scripts": { "build": "next build --webpack" } }
```

Memory alone would likely have produced a wrong or partial answer.
