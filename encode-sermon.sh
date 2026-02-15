#!/usr/bin/env bash
# Usage:
# encode-sermon.sh "sermon title" "speaker" wav [mp3]

# if mp3 filename not provided, derive from input filename
INPUT="$3"
OUTPUT="${4:-${INPUT%.*}.mp3}"

# encode to mp3
ffmpeg -i "$INPUT" \
       -b:a 96k \
       -ac 1 \
       -metadata title="$1" \
       -metadata author="$2" \
       -metadata year=$(date +%Y) \
       -movflags +faststart \
       "$OUTPUT"

# calculate duration and file size for metadata
DURATION=$(ffprobe -i "$INPUT" -show_entries format=duration -v quiet -of csv="p=0" -sexagesimal | sed -e 's/\..*//')
BYTES=$(stat -f "%z" "$OUTPUT")

echo "---"
echo "podcast_bytes: $BYTES"
echo "podcast_duration: $DURATION"
echo "---"

# upload encoded version to web host
scp "$OUTPUT" arborchurch@arborchurchnw.org:arborchurchnw.org/podcast

# upload original to web host
scp "$INPUT" arborchurch@arborchurchnw.org:arborchurchnw.org/podcast/originals


