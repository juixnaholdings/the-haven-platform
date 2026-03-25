# Release Checklist

## Purpose
This checklist provides a single release control page for The Haven.

It ties together:
- branch promotion
- tagging
- deploy approval
- rollout
- verification
- rollback readiness

Use this checklist before every release to production.

---

## Release summary

### Release version
`________________________`

### Target branch
`main`

### Source branch
`develop`

### Planned deploy date/time
`________________________`

### Release owner
`________________________`

### Approver
`________________________`

---

## 1. Code readiness

Confirm all of the following are true before release:

- all intended work has been merged into `develop`
- `develop` is stable
- CI checks are passing
- security checks are passing
- deploy workflow files are present and correct
- production compose and nginx files are committed
- required docs/runbooks are up to date

### Verification
```bash
git checkout develop
git pull origin develop
