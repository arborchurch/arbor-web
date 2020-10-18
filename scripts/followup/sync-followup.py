#!/usr/bin/env python

# Prerequisites
#
# - The 'yaml' Python package (pip install pyyaml)
# - youtube-dl command
# - ffmpeg command

import os
import pathlib
import urllib.request
import xml.etree.ElementTree as ET

print(os.path.dirname(os.path.realpath(__file__)))

print("Reading local episodes...")
here = pathlib.Path(os.path.dirname(os.path.realpath(__file__)))
episodes = here.parent.parent / 'site' / 'content' / 'the-followup'
for episode in episodes.iterdir():
    if episode.suffix == ".md":
        parts = str(episode.name).split('-')
        if len(parts) < 3:
            continue
        print("Episode " + str(int(parts[0])) + ": " + episode.name)


print("Synchronizing playlist from YouTube...")

# get the RSS XML from YouTube
response = urllib.request.urlopen(
    'https://www.youtube.com/feeds/videos.xml?playlist_id=PLBA3HWqIJ2eos8Ikf0Fwj33W_WiIShBS5')
rss = response.read()

root = ET.fromstring(rss)
for child in root.findall("{http://www.w3.org/2005/Atom}entry"):
    id = child.find("{http://www.youtube.com/xml/schemas/2015}videoId").text
    title = child.find("{http://www.w3.org/2005/Atom}title").text
    date = child.find("{http://www.w3.org/2005/Atom}published").text
    media = child.find("{http://search.yahoo.com/mrss/}group")
    description = media.find("{http://search.yahoo.com/mrss/}description").text
    print(title + " (" + id + "), published " + date)
    
# TODO: Get followup episodes from YAML, find IDs
# If an ID exists on youtube but not in YAML:
# 1. youtube-dl to get its video file audio in FLAC
# 2. ffmpeg to convert FLAC to podcast
# 3. scp podcast M4a to storage
# 4. create and commit YAML 
