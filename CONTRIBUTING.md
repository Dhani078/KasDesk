# Contributing
Never commit secrets or production data. Run `npm ci`, `npm run typecheck`, `npm run lint`, and `npm run test:unit`. Scope every database query by authenticated user ID, use transactional conditional debits, add regression tests, and never modify an applied migration.
