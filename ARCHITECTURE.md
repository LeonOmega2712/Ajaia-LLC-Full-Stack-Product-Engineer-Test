# Architecture notes

## What I prioritized

The assignment rewards a coherent slice over breadth, so I focused on the loop a reviewer will actually exercise: **sign in, create or import, write with formatting, see it saved, share it, open it as someone else and see the right permissions.** Each of those works end to end against a real database.

1. **Editing experience.** TipTap (ProseMirror) gives a solid rich-text core without building an editor. Autosave with an explicit status indicator was prioritized over a manual Save button because losing work is the worst failure for a docs product.
2. **Access control correctness.** Sharing is where bugs would be most damaging, so the rules live in one small pure module (`src/lib/access/policy.ts`) and are enforced in a single service layer that every API route and page goes through. This is the most heavily tested area.
3. **Deployability.** Next.js + Postgres on Vercel/Neon is free for reviewers and deploys from the repo with migrations and seed data applied automatically.

## Stack

| Concern | Choice | Why |
| --- | --- | --- |
| App | Next.js 15 (App Router, TypeScript) | One deployable for UI and API; server components read data directly through the service. |
| Editor | TipTap v3 (StarterKit) | Mature, schema-based; covers all required formats out of the box. |
| Data | Postgres + Prisma | Relational fits owner/share relations; Prisma gives typed queries and migrations. |
| Validation | Zod | Same schemas validate all API input; errors are returned as readable messages. |
| Tests | Vitest | Fast, no DB required thanks to the repository abstraction. |

## Layering

```
Route handlers / Server components   (HTTP, cookies, redirects)
        │
DocumentService                      (use cases + permission checks)
        │            │
access/policy.ts   DocumentRepository (port)
                     │
                   Prisma adapter
```

- **Single responsibility:** routes only parse input and map errors; the service holds business rules; the repository only persists.
- **Dependency inversion:** `DocumentService` depends on repository interfaces. `src/lib/documents/index.ts` is the only place it is wired to Prisma; tests wire it to an in-memory implementation.
- **Consistent errors:** domain errors (`ValidationError`, `ForbiddenError`, `NotFoundError`, ...) carry their HTTP status and one wrapper (`withErrors`) turns them into JSON responses.

## Key decisions and tradeoffs

- **Content stored as HTML.** TipTap's `getHTML()` is stored as a string. It is simple to import into (the file importer outputs HTML) and to export later. The editor parses HTML through its schema on load, which drops unknown tags and scripts. A JSON document model would be better for diffing or real-time collaboration; not needed at this scope.
- **Roles: Owner, Editor, Viewer.** Owners delete and manage sharing; editors edit content and title; viewers read only. This went slightly beyond the minimum because it was cheap once the policy module existed and makes the sharing demo more meaningful.
- **Non-shared documents return 404, not 403,** so document ids cannot be probed.
- **Mocked auth with a signed cookie.** No passwords; the cookie holds the user id with an HMAC so it cannot be trivially edited to impersonate another user. Not production auth (no expiry rotation, no CSRF token beyond SameSite=Lax).
- **Last write wins.** Two editors on the same document at the same time will overwrite each other's saves. Real-time collaboration (Yjs/CRDT) was deliberately cut; it is the biggest jump in complexity.
- **Upload scope: .txt and .md into a new document.** Both convert cleanly to the editor's formats. Raw HTML in markdown is escaped. `.docx` was cut because it needs a heavier converter for marginal demo value.
- **Export (stretch):** Markdown is generated client-side from the live editor with `turndown` (underline has no Markdown syntax, so it is kept as inline `<u>`). PDF uses `window.print()` plus a print stylesheet instead of a PDF library: zero extra dependencies, selectable text, and the browser handles pagination. The cost is one extra click in the print dialog ("Save as PDF").
- **Title and content autosave independently** (two debounced channels), so a rename never races with a content save.

## Intentionally deprioritized

- Real-time co-editing and presence indicators
- Comments, suggestions, version history
- Real authentication, user sign-up, email notifications on share
- Pagination/search on the document list
- `.docx` import and attachments

## Next 2 to 4 hours

1. Optimistic concurrency: send `updatedAt` with saves and warn on conflicts instead of silently overwriting.
2. Version history (snapshot on save every N minutes) with restore.
3. `.docx` import via `mammoth`.
4. Playwright end-to-end test of the share flow in CI.
