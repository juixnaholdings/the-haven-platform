param(
    [string]$RepoPath = ".",
    [string]$RemoteUrl = "https://github.com/neumann007/the-haven.git",
    [bool]$InitialCommit = $true,
    [switch]$Push,
    [string]$InitialCommitMessage = "chore(repo): bootstrap The Haven monorepo foundation",
    [string]$FeatureExample = "bootstrap-backend-foundation",
    [string]$BugfixExample = "readme-structure-cleanup",
    [string]$RefactorExample = "repo-script-normilization",
    [string]$HotfixExample = ""
)

$ErrorActionPreference = "Stop"

function Write-Step {
    param([string]$Message)
    Write-Host "`n==> $Message" -ForegroundColor Cyan
}

function Assert-Command {
    param([string]$Command)
    if (-not (Get-Command $Command -ErrorAction SilentlyContinue)) {
        throw "Required command not found: $Command"
    }
}

function Ensure-Directory {
    param([string]$Path)
    if (-not [string]::IsNullOrWhiteSpace($Path) -and -not (Test-Path $Path)) {
        New-Item -ItemType Directory -Path $Path -Force | Out-Null
    }
}

function Ensure-File {
    param(
        [string]$Path,
        [string]$Content
    )

    $dir = Split-Path -Parent $Path
    if (-not [string]::IsNullOrWhiteSpace($dir)) {
        Ensure-Directory -Path $dir
    }

    if (-not (Test-Path $Path)) {
        Set-Content -Path $Path -Value $Content -Encoding UTF8
    }
}

function Run-Git {
    param([string[]]$Args)
    & git @Args
    if ($LASTEXITCODE -ne 0) {
        throw "git $($Args -join ' ') failed"
    }
}

Assert-Command -Command "git"

$resolvedRepoPath = Resolve-Path -Path $RepoPath
Set-Location $resolvedRepoPath

Write-Step "Preparing Git repository in $resolvedRepoPath"
if (-not (Test-Path ".git")) {
    Run-Git -Args @("init")
}

$gitignoreContent = @"
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

$gitattributesContent = @"
* text=auto eol=lf
*.ps1 text eol=crlf
"@

$prTemplateContent = @"
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

$codeownersContent = @"
# Adjust owners later
* @your-github-username
/backend/ @your-github-username
/frontend/ @your-github-username
/infra/ @your-github-username
/docs/ @your-github-username
"@

$branchingDocContent = @"
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

Write-Step "Creating repository support files if missing"
Ensure-File -Path ".gitignore" -Content $gitignoreContent
Ensure-File -Path ".gitattributes" -Content $gitattributesContent
Ensure-File -Path ".github/PULL_REQUEST_TEMPLATE.md" -Content $prTemplateContent
Ensure-File -Path ".github/CODEOWNERS" -Content $codeownersContent
Ensure-File -Path "docs/product/branching-strategy.md" -Content $branchingDocContent

Write-Step "Configuring main and develop branches"
$currentBranch = (& git rev-parse --abbrev-ref HEAD).Trim()
if (-not $currentBranch) {
    throw "Could not determine current branch"
}
if ($currentBranch -ne "main") {
    Run-Git -Args @("branch", "-M", "main")
}

if ($InitialCommit) {
    Write-Step "Creating initial commit if needed"
    Run-Git -Args @("add", ".")

    & git rev-parse --verify HEAD *> $null
    $hasCommit = ($LASTEXITCODE -eq 0)

    if (-not $hasCommit) {
        Run-Git -Args @("commit", "-m", $InitialCommitMessage)
    }
    else {
        & git diff --cached --quiet
        $stagedClean = ($LASTEXITCODE -eq 0)
        if (-not $stagedClean) {
            Run-Git -Args @("commit", "-m", $InitialCommitMessage)
        }
    }
}

& git show-ref --verify --quiet refs/heads/develop
if ($LASTEXITCODE -ne 0) {
    Run-Git -Args @("branch", "develop")
}

Write-Step "Optional example branches"
if ($FeatureExample) {
    & git show-ref --verify --quiet "refs/heads/feat/$FeatureExample"
    if ($LASTEXITCODE -ne 0) { Run-Git -Args @("branch", "feat/$FeatureExample", "develop") }
}
if ($BugfixExample) {
    & git show-ref --verify --quiet "refs/heads/bugfix/$BugfixExample"
    if ($LASTEXITCODE -ne 0) { Run-Git -Args @("branch", "bugfix/$BugfixExample", "develop") }
}
if ($RefactorExample) {
    & git show-ref --verify --quiet "refs/heads/refactor/$RefactorExample"
    if ($LASTEXITCODE -ne 0) { Run-Git -Args @("branch", "refactor/$RefactorExample", "develop") }
}
if ($HotfixExample) {
    & git show-ref --verify --quiet "refs/heads/hotfix/$HotfixExample"
    if ($LASTEXITCODE -ne 0) { Run-Git -Args @("branch", "hotfix/$HotfixExample", "main") }
}

if ($RemoteUrl) {
    Write-Step "Configuring origin remote"
    $existingOrigin = ""
    try {
        $existingOrigin = (& git remote get-url origin 2>$null).Trim()
    }
    catch {
        $existingOrigin = ""
    }

    if (-not $existingOrigin) {
        Run-Git -Args @("remote", "add", "origin", $RemoteUrl)
    }
    elseif ($existingOrigin -ne $RemoteUrl) {
        Run-Git -Args @("remote", "set-url", "origin", $RemoteUrl)
    }

    if ($Push) {
        Write-Step "Pushing main and develop"
        Run-Git -Args @("push", "-u", "origin", "main")
        Run-Git -Args @("push", "-u", "origin", "develop")

        if ($FeatureExample) { Run-Git -Args @("push", "-u", "origin", "feat/$FeatureExample") }
        if ($BugfixExample)  { Run-Git -Args @("push", "-u", "origin", "bugfix/$BugfixExample") }
        if ($RefactorExample){ Run-Git -Args @("push", "-u", "origin", "refactor/$RefactorExample") }
        if ($HotfixExample)  { Run-Git -Args @("push", "-u", "origin", "hotfix/$HotfixExample") }
    }
}

Run-Git -Args @("checkout", "develop")
Write-Step "Done. Current branch: develop"
