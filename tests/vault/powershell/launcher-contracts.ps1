#requires -Version 7.0
[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repo = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '../../..')).Path
$launcherSource = Join-Path $repo 'AlderVale Play'
$temp = Join-Path ([IO.Path]::GetTempPath()) "AlderVale Launcher Vault $([guid]::NewGuid().ToString('N'))"
$smokeRepo = Join-Path $temp 'Game checkout with spaces'
$launcherUrl = 'https://github.com/vixttha/AlderVale-Pact-of-Ten.git'
$port = 4178
$smoke = $null
$counts = @{ Passed = 0; Failed = 0 }
$hasWorktree = $false

function Invoke-Git {
    param([string[]] $Arguments)
    $output = & git @Arguments
    if ($LASTEXITCODE -ne 0) { throw "git $($Arguments -join ' ') failed with exit $LASTEXITCODE" }
    $output
}

function Assert-Equal {
    param($Expected, $Actual, [string] $Reason)
    if ($Expected -cne $Actual) {
        throw "${Reason}: expected [$Expected], received [$Actual]"
    }
}

function Assert-Line {
    param([string] $Output, [string] $Line)
    if (($Output -split '\r?\n') -cnotcontains $Line) {
        throw "Expected line [$Line]. Child output:`n$Output"
    }
}

function Invoke-Case {
    param([string] $Name, [scriptblock] $Check)
    try {
        & $Check
        $counts.Passed++
        Write-Host "PASS $Name"
    } catch {
        $counts.Failed++
        Write-Host "FAIL ${Name}: $($_.Exception.Message)"
    }
}

function New-LauncherProcess {
    param([string] $Launcher, [string] $Arguments = '', [hashtable] $Environment = @{})
    $info = [Diagnostics.ProcessStartInfo]::new()
    $info.FileName = Join-Path $env:SystemRoot 'System32/cmd.exe'
    # 'call' is the first command token, so cmd preserves the quoted .cmd path.
    $info.Arguments = "/d /c call `"$Launcher`" $Arguments"
    $info.WorkingDirectory = Split-Path -Parent $Launcher
    $info.UseShellExecute = $false
    $info.RedirectStandardOutput = $true
    $info.RedirectStandardError = $true
    $info.RedirectStandardInput = $true
    $info.Environment['CI'] = 'true'
    foreach ($name in $Environment.Keys) { $info.Environment[$name] = $Environment[$name] }
    $process = [Diagnostics.Process]::Start($info)
    $process.StandardInput.Close()
    @{
        Process = $process
        Out = $process.StandardOutput.ReadToEndAsync()
        Err = $process.StandardError.ReadToEndAsync()
    }
}

function Stop-LauncherProcess {
    param($Child)
    try {
        if (-not $Child.Process.HasExited) {
            try { $Child.Process.Kill($true) }
            catch [InvalidOperationException] { if (-not $Child.Process.HasExited) { throw } }
        }
        if (-not $Child.Process.WaitForExit(10000)) { throw 'Launcher process did not exit after cleanup' }
    } finally {
        $Child.Process.Dispose()
    }
}

function Read-LauncherOutput {
    param($Child)
    "$($Child.Out.GetAwaiter().GetResult())`n$($Child.Err.GetAwaiter().GetResult())"
}

function Invoke-Launcher {
    param([string] $Launcher, [string] $Arguments = '', [hashtable] $Environment = @{},
          [int] $TimeoutMs = 25000)
    $child = New-LauncherProcess -Launcher $Launcher -Arguments $Arguments -Environment $Environment
    try {
        if (-not $child.Process.WaitForExit($TimeoutMs)) {
            $timedOut = $child
            $child = $null
            Stop-LauncherProcess $timedOut
            $output = if ($timedOut.Out.IsCompletedSuccessfully -and $timedOut.Err.IsCompletedSuccessfully) {
                ((Read-LauncherOutput $timedOut) -split '\r?\n' | Select-Object -Last 35) -join "`n"
            } else {
                'Launcher output streams did not close.'
            }
            throw "Launcher did not exit within $TimeoutMs ms. Last child output:`n$output"
        }
        @{ ExitCode = $child.Process.ExitCode; Output = Read-LauncherOutput $child }
    } finally {
        if ($null -ne $child) { Stop-LauncherProcess $child }
    }
}

function New-IsolatedLauncher {
    param([string] $Name)
    $directory = Join-Path $temp $Name
    $null = New-Item -ItemType Directory -Path $directory
    foreach ($file in 'Play AlderVale.cmd', 'play.mjs') {
        Copy-Item -LiteralPath (Join-Path $launcherSource $file) -Destination $directory
    }
    Join-Path $directory 'Play AlderVale.cmd'
}

