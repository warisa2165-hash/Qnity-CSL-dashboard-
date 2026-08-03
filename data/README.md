# `data/` — edited project records

This directory is the portal's persistence layer when it runs without a
database (`DATA_SOURCE=mock`, the default).

## How it works

The built-in dataset in `src/lib/data/mock.ts` is the **baseline** and is never
modified. When an administrator saves a change through one of the edit forms,
the whole collection is written here as JSON:

| File                | Page                | Entity in `src/lib/records.ts` |
| ------------------- | ------------------- | ------------------------------ |
| `project.json`      | Project Information | `project` (a single record)    |
| `milestones.json`   | Milestone Dashboard | `milestones`                   |
| `risks.json`        | Risk Management     | `risks`                        |
| `actions.json`      | Action Tracker      | `actions`                      |
| `procurement.json`  | Procurement         | `procurement`                  |

From then on, `src/lib/data/index.ts` reads that file instead of the baseline
for that collection. Collections with no file here still come from the
baseline, so the switch happens one collection at a time.

Deleting a file — or using **Reset to baseline** in the Admin Panel — restores
the built-in data for that collection.

## Committing the files

These files are ordinary, diffable JSON and are meant to be committed. That is
what makes an edit made on a workstation part of the repository, reviewable in
a pull request, and deployable.

## Read-only hosts

On a host with a read-only application filesystem — Vercel is the common case —
the store falls back to the operating system's temporary directory. Saving
still works and the new values appear immediately, but they are lost when the
instance is recycled. The edit pages say so explicitly in that situation, and
the Admin Panel shows the active storage location. To keep changes
permanently, run the portal somewhere this directory is writable, or connect
PostgreSQL and set `DATA_SOURCE=prisma` — see docs/VERCEL-POSTGRES.md.

With `DATA_SOURCE=prisma` this directory is ignored entirely: the same edit
forms write rows to PostgreSQL, and nothing reads or writes these files.

## Editing by hand

Hand-editing a file here is supported: keep it as a JSON array (or a single
object for `project.json`) matching the shapes in `src/lib/types.ts`. A file
that cannot be parsed is ignored — the portal logs the error and falls back to
the baseline rather than failing to render.
