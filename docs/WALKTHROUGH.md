# Build walkthrough (running log)

Running log of how this project was built, kept up to date during development. Source material for the walkthrough video and `AI_WORKFLOW.md`. Times are America/Mexico_City, 2026-11-22.

## Timeline

### 7:47 PM · Start, reading the brief
- Read the assignment. Time budget: about 230 min, so the plan was core in ~2.5 h and the rest for deploy, docs and video.
- Scope framing: the evaluation is about judgment, so the goal is one coherent loop (create, edit, save, share, open as someone else) that works end to end, rather than many shallow features.

### 7:52 PM · Stack and deploy target
- **Stack:** Next.js 15 (App Router, TypeScript), TipTap v3 for rich text, Prisma 6 + Postgres, Zod for validation, Vitest for tests.
- **Why:** one deployable for UI + API; TipTap covers every required format out of the box; Postgres fits owner/share relations.
- **Deploy decision (mine):** Vercel + Neon Postgres. Free for reviewers, stable URL, no cold starts like Render's free tier. Rejected Render because its free DB expires after 30 days.

### 7:54 PM · Data model
- `User`, `Document` (title, content as HTML, owner), `DocumentShare` (document, user, role `EDITOR | VIEWER`, unique per pair).
- **Tradeoff:** content stored as editor-generated HTML instead of TipTap JSON. Simpler to import into and export from; the editor re-parses through its schema on load, so unknown tags/scripts are dropped. JSON would be better for diffing or CRDT collaboration, which is out of scope.

### 7:55 PM · Architecture
- Pure access policy (`src/lib/access/policy.ts`): `OWNER`, `EDITOR`, `VIEWER`, `NONE`.
- `DocumentService` holds all use cases and permission checks; depends on a `DocumentRepository` interface (dependency inversion). Prisma adapter is wired in exactly one place.
- Domain errors carry HTTP status; one `withErrors` wrapper converts them to JSON in every route (no repeated try/catch).
- **Decision:** documents you cannot access return 404, not 403, so ids can't be probed.
- **Decision (changed during build):** first draft allowed only owners to rename. Changed so editors can rename too (closer to how Docs behaves); only owners delete or manage sharing.

### 7:56 PM · Auth
- Mocked login: pick a seeded account, no password. Session cookie is `userId.HMAC(secret)` so it can't be edited by hand to impersonate someone.
- Seed users: Alice (owner of a welcome doc), Bob (editor on it), Carol (no docs, for testing Viewer).

### 7:57 PM · UI
- Dashboard with "My documents" and "Shared with me", access badge per item.
- Editor page: title input, toolbar (P, H1 to H3, B, I, U, S, bullet/numbered lists, quote, undo/redo), share panel, delete for owners.
- Toolbar is a declarative list of buttons (adding a format is one entry).
- **Autosave:** debounced hook reused for title and content as two independent channels, so a rename never races a content save. Status: Unsaved, Saving, All changes saved, or error with Retry. Warns before closing with unsaved changes.
- Viewers get a read-only editor and a banner explaining who to ask.

### 7:57 PM · File import
- `.txt` and `.md` (max 1 MB) become a new document. Title comes from the filename.
- Markdown converted with `marked`; raw HTML in markdown is escaped. Plain text: blank lines become paragraphs.
- **Cut:** `.docx` (needs a heavier converter, low demo value for the time).

### 7:57 PM · Tests
- 16 Vitest tests, no database needed (in-memory repository implementing the same interface):
  - policy matrix for each access level;
  - service flow: owned vs shared lists, editor can edit but not share/delete, viewer is read-only, revoke removes access, 404 for non-shared, invalid share targets, re-sharing updates the role instead of duplicating;
  - import: escaping, markdown conversion, validation errors.

### 7:58 PM · Verification and a bug caught
- `tsc`, ESLint and `next build` clean.
- Headless browser smoke test (Playwright) of the full flow: create doc, type with bold, autosave, share with Carol as viewer, invalid email error, reload keeps formatting, import a `.md`, sign in as Carol (sees it under "Shared with me", read-only editor, API returns 403), Bob without access gets 404.
- **AI output corrected:** the screenshot showed the toolbar floating over the text and the content invisible. Cause: the editor card had `overflow-hidden` plus a sticky toolbar, which made the card the scroll container. Removed `overflow-hidden`, re-ran the smoke test, confirmed visually.

### 8:00 PM · Docs and push
- README (setup, demo accounts, deploy), ARCHITECTURE.md, AI_WORKFLOW.md (draft for Jonathan to edit), SUBMISSION.md.
- `vercel-build` script runs `prisma migrate deploy` + idempotent seed before `next build`, so the deploy needs only env vars.
- Neon pooled URL for runtime, direct URL (`DATABASE_URL_UNPOOLED`) for migrations.
- Pushed to branch `claude/project-thread-u2bufc`.
- **Decision:** skipped the Neon CLI setup (needs browser login, adds a tool) and configure connection strings directly in Vercel.

## Deliberately cut
- Real-time co-editing and presence (biggest jump in complexity). Concurrent saves are last-write-wins.
- Comments, version history, export.
- Real auth, sign-up, email notifications.
- `.docx` import, attachments.

## AI usage notes (for AI_WORKFLOW.md)
- Used Claude Code for scaffolding, implementation, tests, docs drafts and the scripted browser check.
- Human decisions: deploy target, scope cuts, role model, rename permission.
- Corrections: sticky toolbar layout bug; rename permission rule; `vitest.config` renamed to `.mts` after an ESM warning; `@types/node` pinned to 22 after a peer-dependency conflict with Vitest.
- Verification: unit tests on the access rules, typecheck/lint/build, scripted browser run with screenshots reviewed.

## Suggested video script (3 to 5 min)
1. **(0:00 to 0:30) Intro.** What it is, the stack, the live URL. "I focused on one loop that works end to end instead of many shallow features."
2. **(0:30 to 2:00) Main flow as Alice.** Create a document, rename it, format (heading, bold, underline, list), point at "All changes saved", reload to show persistence. Import a `.md` file and show headings/lists preserved. Mention .txt/.md only, 1 MB limit.
3. **(2:00 to 3:00) Sharing.** Share with Carol as Viewer and Bob as Editor. Open a second window as Carol: "Shared with me", view-only banner. As Bob: can edit. Remove Bob's access and show he gets "Document not available".
4. **(3:00 to 3:45) Implementation decisions.** Pure policy module + service layer + repository interface; 404 vs 403; HTML storage tradeoff; autosave with two channels; tests run without a DB.
5. **(3:45 to 4:15) Deprioritized.** Real-time collaboration, comments, history, real auth, .docx. What comes next: conflict detection, version history, export.
6. **(4:15 to 5:00) AI workflow.** What Claude Code sped up, what you decided yourself, the layout bug caught from a screenshot, how you verified (tests, build, browser run).
