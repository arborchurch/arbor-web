#!/usr/bin/env pwsh
# Usage:
# .\encode-sermon.ps1 "sermon title" "speaker" "input.wav" "output.mp3"

param (
    [string]$Title,
    [string]$Author,
    [string]$InputFile,
    [string]$OutputFile
)

# Get the current year
$currentYear = (Get-Date).Year

# Encode to mp3
ffmpeg -i $InputFile `
       -b:a 96k `
       -ac 1 `
       -metadata title=$Title `
       -metadata author=$Author `
       -metadata year=$crrentYear `
       -movflags +faststart `
       $OutputFile

# Calculate duration and file size for metadata
$duration = ffprobe -i $InputFile -show_entries format=duration -v quiet -of csv="p=0" -sexagesimal | ForEach-Object { $_.Split('.')[0] }
$bytes = (Get-Item $OutputFile).length

Write-Host "---"
Write-Host "podcast_bytes: $bytes"
Write-Host "podcast_duration: $duration"
Write-Host "---"

# Upload encoded version to web host
scp $OutputFile arborchurch@arborchurchnw.org:arborchurchnw.org/podcast/

# Upload original to web host
scp $InputFile arborchurch@arborchurchnw.org:arborchurchnw.org/podcast/originals/
