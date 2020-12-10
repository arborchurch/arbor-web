[![Build Status](https://travis-ci.org/arborchurch/arbor-web.svg?branch=master)](https://travis-ci.org/arborchurch/arbor-web)

# Arbor Church Website

This repository hosts the sources for the [Arbor Church website](https://www.arborchurch.com/). 

## Development

Making small edits to the site is possible right on Github by clicking the Edit icon in the upper right of the file you want to edit.

To do any nontrivial work on the site, however, you'll want a copy of [Hugo](https://gohugo.io). Hugo is a static site generator that builds the website. Start Hugo locally by using the `run-site.sh` script.

    ./run-site.sh

Then, visit `http://localhost:1313/` to see your local copy of the site. You can experiment and make any changes you like. 

## Publishing Changes

Once you're happy with your local copy, commit the changes. [Travis CI](https://travis-ci.org/) will automatically build and deploy the site. You don't need to worry about how this works, but if you're curious or need to reconfigure, you can read more about it here:

[Deploying Hugo with Travis CI](https://jmcphers.github.io/hugo/web/development/2016/11/09/hugo-and-travis.html)

## Posting Sermons

Posting a new sermon is the most common kind of update to the site. Here's the process:

### Get the recording

The sound team records the service to a WAV file, which is saved directly to a USB thumb drive by the sound board. This might include the whole service, so first check to see whether it needs to be trimmed to only the sermon. You can [use QuickTime to trim the audio file](https://support.apple.com/en-us/HT201066) without loss of quality.

### Compress and upload

Once you have a WAV containing just the audio, you need to encode and compress it for posting to the website and podcast. There is a script called `encode-sermon.sh` which does this, using the command line utility [ffmpeg](https://ffmpeg.org/), which you may need to install. From the root of the git repo, run this command:

    ./encode-sermon.sh "Title of the Message" "Speaker's Name" path-to-wav.wav path-to-m4a.m4a

Now copy the resultant m4a file to the podcast directory of the website like so:

    scp path-to-m4a.m4a arborchurch@arborchurch.com:arborchurchnw.org/podcast

### Update website and podcast

Now that the audio is online, you just need to let the website know where it is. You do this by adding a file in `site/content/messages/name-of-sermon-series`. For instance, if you were adding a sermon called "The Promise" in the series "Acts: Birth of a Church", you'd create `the-promise.md` and put it here:

    .
    ├── site
    │   ├── content
    │   │   ├── messages
    │   │   │   ├── _index.md
    │   │   │   ├── acts-birth-of-a-church
    │   │   │   │   ├── _index.md
    │   │   │   │   ├── the-message.md
    │   │   │   │   └── the-promise.md

Use one of the existing `.md` files as a template (it should be very clear what needs to go in each of the fields).  Commit and push the change.

Once your change is committed, Travis CI will rebuild the site. This will post the sermon on the website, and will also update the [Arbor Church podcast feedburner](https://feeds.feedburner.com/ArborChurch), which will in turn update the [Arbor Church podcast on iTunes](https://itunes.apple.com/us/podcast/arbor-church/id1204135740). 

### Adding a video

You can add a YouTube video to a message as follows:

#### Get the YouTube ID of the video

This can be found by going to the YouTube video and copying the portion of the URL after `v=`. For example, in this URL:

    https://www.youtube.com/watch?v=dQw4w9WgXcQ

the YouTube ID is `dQw4w9WgXcQ`. If there is an ampersand (`&`) in the URL, it signals the end of the YouTube ID

#### Add the YouTube ID to the message metadata

Once you have the YouTube ID, add it as the `youtube_id` in the front matter at the beginning of the message's .md file.  For example:

    ---
    date: "2019-12-03T11:00:00-08:00"
    title: "Promises: Never Gonna Give You Up"
    series: "promises"
    speaker: "Jake Goetze"
    type: message
    youtube_id: dQw4w9WgXcQ
    ...
    ---


