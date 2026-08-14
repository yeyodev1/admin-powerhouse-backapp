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

## Assessment Module (Cuestionario PHB)

- `Assessment` (`src/models/assessment.model.ts`) stores the public funnel questionnaire. Identity is `email` (upsert); `publicId` is a 10-char slug used only for the public report URL.
- `POST /api/assessments/sync` is **public and cumulative**: it merges the incoming `answers` map into the stored one and never replaces it. The funnel calls it on every answer (debounced). Partial payloads are normal.
- The question catalog (text, interpretation, biomarkers) is owned by the funnel and snapshotted on the document. The funnel sends it on the first sync and on completion only — it is ~40 KB.
- Scoring: each answer is 0–3. Section and global percent thresholds map to `optimo` (<25), `vigilancia` (<50), `alerta` (<75), `prioritario` (>=75).
- `cleanStringForGhl` / `getQuestionGhlKey` in `assessment.service.ts` are an intentional byte-for-byte duplicate of the funnel's versions. They strip accents rather than transliterating them, because the GHL custom fields were created from that exact output. Changing either copy alone silently disconnects CRM fields.
- **The CRM webhook fires server-side, exactly once**, when `answeredCount >= totalQuestions`, guarded by `webhookFired`. `GHL_ASSESSMENT_WEBHOOK` holds the URL; the payload carries `reporte_url` as the template variable. Failures are logged, never thrown — `POST /api/assessments/:publicId/resend-webhook` (auth) is the manual retry.
- `GET /r/:publicId` is a server-rendered public HTML report mounted **outside** `/api` (it gets shared over WhatsApp). It returns a branded 404 page instead of JSON when the id is unknown.
- Do not run a completion sync against the production `DB_URI` with the real `GHL_ASSESSMENT_WEBHOOK` set: it creates a live CRM contact. Point the env var at a local receiver when testing.

## Study Module (Estudios IA del cuestionario)

- A `Study` is the AI write-up of a completed `Assessment`. It is enqueued automatically inside `syncAssessment` the moment the questionnaire hits 100%, right after the CRM webhook.
- **Studies accumulate, they never overwrite.** Each generation is a new document with an incremented `version` for the same assessment.
- The prompt lives in `src/services/studyPrompt.ts` and is deliberately separate from `ai.service.ts`, which is hardwired to CKD/transplant. The study prompt works from self-reported symptoms only, so it is instructed not to diagnose, stage, or prescribe — it orients which biomarkers to measure. Do not loosen those guardrails.
- **Background work is a Mongo queue, not a floating promise.** On Vercel the function freezes once it responds, so `void run()` would never finish. `enqueueStudy` only writes the doc; `kickQueue()` fires a self-directed HTTP call to `POST /api/studies/run-queue`, which starts a fresh invocation. The panel can also drain the queue by hand.
- `runQueue` processes 2 at a time by default to stay inside the function timeout. Claude takes ~90 s per study.
- Edits never touch `content`: the advisor's text goes to `editedContent`, and `finalContent` (a virtual) prefers it. That keeps the original AI output auditable.
- `GET /e/:publicId` is the public study page. While the study is not ready it self-refreshes every 12 s instead of 404ing.
- Access is `staffMiddleware` (`admin` + `advisor`), not `adminMiddleware`. Advisors read, edit and send studies; user management stays admin-only.
- `POST /api/studies/:publicId/send-whatsapp` fires the GHL webhook with `estudio_url`. GHL sends the actual WhatsApp. Every attempt is appended to `deliveries` whether it succeeded or not. Point `GHL_STUDY_WEBHOOK` at a local receiver when testing, or a real patient gets messaged.
- `marked` renders the study Markdown. The source is HTML-escaped before parsing, so raw HTML in the editor is inert by design.

## Environment and Unsafe Utilities

- `.env` is loaded by `src/index.ts`. Required core values are `DB_URI` and `JWT_SECRET`; AI endpoints additionally need `OPENAI_API_KEY` and `ANTHROPIC_API_KEY`; GHL endpoints use `GHL_TOKEN` and `GHL_LOCATION_ID`. `PORT` and `SLACK_ERROR_WEBHOOK` are optional. The assessment module adds `GHL_ASSESSMENT_WEBHOOK`, `PUBLIC_REPORT_BASE_URL` (used to build `reporte_url`) and `PUBLIC_BOOKING_URL`; all three have hard-coded production defaults. The study module adds `STUDY_AI_MODEL`, `GHL_STUDY_WEBHOOK` and `QUEUE_TOKEN`.
- **`JWT_SECRET` is not set in the local `.env`**, so `auth.middleware.ts` falls back to the literal `"default-secret-change-me"`. Anyone who knows that string can mint an admin token. Verify it is set in the Vercel environment before treating any auth check as real, and set it locally too. `.env.example` does not currently list all provider keys.
- Some GHL service and root diagnostic files contain live-looking fallback credentials and identifiers. Treat them as secrets: never expose them in output, add new hard-coded credentials, or execute those probes without explicit intent.
- `src/seed.ts` creates a fixed admin account, and `scripts/cleanup-duplicates.ts` deletes duplicate person records from the configured database. Neither is a package script; inspect the target `DB_URI` and obtain explicit approval before running either utility.
