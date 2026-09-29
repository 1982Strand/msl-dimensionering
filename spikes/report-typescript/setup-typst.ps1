$ErrorActionPreference = 'Stop'
$target = Join-Path (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path '.local/typst'
$null = New-Item -ItemType Directory -Force -Path $target
$url = 'https://github.com/typst/typst/releases/download/v0.15.1/typst-x86_64-pc-windows-msvc.zip'
$archive = Join-Path $target 'download.zip'
Invoke-WebRequest -Uri $url -OutFile $archive
$expected = '19ce3551153c2fe7ee9fa2f95208310c8f4d3209fedb699e0333faf8913f6736'
if ((Get-FileHash -LiteralPath $archive -Algorithm SHA256).Hash.ToLower() -ne $expected) {
    throw 'Typst archive checksum mismatch'
}
Expand-Archive -LiteralPath $archive -DestinationPath (Join-Path $target 'v0.15.1') -Force
& (Join-Path $target 'v0.15.1/typst-x86_64-pc-windows-msvc/typst.exe') --version
