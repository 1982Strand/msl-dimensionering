param(
    [Parameter(Mandatory=$true)][string]$InputDirectory,
    [Parameter(Mandatory=$true)][string]$OutputDirectory
)
$ErrorActionPreference = 'Stop'
$sourceDirectory = (Resolve-Path -LiteralPath $InputDirectory).Path
$null = New-Item -ItemType Directory -Force -Path $OutputDirectory
$destinationDirectory = (Resolve-Path -LiteralPath $OutputDirectory).Path
$word = $null
$measurements = @()
try {
    # A separate hidden Word instance; never attach to the user's open documents.
    $word = New-Object -ComObject Word.Application
    $word.Visible = $false
    $word.DisplayAlerts = 0
    $word.AutomationSecurity = 3
    foreach ($file in Get-ChildItem -LiteralPath $sourceDirectory -Filter '*.docx' -File) {
        $document = $null
        $timer = [System.Diagnostics.Stopwatch]::StartNew()
        try {
            $document = $word.Documents.Open($file.FullName, $false, $true, $false)
            $pdfPath = Join-Path $destinationDirectory ($file.BaseName + '.pdf')
            $document.ExportAsFixedFormat($pdfPath, 17)
            $timer.Stop()
            $measurements += [pscustomobject]@{ name=$file.BaseName; milliseconds=$timer.Elapsed.TotalMilliseconds; wordVersion=$word.Version }
            Write-Output $file.BaseName
        } finally {
            if ($null -ne $document) {
                $document.Close(0)
                $null = [System.Runtime.InteropServices.Marshal]::FinalReleaseComObject($document)
            }
        }
    }
} finally {
    if ($null -ne $word) {
        $word.Quit(0)
        $null = [System.Runtime.InteropServices.Marshal]::FinalReleaseComObject($word)
    }
}
$measurements | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath (Join-Path $destinationDirectory 'timings.json') -Encoding utf8
