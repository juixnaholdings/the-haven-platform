# Stitch Design Bundle

This directory is the Stitch design source of truth for frontend implementation work in The Haven.

Primary visual direction:

- refined clerical minimalism

Use this folder when implementing or refining frontend screens. Prefer these assets over inventing new layouts when a matching screen already exists.

## Folder Structure

- [00_foundations/auth](c:/Developmentships/the-haven/docs/design/stitch/00_foundations/auth)
  Login and authentication entry screens.
- [00_foundations/shell](c:/Developmentships/the-haven/docs/design/stitch/00_foundations/shell)
  Reserved for shell-level references. The current bundle did not include a clean standalone shell-only screenshot, so shell direction is inferred mainly from the dashboard layouts.
- [00_foundations/states](c:/Developmentships/the-haven/docs/design/stitch/00_foundations/states)
  Loading, empty, error, and state-gallery references.
- [01_dashboard](c:/Developmentships/the-haven/docs/design/stitch/01_dashboard)
  Dashboard and overall application-home references.
- [02_members](c:/Developmentships/the-haven/docs/design/stitch/02_members)
  Member directory, detail, and create/edit form references.
- [03_households](c:/Developmentships/the-haven/docs/design/stitch/03_households)
  Household management and household detail references.
- [04_groups](c:/Developmentships/the-haven/docs/design/stitch/04_groups)
  Groups and ministry detail references.
- [05_events](c:/Developmentships/the-haven/docs/design/stitch/05_events)
  Service and event management references.
- [06_attendance](c:/Developmentships/the-haven/docs/design/stitch/06_attendance)
  Attendance overview and event attendance recording references.
- [07_finance](c:/Developmentships/the-haven/docs/design/stitch/07_finance)
  Ledger, finance entry, transfer, and transaction detail references.
- [08_reports](c:/Developmentships/the-haven/docs/design/stitch/08_reports)
  Reporting dashboard references.
- [09_settings](c:/Developmentships/the-haven/docs/design/stitch/09_settings)
  Settings, roles, and staff-user references.
- [source-html](c:/Developmentships/the-haven/docs/design/stitch/source-html)
  Raw Stitch HTML exports, supporting markdown, and ambiguous source bundle artifacts.

## Route Mapping

- `00_foundations/auth` -> `/login`
- `01_dashboard` -> `/dashboard`
- `02_members` -> `/members`, `/members/new`, `/members/:memberId`, `/members/:memberId/edit`
- `03_households` -> `/households`, `/households/:householdId`
- `04_groups` -> `/groups`, `/groups/:groupId`
- `05_events` -> `/events`, `/events/:serviceEventId`
- `06_attendance` -> `/attendance`, `/events/:serviceEventId/attendance`
- `07_finance` -> `/finance`, `/finance/entries/income`, `/finance/entries/expense`, `/finance/transfers/new`, `/finance/transactions/:transactionId`
- `08_reports` -> `/reports`
- `09_settings` -> `/settings/roles`, `/settings/staff`

## Naming Convention

Screenshot files use:

- `NN_screen-name.png`

Where:

- `NN` preserves local ordering within a folder
- `screen-name` describes the real product surface, not the original export folder name

Examples:

- `01_members-directory.png`
- `03_member-create-edit-form.png`
- `05_transaction-detail-audit.png`

## How Codex Should Use This Folder

- Start with the matching route folder before changing UI for a given product area.
- Prefer the refined clerical minimalism assets when multiple visual variants exist.
- Reuse the established frontend architecture and shared primitives; these assets guide composition and visual treatment, not a rewrite of routing or state.
- Use `source-html/` only when the screenshot is not enough and the raw Stitch export is needed for layout detail.
- If an asset is ambiguous or does not map cleanly to an implemented route, keep it in `source-html/` and call the uncertainty out explicitly instead of guessing.
