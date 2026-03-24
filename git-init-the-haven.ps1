param(
    [string]$RepoPath = ".",
    [string]$RemoteUrl = "https://github.com/neumann007/the-haven.git",
    [switch]$InitialCommit = $true,
    [switch]$Push = "`",
    [string]$InitialCommitMessage = "chore(repo): bootstrap The Haven monorepo foundation",
    [string]$FeatureExample = "bootstrap-backend-foundation",
    [string]$BugfixExample = "readme-structure-cleanup",
    [string]$RefactorExample = "repo-script-normilization",
    [string]$HotfixExample = ""
)

$ErrorActionPreference = "Stop"

function Write-Step($message) {
    Write-Host "`n==> $message" -ForegroundColor Cyan
}

function Assert-Command($command) {
    if (-not (Get-Command $command -ErrorAction SilentlyContinue)) {
        throw "Required command not found: $command"
    }
}

function Ensure-File($path, $content) {
    $dir = Split-Path -Parent $path
    if ($dir -and -not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }
    if (-not (Test-Path $path)) {
        Set-Content -Path $path -Value $content -Encoding UTF8
    }
}

function Run-Git([string[]]$args) {
    & git @args
    if ($LASTEXITCODE -ne 0) {
        throw "git $($args -join ' ') failed"
    }
}

Assert-Command git

$fullRepoPath = Resolve-Path -Path $RepoPath
Set-Location $fullRepoPath

Write-Step "Preparing Git repository in $fullRepoPath"
if (-not (Test-Path ".git")) {
    Run-Git @("init")
}

# Ensure useful repo defaults
Write-Step "Creating repository support files if missing"
Ensure-File ".gitignore" @"
# OS
.DS_Store
Thumbs.db

# Python
__pycache__/
*.py[cod]
*.egg-info/
.pytest_cache/
.mypy_cache/
.ruff_cache/
.venv/
venv/

# Django
backend/staticfiles/
backend/media/
backend/db.sqlite3

# Node
frontend/node_modules/
frontend/dist/

# Env
.env
.env.*
!.env.example

# IDE
.vscode/
.idea/
"@

Ensure-File ".gitattributes" @"
* text=auto eol=lf
*.ps1 text eol=crlf
"@

Ensure-File ".github/PULL_REQUEST_TEMPLATE.md" @"
## Summary
- 

## Changes made
- 

## How to test
- 

## Checklist
- [ ] Linked to an issue/task
- [ ] Local tests pass
- [ ] No secrets added
- [ ] Docs updated where needed
"@

Ensure-File ".github/CODEOWNERS" @"
# Adjust owners later
* @your-github-username
/backend/ @your-github-username
/frontend/ @your-github-username
/infra/ @your-github-username
/docs/ @your-github-username
"@

Ensure-File "docs/product/branching-strategy.md" @"
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
"@

Write-Step "Configuring main and develop branches"
# Rename current branch to main safely
$currentBranch = (& git rev-parse --abbrev-ref HEAD).Trim()
if (-not $currentBranch) {
    throw "Could not determine current branch"
}
if ($currentBranch -ne "main") {
    Run-Git @("branch", "-M", "main")
}

if ($InitialCommit) {
    Write-Step "Creating initial commit if needed"
    Run-Git @("add", ".")
    $hasCommit = $true
    & git rev-parse --verify HEAD *> $null
    if ($LASTEXITCODE -ne 0) {
        $hasCommit = $false
    }

    if (-not $hasCommit) {
        Run-Git @("commit", "-m", $InitialCommitMessage)
    } else {
        & git diff --cached --quiet
        $stagedClean = ($LASTEXITCODE -eq 0)
        if (-not $stagedClean) {
            Run-Git @("commit", "-m", $InitialCommitMessage)
        }
    }
}

# Create develop if missing
& git show-ref --verify --quiet refs/heads/develop
if ($LASTEXITCODE -ne 0) {
    Run-Git @("branch", "develop")
}

Write-Step "Optional example branches"
if ($FeatureExample) {
    & git show-ref --verify --quiet "refs/heads/feat/$FeatureExample"
    if ($LASTEXITCODE -ne 0) { Run-Git @("branch", "feat/$FeatureExample", "develop") }
}
if ($BugfixExample) {
    & git show-ref --verify --quiet "refs/heads/bugfix/$BugfixExample"
    if ($LASTEXITCODE -ne 0) { Run-Git @("branch", "bugfix/$BugfixExample", "develop") }
}
if ($RefactorExample) {
    & git show-ref --verify --quiet "refs/heads/refactor/$RefactorExample"
    if ($LASTEXITCODE -ne 0) { Run-Git @("branch", "refactor/$RefactorExample", "develop") }
}
if ($HotfixExample) {
    & git show-ref --verify --quiet "refs/heads/hotfix/$HotfixExample"
    if ($LASTEXITCODE -ne 0) { Run-Git @("branch", "hotfix/$HotfixExample", "main") }
}

if ($RemoteUrl) {
    Write-Step "Configuring origin remote"
    $existingOrigin = ""
    try {
        $existingOrigin = (& git remote get-url origin 2>$null).Trim()
    } catch {
        $existingOrigin = ""
    }

    if (-not $existingOrigin) {
        Run-Git @("remote", "add", "origin", $RemoteUrl)
    } elseif ($existingOrigin -ne $RemoteUrl) {
        Run-Git @("remote", "set-url", "origin", $RemoteUrl)
    }

    if ($Push) {
        Write-Step "Pushing main and develop"
        Run-Git @("push", "-u", "origin", "main")
        Run-Git @("push", "-u", "origin", "develop")

        if ($FeatureExample) { Run-Git @("push", "-u", "origin", "feat/$FeatureExample") }
        if ($BugfixExample)  { Run-Git @("push", "-u", "origin", "bugfix/$BugfixExample") }
        if ($RefactorExample){ Run-Git @("push", "-u", "origin", "refactor/$RefactorExample") }
        if ($HotfixExample)  { Run-Git @("push", "-u", "origin", "hotfix/$HotfixExample") }
    }
}

Run-Git @("checkout", "develop")

Write-Step "Completed"
Write-Host "Current branch: develop" -ForegroundColor Green
Write-Host "Long-lived branches ready: main, develop" -ForegroundColor Green
Write-Host "Next feature branch example:" -ForegroundColor Yellow
Write-Host "  git checkout develop" -ForegroundColor Yellow
Write-Host "  git pull" -ForegroundColor Yellow
Write-Host "  git checkout -b feat/bootstrap-backend-foundation" -ForegroundColor Yellow

Write-Host "`nGitHub protection rules to apply after pushing:" -ForegroundColor Magenta
Write-Host "- Protect main: require PR, require checks, require 1-2 approvals, no direct pushes" -ForegroundColor Magenta
Write-Host "- Protect develop: require PR, require checks, allow maintainers only" -ForegroundColor Magenta
Write-Host "- Enable auto-delete for merged short-lived branches" -ForegroundColor Magenta
