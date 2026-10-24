#requires -Version 7.2
param([Parameter(Mandatory=$true)][string]$PackageDirectory)
$ErrorActionPreference = 'Stop'
$packageRoot = (Resolve-Path -LiteralPath $PackageDirectory).Path
$webRoot = Join-Path $packageRoot 'web'
$cacheRoot = Join-Path $PSScriptRoot '../../.cache/local-calculator-assets'
New-Item -ItemType Directory -Force -Path $cacheRoot | Out-Null
$resources = Get-Content -Raw -LiteralPath (Join-Path $packageRoot 'resources.json') | ConvertFrom-Json
$downloadResults = $resources | ForEach-Object -Parallel {
    $resource = $_
    $webRoot = $using:webRoot
    $cacheRoot = $using:cacheRoot
    $target = [IO.Path]::GetFullPath((Join-Path $webRoot $resource.relativePath))
    if (-not $target.StartsWith($webRoot + [IO.Path]::DirectorySeparatorChar)) { throw '资源路径超出网页目录' }
    $cacheName = [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData([Text.Encoding]::UTF8.GetBytes($resource.url)))
    $cacheFile = Join-Path $cacheRoot $cacheName
    try {
        if (-not (Test-Path -LiteralPath $cacheFile)) {
            Invoke-WebRequest -Uri $resource.url -OutFile $cacheFile -TimeoutSec 15 | Out-Null
        }
        New-Item -ItemType Directory -Force -Path (Split-Path $target -Parent) | Out-Null
        Copy-Item -LiteralPath $cacheFile -Destination $target
        [pscustomobject]@{Success=$true;URL=$resource.url}
    } catch { [pscustomobject]@{Success=$false;URL=$resource.url} }
} -ThrottleLimit 6
$failures = @($downloadResults | Where-Object { -not $_.Success } | ForEach-Object { $_.URL })
if ($failures -contains 'https://cdnjs.cloudflare.com/ajax/libs/pako/2.1.0/pako.min.js') { throw '离线压缩库下载失败，不能发布完整本地包' }
$licenseCache = Join-Path $cacheRoot 'pako-2.1.0-LICENSE.txt'
if (-not (Test-Path -LiteralPath $licenseCache)) {
    Invoke-WebRequest -Uri 'https://raw.githubusercontent.com/nodeca/pako/2.1.0/LICENSE' -OutFile $licenseCache -TimeoutSec 20 | Out-Null
}
Copy-Item -LiteralPath $licenseCache -Destination (Join-Path $packageRoot 'licenses/Pako-LICENSE.txt')
[ordered]@{Total=$resources.Count;Downloaded=$resources.Count-$failures.Count;MissingImages=$failures} | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $packageRoot '资源缓存结果.json') -Encoding utf8
Write-Output "资源缓存完成：$($resources.Count-$failures.Count)/$($resources.Count)"
