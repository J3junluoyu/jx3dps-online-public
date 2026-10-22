$ErrorActionPreference = 'Stop'
# Read only Koala gain records; do not clone or execute remote Python code.
$module = Join-Path $PSScriptRoot '../src/心法模块/心法/明尊琉璃体'
$commit = (Get-Content -LiteralPath (Join-Path $module '参考数据.json') -Raw | ConvertFrom-Json).commit
$base = "https://raw.githubusercontent.com/J3junluoyu/Generator/$commit"
$buffs = (Invoke-RestMethod -Uri "$base/assets/json/buffs.json" -TimeoutSec 60).'0'
$groups = [ordered]@{}
foreach ($id in @(10438, 10179, 10067, 10071, 23768, 545, 567, 246, 5939, 31208, 13422, 18819, 3980, 13050, 44566)) {
    if (!$buffs."$id") { throw "Missing Koala gain group: $id" }
    $groups["$id"] = $buffs."$id"
}
$enchantText = (Invoke-WebRequest -UseBasicParsing -Uri "$base/assets/raw/enchants.py" -TimeoutSec 60).Content
# This generated file is a JSON-compatible literal after removing its assignment.
$enchants = ($enchantText -replace '^ENCHANTS\s*=\s*', '') | ConvertFrom-Json
$reference = [ordered]@{
    repository = 'https://github.com/J3junluoyu/Generator'
    commit = $commit
    sources = @('assets/json/buffs.json', 'assets/raw/enchants.py', 'gains/consumables.py', 'gains/teams.py', 'base/attribute.py')
    buffs = $groups
    weaponEnchants = $enchants.consumables
}
$reference | ConvertTo-Json -Depth 40 | Set-Content -LiteralPath (Join-Path $module '增益数据.json') -Encoding utf8
Write-Output "Koala gains updated: $commit"
