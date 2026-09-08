param([Parameter(Mandatory=$true)][string]$Source, [Parameter(Mandatory=$true)][string]$Ref, [string]$Target = (Get-Location).Path, [ValidateSet("lean", "deep")][string]$Preset = "lean", [switch]$Force, [switch]$DryRun)
$ErrorActionPreference = "Stop"
$arguments = @((Join-Path $PSScriptRoot "kit.mjs"), "matt", "--source", $Source, "--ref", $Ref, "--target", $Target, "--preset", $Preset)
if ($Force) { $arguments += "--force" }
if ($DryRun) { $arguments += "--dry-run" }
& node @arguments
if ($LASTEXITCODE -ne 0) { throw "Matt skill installation failed (exit $LASTEXITCODE)." }
