$ErrorActionPreference = "Stop"

$requiredApprovalText = "FINAL EXECUTION AUTHORIZE v19.33 STEP1 OWNER-ONLY STAGING OWNER-RUN POWERSHELL TOKEN LAUNCHER ONE-RUN EXACTLY-ONCE / NO RE-ARM / NO RETRY / NO SECOND-RUN / NO PUBLIC / NO PRODUCTION / NO REAL DEALER / NO REAL LEAD / NO REAL CUSTOMER DATA"
$legacyBridgeApprovalText = "FINAL EXECUTION AUTHORIZE v14.3U OWNER-LOCAL SAME-CMD EXACTLY-ONE-RUN"

function Write-HoldAndExit {
  param([string]$Reason)
  Write-Output "HOLD - $Reason"
  exit 1
}

function Read-ApprovalText {
  param([string]$PathValue)
  if (-not (Test-Path -LiteralPath $PathValue)) {
    Write-HoldAndExit "approval file not found"
  }
  return (Get-Content -LiteralPath $PathValue -Raw).Replace("`r`n", "`n").Trim()
}

function Convert-SecureToPlainText {
  param([SecureString]$SecureValue)
  $ptr = [System.IntPtr]::Zero
  try {
    $ptr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecureValue)
    return [System.Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
  }
  finally {
    if ($ptr -ne [System.IntPtr]::Zero) {
      [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)
    }
  }
}

function Assert-CheckerOutput {
  param([string]$OutputText)
  $required = @(
    "NONGA_ADMIN_API_TOKEN: present",
    "length: nonzero",
    "format: valid",
    "leading/trailing whitespace: no",
    "contains newline: no",
    "quoted value risk: no",
    "literal env token risk: no",
    "starts with Bearer prefix: no",
    "token: ***MASKED***"
  )
  foreach ($line in $required) {
    if ($OutputText -notmatch [Regex]::Escape($line)) {
      Write-HoldAndExit "token checker output missing required line: $line"
    }
  }
}

$repoRoot = Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..")
Set-Location -LiteralPath $repoRoot

if ($env:NONGA_V19_LAUNCHER_PARSE_ONLY -eq "1") {
  Write-Output "PASS - parse-only mode; launcher runtime path skipped"
  exit 0
}

$approvalFile = Join-Path $repoRoot "v19.33-local-approval.txt"

if (-not (Test-Path -LiteralPath "scripts/owner-local-step1-one-run-v19.mts")) {
  Write-HoldAndExit "v19 one-run wrapper not found"
}

$approvalText = Read-ApprovalText -PathValue $approvalFile
if ($approvalText -ne $requiredApprovalText) {
  Write-HoldAndExit "fresh v19.33 owner approval text mismatch"
}

if (-not $Host.UI) {
  Write-HoldAndExit "interactive host UI unavailable; run in visible PowerShell terminal"
}

$secureToken = Read-Host -AsSecureString "Paste NONGA_ADMIN_API_TOKEN for this one-run only"
$plainToken = Convert-SecureToPlainText -SecureValue $secureToken
if ([string]::IsNullOrEmpty($plainToken)) {
  Write-HoldAndExit "NONGA_ADMIN_API_TOKEN missing from interactive prompt"
}

$env:NONGA_ADMIN_API_TOKEN = $plainToken
$bridgeDir = Join-Path ([System.IO.Path]::GetTempPath()) ("nonga-v1933-approval-bridge-" + [Guid]::NewGuid().ToString("N"))
$bridgeApprovalPath = Join-Path $bridgeDir "approval-bridge.txt"

try {
  New-Item -ItemType Directory -Path $bridgeDir -Force | Out-Null
  Set-Content -LiteralPath $bridgeApprovalPath -Value $legacyBridgeApprovalText -NoNewline

  $checkerOutput = & npm run check:admin-token-session-env 2>&1
  $checkerExit = $LASTEXITCODE
  $checkerText = ($checkerOutput | Out-String)
  Write-Output ($checkerText.TrimEnd())
  if ($checkerExit -ne 0) {
    Write-HoldAndExit "token checker failed; one-run not executed"
  }

  Assert-CheckerOutput -OutputText $checkerText
  & npx tsx scripts/owner-local-step1-one-run-v19.mts --execute-approved-v19-step1 --allow-live-execution --approval-file $bridgeApprovalPath
  exit $LASTEXITCODE
}
finally {
  $env:NONGA_ADMIN_API_TOKEN = $null
  Remove-Item -LiteralPath $bridgeDir -Recurse -Force -ErrorAction SilentlyContinue
}
