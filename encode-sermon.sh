#!/usr/bin/env bash
# Usage:
# encode-sermon.sh "sermon title" "speaker" wav mp3

# encode to mp3
ffmpeg -i "$3" \
       -b:a 96k \
       -ac 1 \
       -metadata title="$1" \
       -metadata author="$2" \
       -metadata year=2024 \
       -movflags +faststart \
       "$4"

# calculate duration and file size for metadata
DURATION=$(ffprobe -i "$3" -show_entries format=duration -v quiet -of csv="p=0" -sexagesimal | sed -e 's/\..*//')
BYTES=$(stat -f "%z" "$4")

echo "---"
echo "podcast_bytes: $BYTES"
echo "podcast_duration: $DURATION"
echo "---"

# upload encoded version to web host
scp "$4" arborchurch@arborchurchnw.org:arborchurchnw.org/podcast

# upload original to web host
scp "$3" arborchurch@arborchurchnw.org:arborchurchnw.org/podcast/originals


