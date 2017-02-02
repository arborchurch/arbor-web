#!/usr/bin/env bash
# Usage:
# encode-sermon.sh "sermon title" "speaker" wav mp3

lame -m m \
     --verbose \
     --preset 96 \
     -h \
     --tt "$1" \
     --ta "$2" \
     --tl "Arbor Church" \
     --ty 2017 \
     "$3" \
     "$4"



