# Pixela - local server (no install needed). Close this window to stop.
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$port = 8000
$mime = @{
  '.html'='text/html; charset=utf-8'; '.js'='text/javascript; charset=utf-8'; '.mjs'='text/javascript; charset=utf-8'
  '.css'='text/css; charset=utf-8'; '.json'='application/json'; '.svg'='image/svg+xml'; '.png'='image/png'
  '.jpg'='image/jpeg'; '.jpeg'='image/jpeg'; '.webp'='image/webp'; '.gif'='image/gif'; '.ico'='image/x-icon'
  '.mp4'='video/mp4'; '.webm'='video/webm'; '.woff2'='font/woff2'; '.woff'='font/woff'; '.ttf'='font/ttf'; '.txt'='text/plain'
}
$listener = $null
foreach ($p in 8000..8010) {
  try { $l = New-Object System.Net.HttpListener; $l.Prefixes.Add("http://localhost:$p/"); $l.Start(); $listener = $l; $port = $p; break } catch { }
}
if (-not $listener) { Write-Host 'Port acilamadi (8000-8010 dolu).'; Read-Host 'Kapatmak icin Enter'; exit 1 }
$url = "http://localhost:$port/"
Write-Host ''
Write-Host "  PIXELA calisiyor:  $url" -ForegroundColor Yellow
Write-Host '  Kapatmak icin bu pencereyi kapat.'
Write-Host ''
Start-Process $url
while ($listener.IsListening) {
  $ctx = $listener.GetContext()
  $req = $ctx.Request; $res = $ctx.Response
  try {
    $rel = [System.Uri]::UnescapeDataString($req.Url.AbsolutePath).TrimStart('/')
    if ($rel -eq '') { $rel = 'index.html' }
    $path = [System.IO.Path]::GetFullPath((Join-Path $root $rel))
    if (-not $path.StartsWith($root) -or -not (Test-Path $path -PathType Leaf)) {
      $res.StatusCode = 404; $b = [Text.Encoding]::UTF8.GetBytes('404'); $res.OutputStream.Write($b, 0, $b.Length)
    } else {
      $ext = [System.IO.Path]::GetExtension($path).ToLower()
      $res.ContentType = if ($mime.ContainsKey($ext)) { $mime[$ext] } else { 'application/octet-stream' }
      $res.Headers.Add('Accept-Ranges', 'bytes')
      $fs = [System.IO.File]::OpenRead($path)
      try {
        $len = $fs.Length; $start = 0; $end = $len - 1
        $range = $req.Headers['Range']
        if ($range -and $range -match 'bytes=(\d*)-(\d*)') {
          if ($matches[1] -ne '') { $start = [int64]$matches[1] }
          if ($matches[2] -ne '') { $end = [Math]::Min([int64]$matches[2], $len - 1) }
          $res.StatusCode = 206
          $res.Headers.Add('Content-Range', "bytes $start-$end/$len")
        }
        $count = $end - $start + 1
        $res.ContentLength64 = $count
        if ($req.HttpMethod -ne 'HEAD') {
          $fs.Seek($start, 'Begin') | Out-Null
          $buf = New-Object byte[] 65536
          while ($count -gt 0) {
            $n = $fs.Read($buf, 0, [int][Math]::Min($buf.Length, $count))
            if ($n -le 0) { break }
            $res.OutputStream.Write($buf, 0, $n); $count -= $n
          }
        }
      } finally { $fs.Close() }
    }
  } catch { } finally { try { $res.Close() } catch { } }
}
