# Repository Instructions

## Toolchain and Checks

- This is one Node/TypeScript package, compiled as strict CommonJS from `src/` to `dist/`.
- The manifest pins `pnpm@9.15.4` and `.npmrc` requires the hoisted linker, although the committed lockfile is `package-lock.json`. Do not silently change package managers or regenerate the lockfile unless dependency work requires an explicit choice.
- Use `pnpm dev` for local development. It runs `src/index.ts` through `ts-node-dev` without type-checking.
- Use `pnpm build` as the required verification; it runs strict `tsc` and emits `dist/`. Use `pnpm exec tsc --noEmit` when emission is undesirable.
- `pnpm start` runs `dist/index.js`, so build first. `pnpm compile` is the watch-mode compiler.
- There is no automated test runner, lint config, or CI workflow. Root `test-*.js` files are live GoHighLevel API probes, not a test suite; do not run them as routine verification.
- `pnpm format` references Prettier, but Prettier is not declared in this package. Do not assume formatting is available without addressing that dependency explicitly.

## Runtime Wiring

- `src/index.ts` is both the local bootstrap and Vercel entrypoint. It listens on `PORT` only when neither `NODE_ENV=production` nor `VERCEL` is set; Vercel imports its default Express app through `vercel.json`.
- `createApp()` installs database connection middleware before all routes, including `GET /`; even the health response needs a usable `DB_URI`.
- API routes are mounted under `/api`: auth at `/api/auth`, users and persons directly under `/api`, and GoHighLevel at `/api/ghl`. Register new endpoints through `src/routes/index.ts`.
- Person file uploads are JSON (`url`, `filename`, `type`), not multipart uploads. The app accepts JSON bodies up to 50 MB, and medical-file metadata plus AI analysis history are embedded in the `Person` MongoDB document.
- AI analysis is a two-provider flow in `src/services/ai.service.ts`: OpenAI produces the clinical analysis, then Anthropic produces the report. These external requests have five-minute client timeouts; local HTTP requests have a ten-minute server timeout.

## Environment and Unsafe Utilities

- `.env` is loaded by `src/index.ts`. Required core values are `DB_URI` and `JWT_SECRET`; AI endpoints additionally need `OPENAI_API_KEY` and `ANTHROPIC_API_KEY`; GHL endpoints use `GHL_TOKEN` and `GHL_LOCATION_ID`. `PORT` and `SLACK_ERROR_WEBHOOK` are optional. `.env.example` does not currently list all provider keys.
- Some GHL service and root diagnostic files contain live-looking fallback credentials and identifiers. Treat them as secrets: never expose them in output, add new hard-coded credentials, or execute those probes without explicit intent.
- `src/seed.ts` creates a fixed admin account, and `scripts/cleanup-duplicates.ts` deletes duplicate person records from the configured database. Neither is a package script; inspect the target `DB_URI` and obtain explicit approval before running either utility.
