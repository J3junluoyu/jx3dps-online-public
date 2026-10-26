$ErrorActionPreference = 'Stop'
$mingzunReference = Get-Content -Raw -LiteralPath (Join-Path $PSScriptRoot '../src/心法模块/心法/明尊琉璃体/参考数据.json') | ConvertFrom-Json
$commit = $mingzunReference.commit
$reference = [ordered]@{ repository = 'https://github.com/J3junluoyu/Generator'; commit = $commit; kungfu = '10002' }
foreach ($name in @('belongs', 'skills', 'buffs', 'dots', 'recipes')) {
    $all = Invoke-RestMethod -Uri "https://raw.githubusercontent.com/J3junluoyu/Generator/$commit/assets/json/$name.json" -TimeoutSec 90
    if ($null -eq $all.'10002') { throw "Missing Xi Sui Jing records: $name" }
    $reference[$name] = $all.'10002'
}
$directory = Join-Path $PSScriptRoot '../src/心法模块/心法/洗髓经'
New-Item -ItemType Directory -Path $directory -Force | Out-Null
$reference | ConvertTo-Json -Depth 60 | Set-Content -LiteralPath (Join-Path $directory '参考数据.json') -Encoding utf8
$cache = Join-Path $PSScriptRoot '../../.cache/xisui-reference'
New-Item -ItemType Directory -Path $cache -Force | Out-Null
foreach ($name in @('attribute', 'talents', 'skills', 'buffs', 'recipes', 'dots', '__init__')) {
    Invoke-WebRequest -Uri "https://raw.githubusercontent.com/J3junluoyu/Generator/$commit/kungfus/xi_sui_jing/$name.py" -OutFile (Join-Path $cache "$name.py") -TimeoutSec 60
}
Write-Output "Xi Sui Jing reference updated: $commit"
