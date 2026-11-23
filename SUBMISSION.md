# Submission: Ajaia LLC Full Stack Product Engineer

Candidate: Jonathan Eduardo Muñoz Rodríguez

## Links

- **Live app:** _TBD_
- **Source code:** this folder (also on GitHub: https://github.com/LeonOmega2712/Ajaia-LLC-Full-Stack-Product-Engineer-Test)
- **Walkthrough video:** see `VIDEO_URL.txt`

## Included

| File / folder | Contents |
| --- | --- |
| `README.md` | Features, demo accounts, local setup, tests, deploy steps |
| `ARCHITECTURE.md` | Priorities, layering, decisions, tradeoffs, next steps |
| `AI_WORKFLOW.md` | AI tools used, what was changed or rejected, verification |
| `VIDEO_URL.txt` | Walkthrough video link |
| `src/`, `prisma/`, `tests/` | Source code, schema/migrations/seed, automated tests |

## Test accounts

No password. Pick one on the sign-in screen: `alice@ajaia.test` (owner of a seeded doc), `bob@ajaia.test` (editor on it), `carol@ajaia.test` (no docs; use to test Viewer access).

## Status

**Working end to end:** create, rename, rich-text editing, autosave, delete, .txt/.md import into a new document, sharing by email with Editor/Viewer roles and revoke, owned vs shared lists, persistence in Postgres, validation and error messages, 16 automated tests.

**Not included (deliberate):** real-time co-editing, comments, version history, export, real authentication, .docx import. Concurrent edits are last-write-wins.

**Next with 2 to 4 more hours:** conflict detection on save, version history, Markdown/PDF export, .docx import, Playwright E2E test in CI.
