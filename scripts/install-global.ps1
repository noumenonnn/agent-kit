param([string]$PiHome, [ValidateSet("core", "agenticoding")][string]$Profile = "core", [switch]$Force, [switch]$DryRun, [switch]$ApplySettings, [switch]$AckAgenticoding, [switch]$SkipAgenticoding)
$ErrorActionPreference = "Stop"
$arguments = @((Join-Path $PSScriptRoot "kit.mjs"), "global", "--profile", $Profile)
if ($PiHome) { $arguments += @("--pi-home", $PiHome) }
if ($Force) { $arguments += "--force" }
if ($DryRun) { $arguments += "--dry-run" }
if ($ApplySettings) { $arguments += "--apply-settings" }
if ($AckAgenticoding) { $arguments += "--ack-agenticoding" }
if ($SkipAgenticoding) { $arguments += "--skip-agenticoding" }
& node @arguments
if ($LASTEXITCODE -ne 0) { throw "Global installation failed (exit $LASTEXITCODE)." }
