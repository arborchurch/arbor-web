#!/usr/bin/env python

import urllib.request
import xml.etree.ElementTree as ET

# get the RSS XML from YouTube
response = urllib.request.urlopen(
    'https://www.youtube.com/feeds/videos.xml?playlist_id=PLBA3HWqIJ2eos8Ikf0Fwj33W_WiIShBS5')
rss = response.read()

root = ET.fromstring(rss)
for child in root:
    if child.tag == "entry":
        id = child.find("yt:videoId")
        print(child.text)

# TODO: Get followup episodes from YAML, find IDs
# If an ID exists on youtube but not in YAML:
# 1. youtube-dl to get its video file audio in FLAC
# 2. ffmpeg to convert FLAC to podcast
# 3. scp podcast M4a to storage
# 4. create and commit YAML 
