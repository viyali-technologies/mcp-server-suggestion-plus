$ErrorActionPreference = "Stop"

Set-Location -LiteralPath $PSScriptRoot

$node = Get-Command node.exe -ErrorAction SilentlyContinue
$npm = Get-Command npm.cmd -ErrorAction SilentlyContinue

if (-not $node -or -not $npm) {
  throw "Node.js 18 or newer (including npm) is required. Install Node.js, then open a new PowerShell window."
}

$nodeVersionText = (& $node.Source -p "process.versions.node").Trim()
if ($LASTEXITCODE -ne 0) {
  throw "Could not determine the installed Node.js version."
}

$nodeVersion = [version]$nodeVersionText
if ($nodeVersion -lt [version]"18.0") {
  throw "Node.js 18 or newer is required; found $nodeVersionText."
}

# Keep a valid existing dependency tree; install or repair it when needed.
& $npm.Source ls --depth=0 *> $null
if ($LASTEXITCODE -eq 0) {
  Write-Host "Dependencies are already installed and up to date."
} else {
  Write-Host "Installing project dependencies..."
  & $npm.Source install
  if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
  }
  Write-Host "Dependencies installed or updated successfully."
}

Write-Host "Building Suggestion+ MCP server..."
& $npm.Source run build
if ($LASTEXITCODE -ne 0) {
  exit $LASTEXITCODE
}
Write-Host "Build completed successfully."

Write-Host "Starting Suggestion+ MCP server..."
& $npm.Source start
exit $LASTEXITCODE
