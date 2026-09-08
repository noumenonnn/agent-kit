param([string]$Target = (Get-Location).Path, [switch]$Force, [switch]$DryRun)
$ErrorActionPreference = "Stop"
$kit = Join-Path $PSScriptRoot "kit.mjs"
$arguments = @($kit, "init", "--target", $Target)
if ($Force) { $arguments += "--force" }
if ($DryRun) { $arguments += "--dry-run" }
& node @arguments
if ($LASTEXITCODE -ne 0) { throw "Project initialization failed (exit $LASTEXITCODE)." }
