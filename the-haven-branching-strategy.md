# The Haven — Branching Strategy

## Branch model

### Long-lived branches
- `main` — always production-ready
- `develop` — integration branch for the next release

### Short-lived working branches
- `feat/<scope>` — new features
- `bugfix/<scope>` — non-production bug fixes
- `refactor/<scope>` — internal code improvements with no intended behavior change
- `hotfix/<scope>` — urgent production fixes branched from `main`

## Merge flow
- `feat/*` → `develop`
- `bugfix/*` → `develop`
- `refactor/*` → `develop`
- `hotfix/*` → `main`, then back-merge into `develop`

## Protection rules

### `main`
- no direct pushes
- pull request required
- required status checks must pass
- at least 1 approval required, preferably 2 as the team grows
- stale approvals dismissed on new commits
- linear history preferred

### `develop`
- no direct pushes for normal work
- pull request required
- required status checks must pass
- at least 1 approval required

GitHub supports protected branches, required status checks, and required reviews, which are the right primitives for enforcing this workflow. citeturn0search3turn0search4turn0search5

## Merge method
Use **Squash and merge** for pull requests into both `develop` and `main` so feature branches can have working commits while the permanent history stays clean. GitHub supports squash, merge-commit, and rebase merge methods; squash merge is usually the clearest fit for this style of team workflow. citeturn0search0turn0search2

## Naming rules
Use clear, searchable names:
- `feat/backend-auth-bootstrap`
- `feat/attendance-summary-api`
- `bugfix/member-filter-null-crash`
- `refactor/finance-service-layer`
- `hotfix/login-session-timeout`

## Commit conventions
Use Conventional Commit style:
- `feat(attendance): add attendance summary endpoint`
- `fix(finance): correct fund balance aggregation`
- `refactor(users): simplify role assignment service`
- `chore(repo): add GitHub workflow skeletons`

## Working rules
1. Branch from `develop` for feature, bugfix, and refactor work.
2. Branch from `main` for hotfixes.
3. Keep short-lived branches small and focused.
4. Open a pull request early.
5. Do not keep working on a branch after it has been squash-merged; create a new branch instead, because squash merges create a new commit on the base branch and can make reuse of the same head branch messy. citeturn0search2
6. Delete merged short-lived branches. GitHub can automatically delete head branches after pull requests are merged. citeturn0search1turn0search6

## First execution plan for The Haven
1. Initialize the repo locally.
2. Create and push `main`.
3. Create and push `develop`.
4. Set `main` as the default branch on GitHub.
5. Apply protection rules to `main` and `develop`.
6. Start the first implementation branch from `develop`:
   - `feat/bootstrap-backend-foundation`
7. Merge to `develop` via PR.
8. Release from `develop` to `main` when Phase 1 foundation is stable.
