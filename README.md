[![Netlify Status](https://api.netlify.com/api/v1/badges/d9cbee39-bd21-4480-bb9b-392e19eef876/deploy-status)](https://app.netlify.com/sites/gracious-engelbart-80efa0/deploys)

# Arbor Church Website

This repository hosts the sources for the [Arbor Church website](https://www.arborchurch.com/). 

## How it Works

### Content

Arbor's website is built using a [static site generator](https://www.cloudflare.com/learning/performance/static-site-generator/). The website's content is stored in folders that contain text files. Each text file represents one piece of content. When the text files are updated, a program called [Hugo](https://gohugo.io/) runs automatically. It re-creates the website from the text files, and then publishes the updated website. This takes a few minutes, so changes made don't show up immediately.

### Podcast

Arbor's podcast is, technically, part of its website. In addition to producing the HTML files that are shown on <https://arborchurch.com>, the static site generator lists the messages from the website in an XML file formatted as an [RSS feed](https://en.wikipedia.org/wiki/RSS). Adding a message to the website will consequently cause it to show up on the podcast, too.

## Posting Sermons - Simple

Posting a new sermon is the most common kind of update to the site. Here's the process:

### Step 1: Get the Audio

Obtain a copy of the audio for the service. This is typically a `.wav` file saved from the sound board.

### Step 2: Trim the Audio

Using a tool like [Audacity](https://www.audacityteam.org/), edit the `.wav` file so that it contains only the message audio, without the rest of the service.

### Step 3: Encode for Podcast

The podcast audio must be an MP3 file. Using Audacity (or another tool), save the `.wav` file as an `.mp3` file. The `.mp3` file name should not contain any characters other than the letters A through Z and the dash character (`-`) -- no spaces, quotes, etc. I recommend using the name of the sermon series, followed by a dash, followed by the title of the message; for example, if the sermon series is named *Miracles*, and the message is named *The Miracles of Jesus*, you would call the MP3 file `miracles-the-miracles-of-jesus.mp3`.

Use the following encoding settings when saving the MP3:

- Constant bitrate (CBR, not VBR)
- 128kbps or 96kbps
- Joint stereo or mono

Because the audio files will be downloaded to mobile phones, it's important to use these settings so that the file size is reasonably small without compromising audio quality.

### Step 4: Upload the Podcast Audio

Go to <https://panel.dreamhost.com/> and log in; credentials will be supplied to you separately ("panel password"). Then, do the following:

1. In the menu on the left, click `Websites` -> `Manage Websites`. 
2. Scroll down to `arborchurchnw.org` and click the `Files` icon.
3. If prompted for a login, click the SFTP/SCP tab, username `arborchurch`, domain `arborchurchnw.org`; the password ("FTP password") will be sent to you separately.
3. Click on the `arborchurchnw.org` folder
4. Click on the `podcast` folder
5. Click the Upload button (bottom left, looks like an arrow pointing up)
6. Select the MP3 file you saved in the previous step
7. Wait for the upload to complete; don't close your browser window until it's done.

### Step 5: Add the Podcast Metadata

Go to <https://www.arborchurch.com/admin/> and log in with your Github account. Then, do the following:

1. Click the `Messages` menu entry on the left
2. Note the exact name of the series you want to add the message to from the list of series that appears; copy it
3. Click the `New Message` button
4. Paste the name of the series into the `Series` field.
5. Fill out the `Path` field with the name of the series, a slash `/`, and then a short version of the title. For example, if the series is Miracles, and the message is Healing the Sick, use `miracles/healing-the-sick`. 
6. Fill out the `Podcast URL` field with `https://arborchurchnw.org/podcast/foo.mp3`, where `foo` is the name of the MP3 file you uploaded in the previous step.
7. Fill out the `YouTube ID` field with the part of the YouTube URL of the message after `v=`, but before any `&` symbol. For example, if the YouTube URL is `https://www.youtube.com/watch?v=utWHNhFoGdI&t=4s`, the `YouTubeID` is `utWHNhFoGdI`. 
8. Fill out the rest of the fields; each one is labeled.
9. Click the Save button at the top.

Note that the Body field supports [Markdown syntax](https://en.wikipedia.org/wiki/Markdown), so you can use that if you'd like to add special formatting like bold or italics to the summary/description field.

### Step 6: Double-check

If you did all the previous steps correctly, then you're done! Do the following to make sure everything's good:

1. Wait 5 minutes. It can take up to this length of time for changes made to propagate to the live site.
2. Go to <https://github.com/arborchurch/arbor-web> and ensure that the "Netlify" button at the top says *Success*.
3. Go to <https://www.arborchurch.com/messages/> and ensure that the new message has appeared as the _Latest Message_. 
4. Click the _Listen_ button and ensure that the audio version of the message plays correctly.

## Posting Sermons - Advanced

These steps are for users using MacOS or Linux operating systems who are comfortable editing text files and using the Terminal.

### Get the recording

Services are posted to YouTube, so the easiest way to get the message audio is to get the audio channel from the YouTube video. For example, here's how to do it with [yt-dlp](https://github.com/yt-dlp/yt-dlp):

```bash
$ yt-dlp -x https://www.youtube.com/watch?v=dQw4w9WgXcQ
```

This will produce an audio file (`.opus`) containing the audio from the service. Trim the audio with a tool like QuickTime or [Audacity](https://www.audacityteam.org/) so that it contains only the message and save the result in an uncompressed format like FLAC. (It's about to be compressed again, so compressing it at this step will lose quality.)

### Compress and upload

Once you have a FLAC containing just the audio, you need to encode and compress it to an MP3 file for posting to the website and podcast. There is a script called `encode-sermon.sh` which does this, using the command line utility [ffmpeg](https://ffmpeg.org/), which you may need to install. From the root of the git repo, run this command:

```bash
$ ./encode-sermon.sh "Title of the Message" "Speaker's Name" path-to-wav.wav path-to-mp3.mp3
```

The script will encode the audio using recommended podcast settings and upload it to our Web host. Note that you will need your SSH public key added to our Web host in order for this step to succeed; contact Jonathan McPherson for this step.

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

Once your change is committed, Netlify will rebuild the site. This will post the sermon on the website, and will also update the [Arbor Church podcast feedburner](https://feeds.feedburner.com/ArborChurch), which will in turn update the [Arbor Church podcast on iTunes](https://itunes.apple.com/us/podcast/arbor-church/id1204135740), Google Podcasts, Spotify, and others.

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
    speaker: "Bryan Cobley"
    type: message
    youtube_id: dQw4w9WgXcQ
    ...
    ---


