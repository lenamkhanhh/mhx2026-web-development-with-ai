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
    $vitestShim = Join-Path $repo "node_modules\.bin\vitest.cmd"
    if (Test-Path -LiteralPath $vitestShim) {
      & npm.cmd test -- final-group
    }
    else {
      $vitestModule = Join-Path $repo "node_modules\vitest\vitest.mjs"
      if (-not (Test-Path -LiteralPath $vitestModule)) {
        throw "Vitest is unavailable in node_modules."
      }
      & node $vitestModule run final-group
    }
    if ($LASTEXITCODE -ne 0) { throw "Final-group tests failed." }

    $tscShim = Join-Path $repo "node_modules\.bin\tsc.cmd"
    $viteShim = Join-Path $repo "node_modules\.bin\vite.cmd"
    if ((Test-Path -LiteralPath $tscShim) -and (Test-Path -LiteralPath $viteShim)) {
      & npm.cmd run build
    }
    else {
      $tscModule = Join-Path $repo "node_modules\typescript\bin\tsc"
      $viteModule = Join-Path $repo "node_modules\vite\bin\vite.js"
      if (-not (Test-Path -LiteralPath $tscModule) -or -not (Test-Path -LiteralPath $viteModule)) {
        throw "TypeScript or Vite is unavailable in node_modules."
      }
      & node $tscModule --noEmit
      if ($LASTEXITCODE -ne 0) { throw "Frontend type-check failed." }
      & node $tscModule -p tsconfig.server.json --noEmit
      if ($LASTEXITCODE -ne 0) { throw "Server type-check failed." }
      & node $viteModule build
    }
    if ($LASTEXITCODE -ne 0) { throw "Production build failed." }
  }
  finally {
    Pop-Location
  }

  Write-Host "Full final-group verification passed."
}
