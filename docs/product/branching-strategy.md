# The Haven Branching Strategy

## Long-lived branches
- main: production-ready only
- develop: integration branch for completed work headed for the next release

## Short-lived branches
- feat/<ticket-or-scope>
- bugfix/<ticket-or-scope>
- refactor/<ticket-or-scope>
- hotfix/<ticket-or-scope>

## Merge rules
- feat/*, bugfix/*, refactor/* target develop
- hotfix/* targets main and is then back-merged into develop
- use pull requests for all merges
- squash merge into develop and main
