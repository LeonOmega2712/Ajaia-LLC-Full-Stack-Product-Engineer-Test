# AI workflow note

> Draft: to be reviewed and edited by Jonathan before submission.

## Tools used

- **Claude Code** (agentic coding assistant) for scaffolding, implementation, tests, and first drafts of documentation.

## Where AI materially sped things up

- Scaffolding the Next.js + Prisma + TipTap project and the boilerplate around it (route handlers, Prisma schema, seed script).
- Writing the in-memory repository and test cases for the access-control rules.
- Drafting README and architecture notes from the actual code.
- Running a headless browser smoke test of the full flow (create, format, autosave, share, view-only enforcement, import) and checking screenshots.

## What I changed or rejected

- _[Edit with your own examples.]_ Example: the first version of the editor card used `overflow-hidden` together with a sticky toolbar, which pushed the toolbar down over the text. Caught from a screenshot during the smoke test and fixed.
- Kept the scope cuts explicit (no real-time collaboration, no .docx) rather than accepting broader generated features.
- Decided that editors may rename documents but only owners may share or delete.

## How correctness was verified

- Access rules are isolated in a pure module and covered by unit tests; the service is tested against an in-memory repository for the full sharing flow.
- Type checking (`tsc`), ESLint and a production build on every iteration.
- Manual and scripted browser checks: formatting survives reload, a viewer gets a read-only editor and a 403 from the API, a non-shared user gets a 404.
- _[Add your own manual review notes here.]_
