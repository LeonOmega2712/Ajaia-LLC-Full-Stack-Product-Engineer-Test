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

### 8:10 PM · Deploy
- Production on Vercel + Neon: https://ajaia-docs-one-mauve.vercel.app
- `main` created from the feature branch; Vercel auto-deploys from `main`.
- Env vars set directly in Vercel (no Neon CLI): `DATABASE_URL` (pooled), `DATABASE_URL_UNPOOLED` (direct), `AUTH_SECRET`.
- `vercel-build` applied migrations and the seed on the first build.
- Turned off Vercel Authentication (deployment protection) so reviewers can open the URL without a Vercel account.
- Verified end to end on production: Alice creates and shares a document, Carol sees it under "Shared with me".

### 8:13 PM · Human intervention point: choosing stretch work by cost
- After confirming that every required feature was done (only `.docx` left out, which the brief lists as an optional example), Jonathan reviewed the optional stretch list and **decided to add stretch features chosen for their low implementation cost relative to how demonstrable they are**, rather than the most technically impressive ones.
- Options weighed: real-time presence and comments (high cost), version history (medium cost, more technical weight), export to Markdown/PDF (low cost, easy to show). Export was picked first; the same cost/value filter applies to any further additions.

### 8:15 PM · Stretch: export to Markdown and PDF
- **Markdown:** `turndown` converts the live editor HTML on the client, so unsaved keystrokes are included. Underline is kept as inline `<u>` because Markdown has no syntax for it; strikethrough becomes `~~text~~`. File name is derived from the title and sanitized (accents removed, unsafe characters stripped).
- **PDF:** `window.print()` with a print stylesheet that hides header, toolbar, share panel and buttons. **Tradeoff:** chose this over a PDF library (jsPDF/html2canvas) because it adds no dependency, keeps text selectable and lets the browser paginate; the cost is one click on "Save as PDF" in the print dialog.
- **Permissions:** export is available to every access level that can open the document, including viewers (reading already implies being able to copy the content).
- **Verification:** 3 new tests (all toolbar formats to Markdown, round-trip through the importer, file names), 19 total passing. Browser check as Carol (viewer): downloaded `Smoke-doc.md` with the expected content; print-media screenshot shows only title and content. Fixed a small misalignment of the title in print found in that screenshot.

### 8:18 PM · Human intervention: five improvements, CI first, orchestrated PRs
- Jonathan approved five low-cost improvements (CI, save conflict detection, version history, presence indicator, screenshots) and asked to **prioritize the non-feature enablers that benefit everything else, starting with CI**, because it proves the rest of the process works.
- 8:19 PM: he asked for an **orchestrator pattern**: each feature in its own branch and PR, with the orchestrator resolving conflicts, ordering the deliverables and managing merges. 8:20 PM: he asked that all his contributions be credited in this log.
- **Plan chosen by the orchestrator:** (1) CI, because it gates every later PR; (2) conflict detection and (3) version history in **one PR**, because both rewrite the same save path and share one migration; (4) presence built **in parallel by a sub-agent in an isolated git worktree**, since it only touches new files plus one line in the editor; (5) screenshots and docs last, once everything is integrated. All migrations additive so the production Neon database is never at risk.

### 8:19 PM · PR #1: CI ([#1](https://github.com/LeonOmega2712/Ajaia-LLC-Full-Stack-Product-Engineer-Test/pull/1))
- GitHub Actions: `npm ci`, ESLint, `tsc`, Vitest, `prisma migrate deploy` against a Postgres 16 service, seed run twice (proves idempotency, which the Vercel build relies on), `next build`.
- Green on first run; merged first.

