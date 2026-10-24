$ErrorActionPreference = 'Stop'
$commit = '8fad4eb8b52fa435bc656e7731ccbf40d6d41126'
$raw = "https://raw.githubusercontent.com/J3junluoyu/Generator/$commit/assets/json"
function Attribute-Map($entries, [bool]$preserveUnmapped = $false) {
    $result = [ordered]@{}
    foreach ($entry in $entries) {
        $attributeKey = $entry.attr_type
        if (-not $attributeKey -and $preserveUnmapped) { $attributeKey = $entry.attr }
        if ($attributeKey) {
            if ($entry.value -is [string]) {
                $result[$attributeKey] = (@($result[$attributeKey], $entry.value) | Where-Object { $_ }) -join ' | '
            } else { $result[$attributeKey] = ($result[$attributeKey] + $entry.value) }
        }
    }
    return $result
}
$items = @()
foreach ($category in @('armors', 'trinkets', 'weapons')) {
    $all = Invoke-RestMethod -Uri "$raw/$category.json" -TimeoutSec 120
    foreach ($row in $all.PSObject.Properties.Value) {
        $isTank = $row.kind -eq '防御' -and $row.school -in @('明教', '通用')
        $isSimplifiedInner = $row.school -eq '精简' -and $row.kind -eq '内功'
        # ALL equipment can be used in PVE too (including the Mingzun legendary weapon).
        if ((-not $isTank -and -not $isSimplifiedInner) -or $row.usage -notin @('PVE', 'ALL') -or $row.level -lt 1110) { continue }
        if ($isTank -and @($row.magic | Where-Object { $_.attr_type -eq 'haste_base' -and $_.value -gt 0 }).Count -eq 0) { continue }
        if ($row.position -eq 'primary_weapon' -and $row.school -ne '明教') { continue }
        $sets = [ordered]@{}
        foreach ($bonus in $row.sets.PSObject.Properties) { $sets[$bonus.Name] = Attribute-Map $bonus.Value }
        $item = [ordered]@{
            key = "$category`:$($row.id)"; id = $row.id; name = $row.name; school = $row.school
            kind = $row.kind; usage = $row.usage
            position = $row.position; level = $row.level; maxStrength = $row.max_strength
            base = Attribute-Map $row.base; magic = Attribute-Map $row.magic
            embed = Attribute-Map $row.embed $true; setId = $row.set_id; sets = $sets
        }
        if ($row.position -eq 'primary_weapon' -and $row.school -eq '明教' -and $row.skill -and $row.skill[0] -eq 4941) {
            $item.orangeWeapon = $true
        }
        $items += $item
    }
}
$allEnchants = Invoke-RestMethod -Uri "$raw/enchants.json" -TimeoutSec 120
$enchants = @($allEnchants.PSObject.Properties.Value | Where-Object { -not $_.temporary } | ForEach-Object {
    [ordered]@{ id = $_.id; name = $_.name; position = $_.position; attributes = Attribute-Map $_.attributes }
})
$allStones = Invoke-RestMethod -Uri "$raw/stones.json" -TimeoutSec 120
$seen = @{}
$stones = @($allStones.PSObject.Properties.Value | Where-Object {
    if ($_.level -eq 6 -and -not $seen[$_.enchant_id]) { $seen[$_.enchant_id] = $true; $true } else { $false }
} | ForEach-Object {
    [ordered]@{ id = $_.enchant_id; name = $_.name; level = $_.level; attributes = Attribute-Map $_.attributes $true }
})
$output = [ordered]@{ commit = $commit; items = $items; enchants = $enchants; stones = $stones }
$destination = Join-Path $PSScriptRoot '../src/心法模块/心法/明尊琉璃体/装备数据.json'
$output | ConvertTo-Json -Depth 30 | Set-Content -LiteralPath $destination -Encoding utf8
Write-Output "Equipment: $($items.Count); enchants: $($enchants.Count); stones: $($stones.Count)"
& (Join-Path $PSScriptRoot 'update-mingzun-threat.ps1')
