# AI workflow note

## Tools used

- **Claude Code** in a project setup: one coordinator session plus a thread per piece of work (build and PR orchestration, deploy, real-browser QA on production, submission packaging). One sub-agent built a feature in parallel in its own git worktree.
- **Connectors** I added myself: GitHub, Vercel, Neon and Google Drive. They let the AI create the repo changes, the Vercel project, the env vars and the database without me copying credentials by hand.
- **My local Claude** (no access to the build session) as an independent SOLID and good-practices auditor.

The stack (Next.js, TipTap, Prisma, Postgres) was proposed by the AI from the brief; I accepted it and chose the deploy target (Vercel + Neon).

## Where AI materially sped things up

- Scaffolding and the core loop (editor, autosave, import, sharing, access rules, tests) in minutes instead of hours.
- Deploy end to end through the connectors: Vercel project, Neon database, env vars and migrations, with no secrets pasted into chat or the repo.
- Parallel delivery: an orchestrator session opened one PR per feature, resolved the `schema.prisma` merge conflict, waited for green CI and merged in a planned order ([PR history](https://github.com/LeonOmega2712/Ajaia-LLC-Full-Stack-Product-Engineer-Test/pulls?q=is%3Apr)).
- Manual QA on production driven by an agent in a real browser, with a pass/fail report (`docs/qa/QA-prod-2026-11-22.md`).
- Docs and a timestamped build log (`docs/WALKTHROUGH.md`) kept up to date as the work happened.

## What I changed or rejected

- **Process:** I asked for one PR per feature with CI gating every merge, and approved CI as the first PR because it proves everything after it. I accepted the orchestrator's proposal to ship conflict detection and version history in one PR, since both rewrite the same save path and share one migration.
- **Stretch scope:** I picked extras by low cost versus demonstrable value (export, conflicts + history, presence) and kept real-time co-editing, comments and `.docx` out.
- **Security:** GitGuardian flagged the throwaway Postgres password in the CI workflow. The AI said it was not a real credential; I still chose to remove it (CI now uses trust auth) instead of adding a repository secret.
- **Audit triage:** from my local Claude's audit I applied the transaction around snapshot + write, the `{ error, details }` error shape, delete feedback and a generic message when sharing with an unknown email. I deferred the pure refactors (extracting the editor sync hook, sharing limits with the UI) because they added risk right before delivery.
- **Corrections to AI output:** the first draft let only owners rename (changed so editors can rename too); a sticky toolbar inside an `overflow-hidden` card covered the text; the snapshot rule produced empty history entries; a generated submission draft said the seed shared the demo doc with Carol, but it only shares it with Bob. All caught in review or verification and fixed.

## How correctness was verified

- CI (lint, typecheck, tests, build) on every PR; 39 automated tests covering access rules, the document service, versioning and save conflicts. Tests run against an in-memory repository, so they need no database.
- Concurrency checked against Postgres: 5 parallel saves on the same base version give 1 × 200, 4 × 409 and exactly one history snapshot.
- Manual QA on production found a data-loss bug the tests did not cover: "Keep mine" overwrote the other user's edit without saving it to history. Fixed with a regression test.
- I reviewed the code myself file by file using `docs/CODE_MAP.md`, which I asked for as part of that review.
