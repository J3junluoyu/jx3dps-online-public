param(
    [string]$SourceDirectory,
    [string]$Commit = 'ee2c4c0f502c82a3ab615355cdc80073b6bf1713',
    [string]$Repository = 'IcyTide/Generator',
    [string]$NodeExecutable = 'node'
)
$ErrorActionPreference = 'Stop'
if ($Commit -notmatch '^[a-f0-9]{40}$') { throw '必须固定考拉完整提交SHA' }
if (-not $SourceDirectory) {
    $SourceDirectory = Join-Path $PSScriptRoot "../../.cache/koala-equipment-$Commit"
    New-Item -ItemType Directory -Force -Path $SourceDirectory | Out-Null
    foreach ($category in @('armors', 'trinkets', 'weapons', 'enchants', 'stones', 'skills')) {
        $destination = Join-Path $SourceDirectory "assets_json_$category.json"
        Invoke-WebRequest -Uri "https://raw.githubusercontent.com/$Repository/$Commit/assets/json/$category.json" -OutFile $destination -UseBasicParsing -TimeoutSec 120
    }
}
# 同一提交一次适配普通装备、两心法橙武、水风特效、附魔、五彩石及黄字伤害；
# 不再调用固定旧提交的threat脚本，避免把新装备的威胁属性覆盖回旧值。
& $NodeExecutable (Join-Path $PSScriptRoot 'sync-koala-equipment.cjs') --source-dir $SourceDirectory --repository "https://github.com/$Repository" --commit $Commit --write
if ($LASTEXITCODE -ne 0) { throw '考拉装备同步失败，检查源数据和错误说明' }