function New-CachedBuild {
    param([string] $Launcher, [string] $Revision, [string] $Marker)
    $directory = Join-Path (Split-Path -Parent $Launcher) ".installation/$Revision"
    $null = New-Item -ItemType Directory -Path (Join-Path $directory 'dist') -Force
    $null = New-Item -ItemType Directory -Path (Join-Path $directory 'server') -Force
    Set-Content -LiteralPath (Join-Path $directory 'dist/index.html') -Value '<script src="/assets/fixture.js"></script>'
    Set-Content -LiteralPath (Join-Path $directory 'package.json') -Value '{"type":"module"}'
    Set-Content -LiteralPath (Join-Path $directory 'server/wsHub.ts') -Value 'export function attachAldervaleWebSocketServer() {}'
    Set-Content -LiteralPath (Join-Path $directory 'server.ts') -Value @"
export async function createAldervaleApp() {
  return (request, response) => {
    if (request.url === '/api/health') {
      response.setHeader('Content-Type', 'application/json');
      response.end(JSON.stringify({ ok: true, marker: '$Marker' }));
    } else {
      response.end('<script src="/assets/fixture.js"></script>');
    }
  };
}
"@
    Join-Path (Split-Path -Parent $Launcher) '.installation/current.txt'
}

function New-LauncherEnvironment {
    param([string] $Upstream)
    $url = ([uri]::new($Upstream)).AbsoluteUri
    $preload = ([uri]::new((Join-Path $PSScriptRoot 'no-browser.mjs'))).AbsoluteUri
    @{
        GIT_CONFIG_COUNT = '1'
        GIT_CONFIG_KEY_0 = "url.$url.insteadOf"
        GIT_CONFIG_VALUE_0 = $launcherUrl
        NODE_OPTIONS = "--import=$preload"
    }
}

