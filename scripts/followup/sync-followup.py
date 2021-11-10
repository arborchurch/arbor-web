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

print("Syncing latest changes from Git..")
subprocess.run(["git", "pull"])

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
            frontmatter["title"] = "The Followup: " + title
            frontmatter["date"] = date
            frontmatter["type"] = "vodcast"

            # just take the first sentence from the description
            description = description.split("\n")[0]

            # form the filenames
            max_id = max_id + 1
            safe_title = re.sub(r'[^A-Za-z0-9]', '-', title.lower())
            safe_title = re.sub(r'-+', '-', safe_title)
            filename_base = str(max_id).zfill(4) + "-" + safe_title 
            md_filename =  filename_base + ".md"
            mp3_filename = "the-followup-" + filename_base + ".mp3"
            flac_filename = filename_base + ".flac"

            frontmatter["podcast"] = "https://arborchurchnw.org/podcast/" + mp3_filename

            # download from youtube
            print("*** Downloading YouTube vodcast " + id + " ***")
            subprocess.run(["youtube-dl", "--audio-format", "flac", "-x", "https://www.youtube.com/watch?v=" + id, "-o", flac_filename])

            # encode into mp3 suitable for podcast; note that for some reason the
            # audio files produced by youtube-dl's "--audio-format mp3" do not play
            # properly on Apple devices
            print("*** Encoding to MP3 for podcast ***")
            subprocess.run(["ffmpeg", "-i", flac_filename, "-b:a", "128k", "-ac", "1", "-metadata", "title=\"" + title + "\"", "-metadata", "author=\"Arbor Church\"", "-movflags", "+faststart", mp3_filename])

            # upload podcast to storage
            print("*** Uploading " + mp3_filename + " to web host ***")
            subprocess.run(["scp", mp3_filename, "arborchurch@arborchurchnw.org:arborchurchnw.org/podcast"])

            # get the duration of the podcast in seconds (comes out like "2316.261000")
            probe_result = subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", mp3_filename])

            # convert to minutes:seconds format (M:SS)
            seconds = int(float(probe_result.strip()))
            duration = str(int(seconds / 60)) + ":" + str(int(seconds % 60)).zfill(2)

            # record podcast metadata
            frontmatter["podcast_bytes"] = os.path.getsize(mp3_filename)
            frontmatter["podcast_duration"] = duration

            # clean up flac/mp3 temporary
            os.remove(flac_filename)
            os.remove(mp3_filename)

            # markdown file to write
            markdown = "---\n" + yaml.dump(frontmatter) + "---\n\n" + description
            dest = episodes / md_filename
            dest_file = open(dest, "w")
            dest_file.write(markdown)
            dest_file.close()
            
            print(str(dest) + " created")

            # push new episode to git upstream
            subprocess.run(["git", "add", dest])
            subprocess.run(["git", "commit", "-m", "add followup episode " + str(max_id) + ": " + title])
            subprocess.run(["git", "push"])

            print(str(dest) + " pushed to website")

