# Operations Index

## Purpose
This document is the operational map for The Haven.

It provides a single place to find:

- deployment workflows
- environment templates
- Compose files
- Nginx configs
- security and rollout runbooks
- server bootstrap references

Use this as the entry point for engineering operations, deployment work, and release handling.

---

## 1. Branch and environment model

### Branches
- `develop` → active integration branch
- `main` → release branch

### Deployment targets
- `develop` → staging
- `main` → production

### GitHub environments
- `staging`
- `production`

---

## 2. GitHub Actions workflows

### CI workflow
Path:
```text id="ya3emo"
.github/workflows/ci.yml
