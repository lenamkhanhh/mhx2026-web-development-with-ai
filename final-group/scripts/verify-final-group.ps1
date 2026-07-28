param(
  [switch]$Full
)

$ErrorActionPreference = "Stop"
$repo = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$project = Join-Path $repo "final-group"
$scannerPath = (Resolve-Path $PSCommandPath).Path

if (-not (Test-Path -LiteralPath $project -PathType Container)) {
  throw "Missing final-group directory: $project"
}

$branch = (git -C $repo branch --show-current).Trim()
if ([string]::IsNullOrWhiteSpace($branch)) {
  throw "Could not determine the current Git branch."
}

Write-Host "Branch: $branch"
Write-Host "Checking required project files..."

$required = @(
  "SKILL.md",
  "README.md",
  "references\architecture.md",
  "references\data-model.md",
  "references\permissions.md",
  "handoffs\TASK_PROMPTS.md",
  "handoffs\HANDOFF_TEMPLATE.md"
)

foreach ($relative in $required) {
  $path = Join-Path $project $relative
  if (-not (Test-Path -LiteralPath $path -PathType Leaf)) {
    throw "Missing required file: $relative"
  }
}

$secretPatterns = @(
  "BEGIN PRIVATE KEY",
  "serviceAccount",
  "client_secret",
  "private_key"
)

$candidateFiles = Get-ChildItem -LiteralPath $project -Recurse -File |
  Where-Object {
    $_.FullName -notmatch "\\node_modules\\" -and
    $_.FullName -ne $scannerPath
  }

foreach ($file in $candidateFiles) {
  $matches = Select-String -LiteralPath $file.FullName -Pattern $secretPatterns -SimpleMatch -ErrorAction SilentlyContinue
  if ($null -ne $matches) {
    throw "Possible secret material found in $($file.FullName)"
  }
}

Write-Host "Boundary and secret checks passed."

if ($Full) {
  Push-Location $repo
  try {
    & npm.cmd test -- final-group
    if ($LASTEXITCODE -ne 0) { throw "Final-group tests failed." }

    & npm.cmd run build
    if ($LASTEXITCODE -ne 0) { throw "Production build failed." }
  }
  finally {
    Pop-Location
  }

  Write-Host "Full final-group verification passed."
}
