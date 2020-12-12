#!/usr/bin/env python3

# Prerequisites
#
# - The 'yaml' Python package (pip install pyyaml)
# - youtube-dl command
# - ffmpeg command

import os
import re
import pathlib
import urllib.request
import xml.etree.ElementTree as ET
import yaml
import subprocess

print(os.path.dirname(os.path.realpath(__file__)))

local_ids = []
remote_ids = []
max_id = 0

print("Reading local episodes...")
here = pathlib.Path(os.path.dirname(os.path.realpath(__file__)))
episodes = here.parent.parent / 'site' / 'content' / 'the-followup'
for episode in episodes.iterdir():
    if episode.suffix == ".md":
        parts = str(episode.name).split('-')
        if len(parts) < 3:
            continue

        # read local episode
        f = open(episode, mode='r')
        content = f.read().split("---")
        f.close()
        if (len(content)) < 3:
            continue

        # parse out YAML
        metadata = yaml.load(content[1], Loader = yaml.FullLoader)
        id = metadata["youtube_id"]
        local_ids.append(id)

        # compute largest id
        max_id = max(int(parts[0]), max_id)

        print("Episode " + str(int(parts[0])) + ": " + episode.name + " (" + id + ")")


print("Synchronizing playlist from YouTube...")

# get the RSS XML from YouTube
response = urllib.request.urlopen(
    'https://www.youtube.com/feeds/videos.xml?channel_id=UCRe_QiHhuGwlIY43ECFopNQ')
rss = response.read()

root = ET.fromstring(rss)
for child in root.findall("{http://www.w3.org/2005/Atom}entry"):
    id = child.find("{http://www.youtube.com/xml/schemas/2015}videoId").text
    title = child.find("{http://www.w3.org/2005/Atom}title").text
    date = child.find("{http://www.w3.org/2005/Atom}published").text
    media = child.find("{http://search.yahoo.com/mrss/}group")
    description = media.find("{http://search.yahoo.com/mrss/}description").text
    if "The Followup" in title:
        # strip prefix from title
        title = title.replace("The Followup // ", "")
        print(title + " (" + id + "), published " + date)
        if id in local_ids: 
            print("Already published")
        else:
            frontmatter = {}
            frontmatter["youtube_id"] = id
            frontmatter["title"] = title
            frontmatter["date"] = date

            # just take the first sentence from the description
            description = description.split("\n")[0]

            # form the filenames
            max_id = max_id + 1
            safe_title = re.sub(r'[^A-Za-z0-9]', '-', title.lower())
            safe_title = re.sub(r'-+', '-', safe_title)
            md_filename = str(max_id).zfill(4) + "-" + safe_title + ".md"
            mp4_filename = "the-followup-" + str(max_id).zfill(4) + "-" + safe_title + ".m4a"

            frontmatter["podcast"] = "https://arborchurchnw.org/podcast/" + mp4_filename

            # download from youtube


            # markdown file to write
            markdown = "---\n" + yaml.dump(frontmatter) + "---\n\n" + description
            dest = episodes / md_filename
            dest_file = open(dest, "w")
            dest_file.write(markdown)
            print(str(dest) + " created")

    
# TODO: Get followup episodes from YAML, find IDs
# If an ID exists on youtube but not in YAML:
# 1. youtube-dl to get its video file audio in FLAC
# 2. ffmpeg to convert FLAC to podcast
# 3. scp podcast M4a to storage
# 4. create and commit YAML 
