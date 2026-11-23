# Code map

One line per main file, grouped by layer. Request flow: UI → API route → service → policy → repository → Postgres.

## Domain and use cases

| File | Responsibility |
| --- | --- |
| `src/lib/access/policy.ts` | Pure access rules: owner / editor / viewer / none, and what each can do. |
| `src/lib/documents/service.ts` | Document use cases: list, create, edit with conflict check, history, restore, share, delete. |
| `src/lib/documents/types.ts` | Domain types and the repository / unit-of-work ports the service depends on. |
| `src/lib/documents/validation.ts` | Input schemas (zod) and limits: title 200 chars, content 1 MB. |
| `src/lib/presence/service.ts` | Who is viewing: heartbeat and 30 s activity window. |
| `src/lib/errors.ts` | Domain errors with their HTTP status (400, 401, 403, 404, 409). |

## Persistence

| File | Responsibility |
| --- | --- |
| `prisma/schema.prisma` | Data model: User, Document (version), DocumentShare, DocumentVersion, DocumentPresence. |
| `src/lib/documents/prismaRepository.ts` | Prisma adapter: compare-and-set save, transactions, row-to-domain mapping. |
| `src/lib/presence/prismaRepository.ts` | Prisma adapter for presence heartbeats. |
| `src/lib/documents/index.ts`, `src/lib/presence/index.ts` | Composition roots: wire services to Prisma. |
| `src/lib/db.ts` | Single Prisma client. |
| `prisma/seed.ts` | Demo users and a sample shared document. |

## HTTP and auth

| File | Responsibility |
| --- | --- |
| `src/lib/http/handler.ts` | `withErrors`: domain error → JSON `{ error, details? }`; strict JSON body parsing. |
| `src/app/api/documents/**/route.ts` | Thin route handlers: auth, parse, call the service, return JSON. |
| `src/app/api/auth/*/route.ts` | Mock login / logout. |
| `src/lib/auth/session.ts` | Current user from the cookie; redirect to login with return path. |
| `src/lib/auth/token.ts` | Signs and verifies the session cookie (HMAC, constant-time compare). |
| `src/lib/auth/nextPath.ts` | Safe post-login redirect (same-origin paths only). |

## UI

| File | Responsibility |
| --- | --- |
| `src/app/page.tsx` | Dashboard: my documents and shared with me. |
| `src/app/documents/[id]/page.tsx` | Loads a document server-side and renders the editor (404 if no access). |
| `src/components/editor/DocumentEditor.tsx` | Editor screen: TipTap, autosave, conflicts, restore, delete, layout. |
| `src/lib/useAutosave.ts` | One serialized, debounced save queue (merge, hold, flush, discard). |
| `src/components/editor/ConflictBanner.tsx` | Conflict choice: keep mine or load latest. |
| `src/components/editor/VersionHistory.tsx` | History list, preview and restore. |
| `src/components/editor/SharePanel.tsx` | Share by email, change role, revoke. |
| `src/components/editor/Toolbar.tsx` | Formatting buttons and shortcut labels. |
| `src/components/editor/ExportMenu.tsx` | Export to Markdown and PDF (print). |
| `src/lib/usePresence.ts`, `PresenceIndicator.tsx` | Presence polling every 10 s and avatars. |
| `src/lib/apiClient.ts` | Browser fetch helper; errors become `ApiError` with status and body. |

## Import / export

| File | Responsibility |
| --- | --- |
| `src/lib/import/fileImport.ts` | .txt / .md upload → escaped HTML, with type and size checks. |
| `src/lib/export/markdown.ts` | Editor HTML → clean Markdown. |

## Tests and CI

| File | Responsibility |
| --- | --- |
| `tests/inMemoryRepository.ts` | In-memory ports (with rollback) so the service is tested without a database. |
| `tests/*.test.ts` | Policy, service, versioning, presence, import/export, QA regressions, audit fixes. |
| `.github/workflows/ci.yml` | Lint, type check, tests and build against Postgres 16 on every push. |
