$projectRoot = Resolve-Path "$PSScriptRoot\.."
$outputPath = Join-Path $projectRoot "test-package.zip"

if (Test-Path $outputPath) {
    Remove-Item $outputPath
    Write-Host "Pacote anterior removido."
}

if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
    Write-Error "python nao encontrado no PATH."
    exit 1
}

$pyScript = Join-Path $PSScriptRoot "_zip_helper.py"

Push-Location $projectRoot

$totalFiles = 0
$processed = 0

python $pyScript $outputPath 2>&1 | ForEach-Object {
    if ($_ -match '^TOTAL:(\d+)$') {
        $totalFiles = [int]$Matches[1]
        Write-Host "$totalFiles arquivos encontrados."
    } elseif ($_ -match '^FILE:(\d+)$') {
        $processed = [int]$Matches[1]
        if ($totalFiles -gt 0) {
            $pct = [math]::Min(100, [math]::Round(($processed / $totalFiles) * 100))
            Write-Progress -Activity "Empacotando testes" -Status "$processed/$totalFiles arquivos ($pct%)" -PercentComplete $pct
        }
    }
}

Write-Progress -Activity "Empacotando testes" -Completed

Pop-Location

if (Test-Path $outputPath) {
    $sizeMB = [math]::Round((Get-Item $outputPath).Length / 1MB, 1)
    Write-Host "Pacote criado: $outputPath ($sizeMB MB)"
} else {
    Write-Error "Falha ao criar o pacote."
    exit 1
}