### 8:20 PM · PR #2: save conflicts + version history ([#2](https://github.com/LeonOmega2712/Ajaia-LLC-Full-Stack-Product-Engineer-Test/pull/2))
- **Conflicts:** `Document.version` + `updatedBy`. `PATCH` requires `baseVersion`; the update is an atomic compare-and-set. Stale saves get 409 "Bob Collaborator changed this document after you loaded it", and the editor shows *Load their version* / *Keep mine (overwrite)*. Autosave pauses while the conflict is open.
- **Change forced by the feature:** title and content previously autosaved on two independent channels; with versions they would race against each other and cause false conflicts. Merged into one serialized channel with patch merging.
- **History:** `DocumentVersion` snapshots of the pre-edit state, at most one per 5 minutes while editing, plus one before every restore (restores are undoable). Panel with list, read-only preview (rendered through the editor schema, never raw HTML) and restore. Viewers can browse, only editors/owners restore.
- **Caught during verification:** the first browser run restored an empty document. The snapshot rule skipped only "untitled and empty" docs, so a renamed-but-empty doc produced a useless snapshot. Changed the rule to skip any empty body; re-verified.
- 6 new tests with an injected clock; two-browser Playwright run of the conflict, overwrite, history preview and restore.

### 8:20 PM · PR #3: who's viewing ([#3](https://github.com/LeonOmega2712/Ajaia-LLC-Full-Stack-Product-Engineer-Test/pull/3))
- Built by a sub-agent in its own worktree while #2 was in progress: `DocumentPresence` table, `PresenceService` reusing `DocumentService.get` for access checks, heartbeat API, `usePresence` polling every 10 s (paused in hidden tabs), avatar indicator.
- **Polling, not WebSockets:** Vercel functions are stateless; Postgres-backed polling shows collaboration intent without another service.
- **Integration by the orchestrator:** merged #2 into the presence branch, resolved the `schema.prisma` conflict (both added relations to `User` and `Document`), updated presence tests for the new `DocumentService` constructor, re-ran the full suite (29 tests), build and a two-browser check.
- The sub-agent avoided resetting the shared local database when migrations diverged and used a separate database instead.

### 8:28 PM · PR #4: screenshots and docs ([#4](https://github.com/LeonOmega2712/Ajaia-LLC-Full-Stack-Product-Engineer-Test/pull/4))
- Seven screenshots generated by a scripted browser run on a clean database (login, dashboard, editor + sharing, shared-with-me, viewer + presence, conflict banner, version history).
- README, ARCHITECTURE, SUBMISSION and AI_WORKFLOW updated; PR history linked as delivery evidence.

### 8:33 PM · Merges and production check
- Merge order executed as planned, each only after green CI: #1 (8:24), #2 (8:29), #3 (8:30), #4 (8:31). Vercel redeployed `main` after each merge and applied the two additive migrations to Neon.
- Production verified through the live API: save with `baseVersion` returns version 1, a stale save returns 409 naming the last editor, history lists the snapshot, presence heartbeat answers, and the temporary test document was deleted afterwards.

### 8:35 PM · GitGuardian alert on the CI workflow
- GitGuardian flagged `POSTGRES_PASSWORD: postgres` in `ci.yml` as a hardcoded secret. It was the password of the throwaway Postgres container that exists only during a CI run, so not a real credential; reported to Jonathan with a recommendation instead of acting alone.
- **Jonathan decided to remove it.** Fix: the CI service now uses `POSTGRES_HOST_AUTH_METHOD: trust` and a connection string without a password, so no credential lives in the repo and no repository secret is needed.

## Deliberately cut
- Real-time co-editing (CRDT). Concurrent saves are detected (409) and resolved by the user instead.
- Comments and suggestion mode.
- Real auth, sign-up, email notifications.
- `.docx` import, attachments.

## Jonathan's interventions

Every decision and direction that came from Jonathan (times America/Mexico_City):

