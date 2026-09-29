Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$databasePath = Join-Path $root 'data/cases.json'
$database = Get-Content -LiteralPath $databasePath -Raw -Encoding utf8 | ConvertFrom-Json
$colorNames = @{ white = '白'; black = '黑'; red = '红'; orange = '橙'; gold = '金'; green = '绿'; blue = '蓝'; purple = '紫'; pink = '粉' }
$colorTags = @{ white = '白色'; black = '黑色'; red = '红色'; orange = '橙色'; gold = '金色'; green = '绿色'; blue = '蓝色'; purple = '紫色'; pink = '粉色' }

function Get-ColorBucket([System.Drawing.Color]$pixel) {
  $r = [double]$pixel.R / 255; $g = [double]$pixel.G / 255; $b = [double]$pixel.B / 255
  $max = [Math]::Max($r, [Math]::Max($g, $b)); $min = [Math]::Min($r, [Math]::Min($g, $b))
  $lightness = ($max + $min) / 2; $delta = $max - $min
  if ($lightness -gt 0.82 -and $delta -lt 0.22) { return 'white' }
  if ($lightness -lt 0.20) { return 'black' }
  if ($delta -lt 0.12) { return $null }
  if ($max -eq $r) { $hue = 60 * ((($g - $b) / $delta) % 6) }
  elseif ($max -eq $g) { $hue = 60 * ((($b - $r) / $delta) + 2) }
  else { $hue = 60 * ((($r - $g) / $delta) + 4) }
  if ($hue -lt 0) { $hue += 360 }
  if ($hue -lt 18 -or $hue -ge 342) { return $(if ($lightness -gt 0.48) { 'pink' } else { 'red' }) }
  if ($hue -lt 42) { return 'orange' }
  if ($hue -lt 66) { return 'gold' }
  if ($hue -lt 170) { return 'green' }
  if ($hue -lt 255) { return 'blue' }
  if ($hue -lt 320) { return 'purple' }
  return 'pink'
}

function Get-DominantColors([object]$case) {
  $counts = @{}
  foreach ($imageUrl in @($case.images)) {
    $imagePath = Join-Path $root ('data' + $imageUrl.Replace('/', '\\'))
    $sourceImage = [System.Drawing.Image]::FromFile($imagePath)
    $thumbnail = [System.Drawing.Bitmap]::new($sourceImage, 120, 120)
    $sourceImage.Dispose()
    for ($x = 0; $x -lt 120; $x += 3) {
      for ($y = 0; $y -lt 120; $y += 3) {
        $bucket = Get-ColorBucket $thumbnail.GetPixel($x, $y)
        if ($bucket) { $counts[$bucket] = 1 + [int]($counts[$bucket] ?? 0) }
      }
    }
    $thumbnail.Dispose()
  }
  return @($counts.GetEnumerator() | Sort-Object Value -Descending | Select-Object -First 2 -ExpandProperty Key)
}

$targetCases = @($database.cases | Where-Object { $_.id -like 'issue12-*' -and $_.sourceFolder -notmatch '^\d+[_-]' })
$results = @()
foreach ($case in $targetCases) {
  $dominant = @(Get-DominantColors $case)
  if (!$dominant.Count) { continue }
  $combined = ($dominant | ForEach-Object { $colorNames[$_] }) -join ''
  $tags = @('无吊顶', '小预算', $combined) + @($dominant | ForEach-Object { $colorTags[$_] })
  $case.tags = @($tags | Select-Object -Unique)
  foreach ($tag in $case.tags) { if ($database.tags -notcontains $tag) { $database.tags += $tag } }
  $case.updatedAt = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
  $results += [PSCustomObject]@{ Folder = $case.sourceFolder; ColorTag = $combined; Tags = $case.tags -join '、' }
}

$database | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath $databasePath -Encoding utf8
$results | Sort-Object Folder | Format-Table -AutoSize
Write-Output "已更新 $($results.Count) 个案例的色系标签。"
