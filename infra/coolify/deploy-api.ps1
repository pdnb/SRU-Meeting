#Requires -Version 5.1
<#
.SYNOPSIS
  Deploy SRU-Meeting to Coolify via REST API (public Git + Docker Compose).

.DESCRIPTION
  Creates a Coolify application from https://github.com/pdnb/SRU-Meeting.git using
  build_pack=dockercompose and infra/coolify/docker-compose.yml, sets env/domains,
  deploys, then registers scheduled tasks.

  Does NOT write secrets. Pass via parameters or environment variables:
    COOLIFY_URL, COOLIFY_TOKEN

.EXAMPLE
  $env:COOLIFY_URL = "https://coolify.example.com"
  $env:COOLIFY_TOKEN = "<token>"
  .\infra\coolify\deploy-api.ps1 `
    -ProjectName "sru-meeting" `
    -ServerPublicIp "1.2.3.4" `
    -WebDomain "https://meeting.example.ac.th:3000" `
    -LivekitDomain "https://livekit.example.ac.th:7880" `
    -OrgAdminEmails "admin@org.ac.th"
#>
[CmdletBinding()]
param(
  [string] $CoolifyUrl = $env:COOLIFY_URL,
  [string] $CoolifyToken = $env:COOLIFY_TOKEN,
  [string] $ProjectName = "sru-meeting",
  [string] $ProjectUuid = $env:COOLIFY_PROJECT_UUID,
  [string] $ServerUuid = $env:COOLIFY_SERVER_UUID,
  [string] $EnvironmentName = "production",
  [Parameter(Mandatory = $true)]
  [string] $ServerPublicIp,
  [Parameter(Mandatory = $true)]
  [string] $WebDomain,
  [Parameter(Mandatory = $true)]
  [string] $LivekitDomain,
  [Parameter(Mandatory = $true)]
  [string] $OrgAdminEmails,
  [string] $GitRepository = "https://github.com/pdnb/SRU-Meeting.git",
  [string] $GitBranch = "main",
  [string] $AppName = "sru-meeting",
  [string] $ComposeLocation = "/infra/coolify/docker-compose.yml",
  [string] $LivekitApiKey = "sru",
  [switch] $SkipDeploy,
  [switch] $SkipScheduledTasks,
  [switch] $SkipDnsCheck,
  [int] $DeployTimeoutSec = 1800,
  [int] $PollIntervalSec = 15
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Write-Step([string] $Message) {
  Write-Host ""
  Write-Host "==> $Message" -ForegroundColor Cyan
}

function Get-PublicUrl([string] $DomainWithOptionalPort) {
  # Coolify compose domains use https://host:containerPort - public URL omits container port.
  try {
    $uri = [Uri]$DomainWithOptionalPort
    if ($uri.Scheme -and $uri.Host) {
      return ("{0}://{1}" -f $uri.Scheme, $uri.Host)
    }
  } catch {
    # fall through
  }
  return ($DomainWithOptionalPort -replace ':\d+$', '')
}

function Get-Hostname([string] $DomainWithOptionalPort) {
  try {
    $uri = [Uri]$DomainWithOptionalPort
    if ($uri.Host) { return $uri.Host }
  } catch {}
  return (($DomainWithOptionalPort -replace '^https?://', '') -replace ':\d+$', '' -replace '/.*$', '')
}

function Invoke-Coolify {
  param(
    [Parameter(Mandatory = $true)][string] $Method,
    [Parameter(Mandatory = $true)][string] $Path,
    [object] $Body = $null,
    [hashtable] $Query = $null
  )

  $uri = "$script:ApiBase$Path"
  if ($Query -and $Query.Count -gt 0) {
    $parts = foreach ($k in $Query.Keys) {
      "{0}={1}" -f [Uri]::EscapeDataString([string]$k), [Uri]::EscapeDataString([string]$Query[$k])
    }
    $uri = "$uri?" + ($parts -join "&")
  }

  $headers = @{
    Authorization = "Bearer $CoolifyToken"
    Accept        = "application/json"
  }

  $params = @{
    Method  = $Method
    Uri     = $uri
    Headers = $headers
  }

  if ($null -ne $Body) {
    $json = if ($Body -is [string]) { $Body } else { $Body | ConvertTo-Json -Depth 20 -Compress }
    $params.ContentType = "application/json"
    $params.Body = $json
  }

  try {
    return Invoke-RestMethod @params
  } catch {
    $detail = $null
    if ($_.ErrorDetails -and $_.ErrorDetails.Message) {
      $detail = $_.ErrorDetails.Message
    }
    if (-not $detail -and $_.Exception.Response) {
      try {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $detail = $reader.ReadToEnd()
      } catch {}
    }
    if (-not $detail) { $detail = $_.Exception.Message }
    throw "Coolify API $Method $Path failed: $detail"
  }
}

if (-not $CoolifyUrl) { throw "COOLIFY_URL / -CoolifyUrl is required." }
if (-not $CoolifyToken) { throw "COOLIFY_TOKEN / -CoolifyToken is required." }

$CoolifyUrl = $CoolifyUrl.TrimEnd("/")
$script:ApiBase = "$CoolifyUrl/api/v1"

$webPublicUrl = Get-PublicUrl $WebDomain
$livekitPublicUrl = Get-PublicUrl $LivekitDomain
$webHost = Get-Hostname $WebDomain
$livekitHost = Get-Hostname $LivekitDomain
$turnRealm = $webHost

Write-Step "Coolify target: $CoolifyUrl"
Write-Host "  App: $AppName"
Write-Host "  Web: $WebDomain  (public $webPublicUrl)"
Write-Host "  LiveKit: $LivekitDomain  (public $livekitPublicUrl)"
Write-Host "  SERVER_PUBLIC_IP: $ServerPublicIp"

# --- DNS check ---
if (-not $SkipDnsCheck) {
  Write-Step "Checking DNS A records -> $ServerPublicIp"
  foreach ($hostName in @($webHost, $livekitHost)) {
    try {
      $records = Resolve-DnsName -Name $hostName -Type A -ErrorAction Stop |
        Where-Object { $_.Type -eq "A" } |
        Select-Object -ExpandProperty IPAddress -Unique
      $joined = ($records -join ", ")
      if ($records -contains $ServerPublicIp) {
        Write-Host "  OK  $hostName -> $joined" -ForegroundColor Green
      } else {
        Write-Host "  WARN $hostName -> $joined (expected $ServerPublicIp)" -ForegroundColor Yellow
        Write-Host "       Fix DNS A record before relying on TLS / WebRTC." -ForegroundColor Yellow
      }
    } catch {
      Write-Host "  WARN could not resolve $hostName : $($_.Exception.Message)" -ForegroundColor Yellow
    }
  }
  Write-Host ""
  Write-Host "Firewall checklist on $ServerPublicIp (must be open):" -ForegroundColor Yellow
  Write-Host "  TCP 80,443 | TCP 7880,7881 | UDP 50000-50100 | TCP+UDP 3478,5349 | UDP 49160-49200"
}

# --- Discover project ---
Write-Step "Resolving project"
if (-not $ProjectUuid) {
  $projects = @(Invoke-Coolify -Method GET -Path "/projects")
  $match = @($projects | Where-Object { $_.name -eq $ProjectName })
  if ($match.Count -eq 0) {
    $names = ($projects | ForEach-Object { $_.name }) -join ", "
    throw "Project '$ProjectName' not found. Available: $names. Pass -ProjectUuid or -ProjectName."
  }
  if ($match.Count -gt 1) {
    throw "Multiple projects named '$ProjectName'. Pass -ProjectUuid explicitly."
  }
  $ProjectUuid = $match[0].uuid
}
Write-Host "  project_uuid=$ProjectUuid"

$project = Invoke-Coolify -Method GET -Path "/projects/$ProjectUuid"
$envUuid = $null
if ($project.PSObject.Properties.Name -contains "environments" -and $project.environments) {
  $envMatch = @($project.environments | Where-Object { $_.name -eq $EnvironmentName })
  if ($envMatch.Count -gt 0) {
    $envUuid = $envMatch[0].uuid
    Write-Host "  environment=$EnvironmentName uuid=$envUuid"
  }
}

# --- Discover server ---
Write-Step "Resolving server"
if (-not $ServerUuid) {
  $servers = @(Invoke-Coolify -Method GET -Path "/servers")
  $reachable = @($servers | Where-Object {
      ($_.is_usable -ne $false) -and (
        ($_.settings -and $_.settings.is_reachable -ne $false) -or ($_.is_reachable -ne $false)
      )
    })
  if ($reachable.Count -eq 0) { $reachable = @($servers) }
  if ($reachable.Count -eq 0) { throw "No servers found in Coolify." }
  if ($reachable.Count -gt 1) {
    $list = ($reachable | ForEach-Object { "$($_.name) ($($_.uuid) ip=$($_.ip))" }) -join "; "
    throw "Multiple servers found. Pass -ServerUuid. Candidates: $list"
  }
  $ServerUuid = $reachable[0].uuid
  Write-Host "  server=$($reachable[0].name) uuid=$ServerUuid ip=$($reachable[0].ip)"
} else {
  Write-Host "  server_uuid=$ServerUuid"
}

# --- Existing application? ---
Write-Step "Looking for existing application '$AppName'"
$applications = @(Invoke-Coolify -Method GET -Path "/applications")
$existing = @($applications | Where-Object { $_.name -eq $AppName })

$appUuid = $null
if ($existing.Count -gt 0) {
  $appUuid = $existing[0].uuid
  Write-Host "  Reusing application uuid=$appUuid" -ForegroundColor Yellow
} else {
  Write-Step "Creating application (public git + dockercompose)"
  $createBody = @{
    project_uuid            = $ProjectUuid
    server_uuid             = $ServerUuid
    environment_name        = $EnvironmentName
    git_repository          = $GitRepository
    git_branch              = $GitBranch
    build_pack              = "dockercompose"
    docker_compose_location = $ComposeLocation
    base_directory          = "/"
    name                    = $AppName
    instant_deploy          = $false
    ports_exposes           = "3000"
  }
  if ($envUuid) {
    $createBody.environment_uuid = $envUuid
  }

  $created = Invoke-Coolify -Method POST -Path "/applications/public" -Body $createBody
  $appUuid = $created.uuid
  if (-not $appUuid) { throw "Create application returned no uuid: $($created | ConvertTo-Json -Depth 5)" }
  Write-Host "  Created uuid=$appUuid" -ForegroundColor Green
}

# --- Domains ---
Write-Step "Setting docker_compose_domains"
$patchBody = @{
  docker_compose_domains = @(
    @{ name = "web"; domain = $WebDomain },
    @{ name = "livekit"; domain = $LivekitDomain }
  )
  docker_compose_location = $ComposeLocation
  base_directory          = "/"
}
Invoke-Coolify -Method PATCH -Path "/applications/$appUuid" -Body $patchBody | Out-Null
Write-Host "  web -> $WebDomain"
Write-Host "  livekit -> $LivekitDomain"

# --- Envs ---
Write-Step "Upserting environment variables"
$envData = @(
  @{ key = "SERVER_PUBLIC_IP"; value = $ServerPublicIp; is_literal = $true },
  @{ key = "LIVEKIT_API_KEY"; value = $LivekitApiKey; is_literal = $true },
  @{ key = "ORG_ADMIN_EMAILS"; value = $OrgAdminEmails; is_literal = $true },
  @{ key = "TURN_REALM"; value = $turnRealm; is_literal = $true }
)

try {
  Invoke-Coolify -Method PATCH -Path "/applications/$appUuid/envs/bulk" -Body @{ data = $envData } | Out-Null
  Write-Host "  bulk update OK"
} catch {
  Write-Host "  bulk failed ($($_.Exception.Message)); creating individually..." -ForegroundColor Yellow
  $current = @()
  try { $current = @(Invoke-Coolify -Method GET -Path "/applications/$appUuid/envs") } catch {}
  $byKey = @{}
  foreach ($e in $current) { $byKey[$e.key] = $e }

  foreach ($item in $envData) {
    if ($byKey.ContainsKey($item.key)) {
      Invoke-Coolify -Method PATCH -Path "/applications/$appUuid/envs" -Body $item | Out-Null
      Write-Host "  updated $($item.key)"
    } else {
      Invoke-Coolify -Method POST -Path "/applications/$appUuid/envs" -Body $item | Out-Null
      Write-Host "  created $($item.key)"
    }
  }
}

# --- Deploy ---
if (-not $SkipDeploy) {
  Write-Step "Starting deploy"
  $deployResp = Invoke-Coolify -Method POST -Path "/deploy" -Query @{ uuid = $appUuid; force = "false" }
  $deploymentUuid = $null
  if ($deployResp.PSObject.Properties.Name -contains "deployments" -and $deployResp.deployments -and @($deployResp.deployments).Count -gt 0) {
    $deploymentUuid = $deployResp.deployments[0].deployment_uuid
  } elseif ($deployResp.PSObject.Properties.Name -contains "deployment_uuid") {
    $deploymentUuid = $deployResp.deployment_uuid
  }
  if (-not $deploymentUuid) {
    Write-Host ($deployResp | ConvertTo-Json -Depth 6)
    throw "Deploy did not return deployment_uuid"
  }
  Write-Host "  deployment_uuid=$deploymentUuid"

  $deadline = (Get-Date).AddSeconds($DeployTimeoutSec)
  $lastStatus = ""
  $status = ""
  $dep = $null
  do {
    Start-Sleep -Seconds $PollIntervalSec
    $dep = Invoke-Coolify -Method GET -Path "/deployments/$deploymentUuid"
    $status = [string]$dep.status
    if ($status -ne $lastStatus) {
      Write-Host "  status=$status"
      $lastStatus = $status
    }
    $done = $status -match "finished|success|completed|failed|error|cancelled"
  } while (-not $done -and (Get-Date) -lt $deadline)

  if ($status -match "failed|error|cancelled") {
    if ($dep -and ($dep.PSObject.Properties.Name -contains "logs") -and $dep.logs) {
      Write-Host "---- deployment logs (tail) ----" -ForegroundColor Red
      $logText = [string]$dep.logs
      if ($logText.Length -gt 4000) { $logText = $logText.Substring($logText.Length - 4000) }
      Write-Host $logText
    }
    throw "Deployment ended with status=$status"
  }
  if (-not ($status -match "finished|success|completed")) {
    throw "Deployment timed out after $($DeployTimeoutSec)s (last status=$status)"
  }
  Write-Host "  Deploy finished." -ForegroundColor Green
} else {
  Write-Step "SkipDeploy set - not deploying"
}

# --- Scheduled tasks ---
if (-not $SkipScheduledTasks) {
  Write-Step "Ensuring scheduled tasks"
  $cronSecret = $null
  try {
    $envs = @(Invoke-Coolify -Method GET -Path "/applications/$appUuid/envs")
    foreach ($e in $envs) {
      if ($e.key -eq "INTERNAL_CRON_SECRET" -or $e.key -eq "SERVICE_PASSWORD_64_CRON") {
        $cronSecret = [string]$e.value
        if ($cronSecret) { break }
      }
    }
  } catch {
    Write-Host "  WARN could not list envs for cron secret: $($_.Exception.Message)" -ForegroundColor Yellow
  }

  if (-not $cronSecret) {
    Write-Host "  WARN INTERNAL_CRON_SECRET / SERVICE_PASSWORD_64_CRON not found yet." -ForegroundColor Yellow
    Write-Host "       Magic vars appear after Coolify parses compose. Re-run later or set cron manually." -ForegroundColor Yellow
  } else {
    $existingTasks = @()
    try { $existingTasks = @(Invoke-Coolify -Method GET -Path "/applications/$appUuid/scheduled-tasks") } catch {}
    $existingNames = @($existingTasks | ForEach-Object { $_.name })

    $tickFreq = "*/5 * * * *"
    $tasks = @(
      @{
        name      = "webhook-tick"
        frequency = $tickFreq
        command   = "curl -sf -X POST -H `"Authorization: Bearer $cronSecret`" $webPublicUrl/api/internal/webhooks/tick"
        enabled   = $true
        timeout   = 120
      },
      @{
        name      = "retention"
        frequency = "0 3 * * *"
        command   = "curl -sf -X POST -H `"Authorization: Bearer $cronSecret`" $webPublicUrl/api/internal/retention"
        enabled   = $true
        timeout   = 300
      }
    )

    foreach ($t in $tasks) {
      if ($existingNames -contains $t.name) {
        Write-Host "  skip existing task $($t.name)"
        continue
      }
      Invoke-Coolify -Method POST -Path "/applications/$appUuid/scheduled-tasks" -Body $t | Out-Null
      Write-Host "  created task $($t.name)" -ForegroundColor Green
    }
  }
}

# --- Verify HTTP ---
Write-Step "HTTP smoke checks"
foreach ($pair in @(
    @{ Name = "web"; Url = $webPublicUrl },
    @{ Name = "livekit"; Url = $livekitPublicUrl }
  )) {
  try {
    $r = Invoke-WebRequest -Uri $pair.Url -Method GET -MaximumRedirection 5 -TimeoutSec 30 -UseBasicParsing
    Write-Host "  $($pair.Name) $($r.StatusCode) $($pair.Url)" -ForegroundColor Green
  } catch {
    $code = $null
    if ($_.Exception.Response) {
      try { $code = [int]$_.Exception.Response.StatusCode } catch {}
    }
    if ($code) {
      Write-Host "  $($pair.Name) $code $($pair.Url)" -ForegroundColor Yellow
    } else {
      Write-Host "  $($pair.Name) not reachable yet: $($_.Exception.Message)" -ForegroundColor Yellow
    }
  }
}

Write-Step "Done"
Write-Host "Application UUID: $appUuid"
Write-Host "Open: $webPublicUrl"
Write-Host ""
Write-Host "Post-deploy (SSH on Coolify server) - create MinIO bucket once:"
Write-Host '  docker ps | grep minio'
Write-Host '  docker exec -it <minio> mc alias set local http://127.0.0.1:9000 "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD"'
Write-Host '  docker exec -it <minio> mc mb local/sru-chat --ignore-existing'
Write-Host '  docker exec -it <minio> mc anonymous set none local/sru-chat'
Write-Host ""
Write-Host "Firewall reminder: UDP 50000-50100 + TURN ports required for A/V."
Write-Host "DNS reminder: point meeting + livekit A records to $ServerPublicIp"

[pscustomobject]@{
  application_uuid   = $appUuid
  project_uuid       = $ProjectUuid
  server_uuid        = $ServerUuid
  web_public_url     = $webPublicUrl
  livekit_public_url = $livekitPublicUrl
}
