$ErrorActionPreference = 'Stop'
# Read only the numerical records for Mingzun; this does not clone Generator.
$repository = 'https://api.github.com/repos/J3junluoyu/Generator'
$commit = (Invoke-RestMethod -Uri "$repository/commits/master" -TimeoutSec 60).sha
$reference = [ordered]@{
    repository = 'https://github.com/J3junluoyu/Generator'
    commit = $commit
    sources = @('https://www.jx3box.com/bps/109665', 'https://www.jx3box.com/bps/109685')
}
foreach ($name in @('belongs', 'skills', 'buffs', 'dots', 'recipes')) {
    $uri = "https://raw.githubusercontent.com/J3junluoyu/Generator/$commit/assets/json/$name.json"
    $all = Invoke-RestMethod -Uri $uri -TimeoutSec 120
    $records = $all.'10243'
    if ($null -eq $records) { throw "Missing Mingzun records: $name" }
    $reference[$name] = $records
}
$destination = Join-Path $PSScriptRoot '../src/心法模块/心法/明尊琉璃体/参考数据.json'
$directory = Split-Path -Parent $destination
New-Item -ItemType Directory -Path $directory -Force | Out-Null
$reference | ConvertTo-Json -Depth 50 | Set-Content -LiteralPath $destination -Encoding utf8
Write-Output "Mingzun reference updated: $commit"
