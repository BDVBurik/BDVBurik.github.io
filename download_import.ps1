$importDir = Join-Path $PSScriptRoot "import"
New-Item -ItemType Directory -Force -Path $importDir | Out-Null

$urls = @(
  "http://lampalampa.free.nf/uacoments.js",
  "https://beta.l-vid.online/syncpro.js",
  "http://wtch.ch/m",
  "http://bwa.ad/rc",
  "https://skaztv.online/js/tricks.js",
  "https://lampame.github.io/main/TraktTV/TraktTV.js",
  "https://lampame.github.io/main/hikka.js",
  "https://lampame.github.io/main/cw.js",
  "https://lampame.github.io/main/newcategory.js",
  "https://bywolf88.github.io/lampa-plugins/interface_mod.js",
  "https://icantrytodo.github.io/lampa/torrent_styles_v2.js",
  "https://darkestclouds.github.io/plugins/easytorrent/easytorrent.min.js",
  "https://and7ey.github.io/lampa/head_filter.js",
  "https://lampame.github.io/main/bo.js",
  "https://igorek1986.github.io/lampa-plugins/myshows.js",
  "http://lampaua.mooo.com/remotekeyboard.js"
)

function Get-FileNameFromUrl($url) {
  $uri = [Uri]$url
  $name = [System.IO.Path]::GetFileName($uri.LocalPath)
  if ([string]::IsNullOrWhiteSpace($name) -or $name -eq "/") {
    $hostPart = $uri.Host -replace '[^a-zA-Z0-9._-]', '_'
    $pathPart = $uri.LocalPath.Trim('/') -replace '[/\\]', '_'
    if ($pathPart) { $name = "${hostPart}_${pathPart}.js" } else { $name = "${hostPart}.js" }
  }
  if (-not $name.EndsWith('.js')) { $name = "$name.js" }
  return $name
}

$ok = 0
$fail = 0
foreach ($url in $urls) {
  $fileName = Get-FileNameFromUrl $url
  $outPath = Join-Path $importDir $fileName
  try {
    Invoke-WebRequest -Uri $url -OutFile $outPath -UseBasicParsing -TimeoutSec 90
    $size = (Get-Item $outPath).Length
    Write-Host "OK  $fileName ($size bytes)"
    $ok++
  } catch {
    Write-Host "FAIL $fileName - $($_.Exception.Message)"
    $fail++
  }
}

Write-Host "Done: $ok OK, $fail FAIL -> $importDir"
