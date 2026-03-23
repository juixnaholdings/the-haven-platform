<<<<<<< HEAD
﻿
=======
# Deployment Runbook

## Branch model
- `develop` deploys to staging
- `main` deploys to production

## Server directories
- Staging: `/srv/the-haven-staging`
- Production: `/srv/the-haven`

## Environment files
- Staging env file stays on server and is not committed
- Production env file stays on server and is not committed

## Staging deployment
1. SSH into server
2. `cd /srv/the-haven-staging`
3. `git fetch origin`
4. `git checkout develop`
5. `git pull --ff-only origin develop`
6. `docker compose --env-file infra/.env.staging -f infra/compose.staging.yaml up --build -d`

## Production deployment
1. SSH into server
2. `cd /srv/the-haven`
3. `git fetch origin`
4. `git checkout main`
5. `git pull --ff-only origin main`
6. `docker compose --env-file infra/.env.production -f infra/compose.production.yaml up --build -d`

## Rollback
- checkout previous known-good tag or commit
- rerun compose up --build -d

## Post-deploy verification

### Staging
- open the staging URL
- verify login works
- verify reload works
- verify `/admin/` loads
- verify one protected API page loads
- verify backend health endpoint returns 200

### Production
- verify HTTP redirects to HTTPS
- verify login works
- verify reload works
- verify refresh works
- verify logout works
- verify `/admin/` loads
- verify static files load
- verify no browser requests point to the wrong origin

## Rollback protocol

1. Identify the previous known-good release tag.
2. SSH into the server.
3. `git fetch --tags`
4. `git checkout <tag>`
5. run the same docker compose up --build -d command for that environment
6. confirm health endpoint and application login work
>>>>>>> develop
