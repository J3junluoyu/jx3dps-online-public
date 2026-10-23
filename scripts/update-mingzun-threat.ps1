param([string]$SourceDirectory)

$ErrorActionPreference = 'Stop'
$repository = 'https://github.com/IcyTide/Generator'
$commit = 'b7d609a4a87f92a7b3907efe9141bdfdfb8c3f9e'
$destination = Join-Path $PSScriptRoot '../src/心法模块/心法/明尊琉璃体/装备数据.json'
$database = Get-Content -Raw -LiteralPath $destination | ConvertFrom-Json
$sources = @{}
foreach ($category in @('armors', 'trinkets', 'weapons')) {
    $sources[$category] = if ($SourceDirectory) {
        Get-Content -Raw -LiteralPath (Join-Path $SourceDirectory "upstream_assets_json_$category.json") | ConvertFrom-Json
    } else {
        Invoke-RestMethod -Uri "https://raw.githubusercontent.com/IcyTide/Generator/$commit/assets/json/$category.json" -TimeoutSec 120
    }
}

# Only refresh threat attributes. Other equipment, enchants and stones retain their pinned source.
function Update-Threat($attributes, $entries) {
    $result = [ordered]@{}
    foreach ($property in $attributes.PSObject.Properties) {
        if ($property.Name -notin @('threat_gain', 'atActiveThreatCoefficient')) {
            $result[$property.Name] = $property.Value
        } else {
            # Keep the original socket index when renaming the legacy field.
            $result['threat_gain'] = 0
        }
    }
    $threat = @($entries | Where-Object { $_.attr_type -eq 'threat_gain' })
    if ($threat.Count) {
        $result['threat_gain'] = ($threat | Measure-Object -Property value -Sum).Sum
    } else {
        $result.Remove('threat_gain')
    }
    return $result
}

foreach ($item in $database.items) {
    $category = $item.key.Split(':')[0]
    $row = $sources[$category].PSObject.Properties[[string]$item.id].Value
    if (-not $row) { throw "Missing source equipment: $($item.key)" }
    foreach ($part in @('base', 'magic', 'embed')) {
        $item.$part = Update-Threat $item.$part $row.$part
    }
    foreach ($bonus in $item.sets.PSObject.Properties) {
        $bonus.Value = Update-Threat $bonus.Value $row.sets.PSObject.Properties[$bonus.Name].Value
    }
}
$database | Add-Member -NotePropertyName threatSource -NotePropertyValue ([ordered]@{
    repository = $repository
    commit = $commit
}) -Force
$database | ConvertTo-Json -Depth 30 | Set-Content -LiteralPath $destination -Encoding utf8
Write-Output "Updated equipment threat attributes from $commit"