| Time | Intervention |
| --- | --- |
| 7:47 PM | Provided the assignment and the 230-minute deadline; left stack choice open to the technical details in the brief. |
| 7:49 PM | **His idea to let the AI operate his GitHub directly** (asked about `gh` CLI access) so repository changes could be made and controlled from the session; then created the repository himself and connected it to the project (7:51 PM). |
| 7:52 PM | Asked what he could do in parallel that the AI could not (accounts, Drive folder, video tooling). |
| 7:53 PM | Chose **Vercel + Neon Postgres** for deployment. |
| 8:00 PM | Created the Neon account (Vercel account already existed). |
| 8:01 PM | Asked for this running walkthrough log of the work. |
| 8:04 PM | **His idea to use the GitHub, Vercel and Neon connectors** for a fast deployment and controlled changes to the repository: he added the Vercel, Neon and Google Drive connectors himself, which let the deploy (project creation, env vars, database) be done end to end without copying credentials by hand. |
| 8:05 PM | Approved creating `main` as production and using his Neon project. |
| 8:05 PM | Asked what parts of the assignment were still missing. |
| 8:06 PM | Approved the Vercel access request for the deployment. |
| 8:07 PM | Pushed back on redundant work: pointed out that the AI-usage notes were already captured in this log. |
| ~8:10 PM | Asked about login and test accounts; validated that the mocked login with seeded users satisfies the brief. |
| 8:12 PM | Approved merging the deploy docs to `main`; asked which required features were still pending. |
| 8:13 PM | Decided to add **stretch features chosen for low cost versus demonstrable value** (export first). |
| 8:16 PM | Approved merging export to production. |
| 8:18 PM | Approved all five improvements, **prioritizing enablers like CI** that prove the rest of the process. |
| 8:19 PM | Asked for the **orchestrator pattern with one PR per feature**, conflicts and merges managed by the orchestrator. |
| ~8:19 PM | Asked about parallelizing the work across agents. |
| 8:20 PM | Asked that all his contributions be credited in this log. |

## AI usage notes (for AI_WORKFLOW.md)
- Used Claude Code for scaffolding, implementation, tests, docs drafts and the scripted browser check.
- Human decisions: deploy target, scope cuts, stretch selection by cost/value, CI-first ordering, orchestrated PR flow (see "Jonathan's interventions").
- Orchestration: one session as orchestrator, one sub-agent in a parallel worktree; orchestrator resolved the schema merge conflict and merged PRs in order after green CI.
- Corrections: empty-snapshot rule in version history; two autosave channels racing on the version; sticky toolbar layout bug; rename permission rule; `vitest.config` renamed to `.mts` after an ESM warning; `@types/node` pinned to 22 after a peer-dependency conflict with Vitest.
- Verification: unit tests on the access rules, typecheck/lint/build, scripted browser run with screenshots reviewed.

## Suggested video script (3 to 5 min)
1. **(0:00 to 0:30) Intro.** What it is, the stack, the live URL. "I focused on one loop that works end to end instead of many shallow features."
2. **(0:30 to 2:00) Main flow as Alice.** Create a document, rename it, format (heading, bold, underline, list), point at "All changes saved", reload to show persistence. Import a `.md` file and show headings/lists preserved. Mention .txt/.md only, 1 MB limit.
3. **(2:00 to 3:00) Sharing.** Share with Carol as Viewer and Bob as Editor. (Optionally show Export .md and Export PDF here.) Show the presence avatars ("Alice is also here"). Open a second window as Carol: "Shared with me", view-only banner. As Bob: can edit. Remove Bob's access and show he gets "Document not available".
4. **(3:00 to 3:45) Implementation decisions.** Pure policy module + service layer + repository interface; 404 vs 403; HTML storage tradeoff; autosave with two channels; tests run without a DB.
4b. **Conflict + history (30 s).** Edit as Bob, then as Alice without reloading: show the conflict banner, keep mine, open Version history, preview and restore.
5. **(3:45 to 4:15) Deprioritized.** Real-time co-editing (CRDT), comments, real auth, .docx. Mention the stretch choice: after the core was done, extras were picked by low cost versus demonstrable value. What comes next: E2E tests in CI, version diff, Yjs if collaboration becomes core.
6. **(4:15 to 5:00) AI workflow.** What Claude Code sped up, what you decided yourself (deploy target, cost/value stretch selection, CI first, orchestrated PRs), the orchestrator + parallel sub-agent flow with the PR history as evidence, bugs caught by verification (toolbar layout, empty snapshot), how you verified (CI, tests, browser runs).
