# Server Bootstrap Runbook

## Purpose
This runbook prepares a server for The Haven staging and production deployments.

It covers:

- deploy user setup
- SSH access
- Docker and Compose readiness
- repo clone locations
- environment file placement
- firewall preparation
- first manual validation

This runbook does **not** perform the actual production rollout. It prepares the server so deployment workflows can run safely later.

---

## Target directory layout

### Staging
`/srv/the-haven-staging`

### Production
`/srv/the-haven`

These paths must match the GitHub environment secrets:

### Staging secrets
- `APP_DIR=/srv/the-haven-staging`
- `ENV_FILE_PATH=/srv/the-haven-staging/infra/.env.staging`

### Production secrets
- `APP_DIR=/srv/the-haven`
- `ENV_FILE_PATH=/srv/the-haven/infra/.env.production`

---

## 1. Create the deploy user

Run as root or with sudo:

```bash
sudo adduser deploy
sudo usermod -aG sudo deploy
sudo usermod -aG docker deploy
