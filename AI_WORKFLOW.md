# AI workflow note

> Draft: to be reviewed and edited by Jonathan before submission.

## Tools used

- **Claude Code** (agentic coding assistant) for scaffolding, implementation, tests, and first drafts of documentation.

## Where AI materially sped things up

- Scaffolding the Next.js + Prisma + TipTap project and the boilerplate around it (route handlers, Prisma schema, seed script).
- Writing the in-memory repository and test cases for the access-control rules.
- Drafting README and architecture notes from the actual code.
- Running a headless browser smoke test of the full flow (create, format, autosave, share, view-only enforcement, import) and checking screenshots.

- Orchestrating parallel work: one AI session acted as orchestrator while a sub-agent built the presence feature in its own git worktree. The orchestrator opened one PR per feature, resolved the merge conflict in `schema.prisma`, waited for green CI and merged in a planned order.
- **Second AI as independent auditor.** After the build I had a separate AI (my local Claude, with no access to the build session) audit the code for SOLID and good practices. I then prioritized its findings by value versus risk: the transaction around save + snapshot, the error body shape, delete feedback and a generic share message went in; pure refactors (extracting a sync hook, sharing limits with the UI) were deferred so nothing risky landed right before recording.

## What I changed or rejected

- _[Edit with your own examples.]_ Example: the first version of the editor card used `overflow-hidden` together with a sticky toolbar, which pushed the toolbar down over the text. Caught from a screenshot during the smoke test and fixed.
- Kept the scope cuts explicit (no real-time collaboration, no .docx) rather than accepting broader generated features.
- Decided that editors may rename documents but only owners may share or delete.

## How correctness was verified

- Access rules are isolated in a pure module and covered by unit tests; the service is tested against an in-memory repository for the full sharing flow.
- Type checking (`tsc`), ESLint and a production build on every iteration.
- Manual and scripted browser checks: formatting survives reload, a viewer gets a read-only editor and a 403 from the API, a non-shared user gets a 404.
- _[Add your own manual review notes here.]_
