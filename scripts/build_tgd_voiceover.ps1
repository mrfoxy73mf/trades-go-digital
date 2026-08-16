$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName System.Speech

$projectRoot = if ($PSScriptRoot) { Split-Path -Parent $PSScriptRoot } else { (Get-Location).Path }
$voiceDir = Join-Path $projectRoot 'tmp\tgd-voiceover'
New-Item -ItemType Directory -Force -Path $voiceDir | Out-Null

$lines = @(
    'T G D Trades. Your trade business, in one connected system.',
    'Know which jobs, takings, and outstanding work need your attention.',
    'Build quotes from your rolling list of saved materials and prices.',
    'Supplier invoices and receipts help A I keep your material prices current.',
    'Keep customer details, notes, photos, and paperwork connected to the job.',
    'Move accepted working dates straight into your calendar.',
    'Supplier emails arrive in the Office Mailroom, where A I scans every document.',
    'Invoices and receipts are filed into the correct Business Office folder.',
    'Send the monthly accountant report with one tap, or schedule it automatically.',
    'Manage vehicles, mileage, and business records wherever you work.',
    'Less than one pound a day for your first three months. Start T G D Trades today.'
)

$speaker = New-Object System.Speech.Synthesis.SpeechSynthesizer
$speaker.SelectVoice('Microsoft Hazel Desktop')
$speaker.Rate = 0
$speaker.Volume = 100

for ($index = 0; $index -lt $lines.Count; $index++) {
    $path = Join-Path $voiceDir ('line-{0:D2}.wav' -f $index)
    $speaker.SetOutputToWaveFile($path)
    $speaker.Speak($lines[$index])
    $speaker.SetOutputToNull()
}

$speaker.Dispose()
Write-Output $voiceDir
