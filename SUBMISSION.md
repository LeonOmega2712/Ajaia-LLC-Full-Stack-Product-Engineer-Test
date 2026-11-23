# Submission: Ajaia LLC Full Stack Product Engineer

Candidate: Jonathan Eduardo Muñoz Rodríguez

## Links

- **Live app:** https://ajaia-docs-one-mauve.vercel.app
- **Source code:** this folder (also on GitHub: https://github.com/LeonOmega2712/Ajaia-LLC-Full-Stack-Product-Engineer-Test)
- **Walkthrough video:** https://youtu.be/Gjpw6UUDMgE (also in `VIDEO_URL.txt`)
- **Google Drive folder:** https://drive.google.com/drive/folders/1sxM3pjRMRnNX_aE-XzLRNhT-Eu-VSspD

## Included

| File / folder | Contents |
| --- | --- |
| `README.md` | Features, demo accounts, local setup, tests, deploy steps |
| `ARCHITECTURE.md` | Priorities, layering, decisions, tradeoffs, next steps |
| `AI_WORKFLOW.md` | AI tools used, what was changed or rejected, verification |
| `VIDEO_URL.txt` | Walkthrough video link |
| `docs/WALKTHROUGH.md` | Timestamped build log, Jonathan's interventions, video script |
| `docs/CODE_MAP.md` | One-line responsibility of each main file, by layer |
| `docs/screenshots/` | Screenshots of every main flow |
| `docs/qa/QA-prod-2026-11-22.md` | Manual end-to-end QA report on production (pass/fail + bugs, all fixed) |
| `.github/workflows/ci.yml` | CI pipeline |
| `source-code.zip` (Drive) / repo root | Full source code from `main` |
| `src/`, `prisma/`, `tests/` | Source code, schema/migrations/seed, automated tests |

## Test accounts

No password. Pick one on the sign-in screen: `alice@ajaia.test` (owner of a seeded doc), `bob@ajaia.test` (editor on it), `carol@ajaia.test` (no docs; use to test Viewer access).

## Status

**Working end to end:** create, rename, rich-text editing, autosave, delete, .txt/.md import into a new document, sharing by email with Editor/Viewer roles and revoke, owned vs shared lists, persistence in Postgres, validation and error messages, export to Markdown and PDF, save conflict detection, version history with preview/restore, who-is-viewing indicator, CI on every push, 39 automated tests.

**Not included (deliberate):** real-time co-editing (concurrent saves are detected and resolved by the user instead), comments/suggestions, real authentication, .docx import.

**Next with 2 to 4 more hours:** Playwright E2E tests in CI, visual diff between versions, .docx import, Yjs real-time co-editing if collaboration becomes core.

## Pull request history

Improvements after the first deploy were each delivered as a PR gated on CI and merged in a planned order: [#1 CI](https://github.com/LeonOmega2712/Ajaia-LLC-Full-Stack-Product-Engineer-Test/pull/1), [#2 save conflicts + version history](https://github.com/LeonOmega2712/Ajaia-LLC-Full-Stack-Product-Engineer-Test/pull/2), [#3 presence](https://github.com/LeonOmega2712/Ajaia-LLC-Full-Stack-Product-Engineer-Test/pull/3), [#4 docs + screenshots](https://github.com/LeonOmega2712/Ajaia-LLC-Full-Stack-Product-Engineer-Test/pull/4). The full build log, including every decision Jonathan made, is in `docs/WALKTHROUGH.md`.