$null = New-Item -ItemType Directory -Path $temp
try {
    $revision = (Invoke-Git -Arguments @('-C', $repo, 'rev-parse', 'HEAD')).Trim()
    if ($revision -cnotmatch '^[0-9a-f]{40}$') { throw "Invalid checkout revision: $revision" }
    Write-Host "Tested checkout: $revision"
    Write-Host "PowerShell version: $($PSVersionTable.PSVersion)"

    Invoke-Case 'E24-003 launcher checkout path with spaces' {
        Invoke-Git -Arguments @('-C', $repo, 'worktree', 'add', '--detach', $smokeRepo, $revision) | Out-Host
        $script:hasWorktree = $true
        $launcher = Join-Path $smokeRepo 'AlderVale Play/Play AlderVale.cmd'
        $script:smoke = Invoke-Launcher -Launcher $launcher -Arguments '--smoke --checkout' -TimeoutMs 480000
        Assert-Equal 0 $script:smoke.ExitCode "Launcher startup at $smokeRepo. $($script:smoke.Output)"
        $index = Join-Path $smokeRepo "AlderVale Play/.installation/$revision/dist/index.html"
        if (-not (Test-Path -LiteralPath $index -PathType Leaf)) { throw "Launcher did not produce $index" }
    }

    Invoke-Case 'E24-004 launcher reports the exact checkout revision' {
        if ($null -eq $smoke) { throw 'The real launcher smoke produced no result' }
        Assert-Equal 0 $smoke.ExitCode "Launcher startup. $($smoke.Output)"
        Assert-Line $smoke.Output "AlderVale $revision passed the install and startup check."
        Write-Host "  Reported build: $revision"
    }

    Invoke-Case 'E24-005 missing Node guidance and failure exit' {
        $launcher = New-IsolatedLauncher 'Missing Node fixture'
        $windowsTools = Join-Path $env:SystemRoot 'System32'
        $result = Invoke-Launcher -Launcher $launcher -Environment @{ PATH = $windowsTools } -TimeoutMs 12000
        Assert-Equal 1 $result.ExitCode "Missing-Node exit code. $($result.Output)"
        Assert-Line $result.Output 'Install Node.js 24 LTS, then reopen this launcher.'
        if (Test-Path -LiteralPath (Join-Path (Split-Path -Parent $launcher) '.installation')) {
            throw 'Missing Node reached the game installation'
        }
    }

    Invoke-Case 'E24-006 failed update starts the saved build' {
        $launcher = New-IsolatedLauncher 'Unavailable update fixture'
        $cached = $revision
        $marker = [guid]::NewGuid().ToString('N')
        $receipt = New-CachedBuild $launcher $cached $marker
        [IO.File]::WriteAllText($receipt, $cached)
        $missing = Join-Path $temp 'missing upstream.git'
        $ready = Join-Path (Split-Path -Parent $launcher) 'ready.txt'
        $environment = New-LauncherEnvironment $missing
        $environment.ALDER_VAULT_READY_FILE = $ready
        $child = New-LauncherProcess -Launcher $launcher -Environment $environment
        try {
            $timer = [Diagnostics.Stopwatch]::StartNew()
            while ($timer.Elapsed.TotalSeconds -lt 20 -and -not $child.Process.HasExited) {
                if (Test-Path -LiteralPath $ready -PathType Leaf) { break }
                Start-Sleep -Milliseconds 100
            }
            if ($child.Process.HasExited) {
                throw "Launcher exited before starting the saved build.`n$(Read-LauncherOutput $child)"
            }
            if (-not (Test-Path -LiteralPath $ready -PathType Leaf)) {
                throw 'Saved build did not become ready within 20 seconds'
            }
            $url = "http://127.0.0.1:$port"
            Assert-Equal $url ([IO.File]::ReadAllText($ready)) 'Browser target URL'
            $health = Invoke-RestMethod -Uri "$url/api/health" -TimeoutSec 5 -NoProxy
            Assert-Equal $true $health.ok 'Saved build health'
            Assert-Equal $marker $health.marker 'Saved build marker'
            Assert-Equal $cached ([IO.File]::ReadAllText($receipt)) 'Fallback receipt bytes'
        } finally {
            Stop-LauncherProcess $child
        }
        $output = Read-LauncherOutput $child
        $short = $cached.Substring(0, 12)
        if ($output -notmatch "Update unavailable\. Playing saved build $short\.") {
            throw "Missing cached revision in fallback diagnostic.`n$output"
        }
        Assert-Line $output "AlderVale $short is ready at http://127.0.0.1:${port}. Close this window to stop playing."
        Assert-Line $output 'Vault suppressed browser launch'
    }

    Invoke-Case 'E24-007 occupied port preserves the saved build receipt' {
        $launcher = New-IsolatedLauncher 'Port collision fixture'
        $localUpstream = Join-Path $temp 'Local upstream'
        Invoke-Git -Arguments @('init', '--initial-branch=main', $localUpstream) | Out-Host
        Invoke-Git -Arguments @('-C', $localUpstream, '-c', 'user.name=Vault Fixture', '-c',
            'user.email=fixture@example.invalid', '-c', 'commit.gpgsign=false', 'commit',
            '--allow-empty', '-m', 'Synthetic launcher fixture') | Out-Host
        $candidate = (Invoke-Git -Arguments @('-C', $localUpstream, 'rev-parse', 'HEAD')).Trim()
        $null = New-CachedBuild $launcher $candidate 'new-build'
        $receipt = New-CachedBuild $launcher $revision 'old-build'
        [IO.File]::WriteAllText($receipt, $revision)
        $listener = [Net.Sockets.TcpListener]::new([Net.IPAddress]::Loopback, $port)
        $listener.Server.ExclusiveAddressUse = $true
        try {
            $listener.Start()
            $result = Invoke-Launcher -Launcher $launcher -Environment (New-LauncherEnvironment $localUpstream)
            Assert-Equal 1 $result.ExitCode "Occupied port exit code. $($result.Output)"
            Assert-Line $result.Output "Port $port is in use. Close the other game window and try again."
            if ($result.Output -match 'Update unavailable|Vault suppressed browser launch') {
                throw "The launcher tried fallback or opened a browser after the port error.`n$($result.Output)"
            }
            $mirror = Join-Path (Split-Path -Parent $launcher) '.installation/repository.git'
            $fetched = (Invoke-Git -Arguments @('-C', $mirror, 'rev-parse', 'refs/heads/play-main')).Trim()
            Assert-Equal $candidate $fetched 'Candidate resolved before port collision'
            Assert-Equal $revision ([IO.File]::ReadAllText($receipt)) 'Last working revision receipt'
        } finally {
            $listener.Stop()
        }
    }

    Write-Host "PowerShell launcher contracts: $($counts.Passed)/5 passed"
    if ($counts.Failed) { throw "$($counts.Failed) PowerShell launcher contract(s) failed" }
} finally {
    try {
        if ($hasWorktree) {
            # npm can create paths longer than Git for Windows' default limit.
            Invoke-Git -Arguments @('-C', $repo, '-c', 'core.longpaths=true',
                'worktree', 'remove', '--force', $smokeRepo) | Out-Host
        }
    } finally {
        Remove-Item -LiteralPath $temp -Recurse -Force
    }
}
