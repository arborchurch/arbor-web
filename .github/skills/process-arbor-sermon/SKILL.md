---
name: process-arbor-sermon
description: Convert an Arbor Church YouTube service into an audio podcast upload, Hugo message page bundle, and cleaned transcript. Use when adding a sermon/message from YouTube, including when only its speaker and series are provided.
---

# Process an Arbor Church sermon

Turn an Arbor Church YouTube service into a complete message entry in this
repository. The required inputs are:

- YouTube service URL (optional when the latest completed Arbor livestream is
  intended)
- speaker name
- series name

Do not make up sermon facts, Scripture citations, dates, timestamps, or
theological wording. Preserve working-tree changes that are unrelated to this
task.

## 1. Resolve and inspect the source

If no YouTube URL was supplied, discover the latest **completed** stream from
`https://www.youtube.com/@arborchurch7439/streams` with the locally installed
`yt-dlp`.

1. Inspect several newest stream entries, not only the first playlist entry.
   A channel can have an upcoming or currently live stream ahead of the most
   recent completed service.
2. Select the newest entry whose status is completed/previously live, and form
   `https://www.youtube.com/watch?v=<video-id>`.
3. Retrieve full metadata for the selected video before downloading. Record its
   title, description, video ID, upload/release date, and live status in the
   task notes.
4. State the selected service, speaker, and series before proceeding. If the
   service may not be the intended one, stop for confirmation rather than
   downloading or uploading the wrong message.

Use a temporary working directory outside the repository for downloads,
intermediate WAV files, first-pass transcripts, and encoder output. Do not add
large media files to Git.

## 2. Download and locate the sermon window

Download the full service as a lossless WAV and retain the YouTube metadata
JSON alongside it. Prefer `yt-dlp` extraction to WAV; use its generated
filename rather than constructing one from untrusted metadata.

Create a dedicated speech-analysis WAV before using `whisper.cpp`: 16 kHz,
mono, signed 16-bit PCM. Do not send a high-sample-rate stereo livestream WAV
directly to Whisper.

Before invoking Whisper, first use the local checkout at
`$HOME/git/whisper.cpp`: its preferred binary is
`build/bin/whisper-cli`, and its models are in `models/`. Inspect that binary's
`--help` and the available models; only search for another installation when
this checkout or its executable is unavailable. Use the best practical English
model available. Transcribe the analysis audio in short chunks (at most 2
minutes at a time) with fresh context for every chunk, retaining each chunk's
original start offset in its filename or timestamp record. When audio has
already been extracted into chunks, do **not** pass its original offset to
Whisper as an input offset; that option skips that many milliseconds of the
chunk. Preserve timestamped JSON/SRT/text output.

Do not accept a full-service transcript merely because Whisper exited
successfully. Read samples from the early, middle, and late service. If text
is repeated across long intervals, unrelated, or otherwise hallucinatory,
regenerate the analysis audio and use shorter independent chunks. This avoids
carrying music, prayer, or an early decoding error through an entire service.
An initial prompt may itself appear in the generated text; treat any such
prompt echo as invalid output and rerun that chunk without a prompt.

Read enough of the timestamped chunk transcripts to determine two distinct
windows:

- **audio start/end:** preserve the speaker's own greeting, introduction,
  personal preamble, and setup before the substantive teaching; remove only
  prior worship, host announcements, stage handoff, audio checks, and
  post-message prayer/music/response material that is not part of the
  speaker's contribution. Start the audio no earlier than 0.5 seconds before
  the speaker's first clear word, so the fade-in finishes before that word;
- **transcript start/end:** begin with the first substantive teaching words,
  after speaker-specific introductory material, and end with the final
  meaningful sermon words before non-message response material.

Use explicit `HH:MM:SS` timestamps for both windows. Do not assume that all
prayer belongs to the message: retain it only when it is integral to the
speaker's sermon. Note each audio boundary and transcript boundary, with one
sentence of evidence, in the handoff note. Confirm the audio start by listening
to the source around the boundary rather than relying solely on ASR, which can
mistake music or a stage transition for speech. Never use the shorter
transcript window as the podcast-audio trim. When a boundary is uncertain,
present the proposed ranges for approval before uploading.

## 3. Produce the audio master

Use `ffmpeg` to trim the full-service WAV to the selected **audio** range.
Measure the source range before mastering. Target a mono podcast master near
`-16 LUFS` only when loudness normalization can do so transparently. Never use
peak limiting, clipping, or compression merely to meet that target.

For a clear but quiet source, prefer a transparent fixed gain derived from
measured peak headroom over loudness normalization: the maximum gain is the
difference between the measured true peak and the chosen safe output peak.
Use a modest safety margin below `0 dBTP`, and verify the resulting true peak
afterward. When the user specifies a gain for a particular message, apply
that exact gain only if the resulting peak remains below `0 dBTP`; otherwise
stop for a revised gain rather than applying a limiter. A master below the
loudness target that remains clear is preferable to a louder degraded master.

Apply a short 0.5 second fade-in and fade-out to the final trimmed audio. A
fade must fit inside the selected audio duration. Inspect duration and audio
levels with `ffprobe`/`ffmpeg` after processing. Compare representative early,
middle, and late portions of the master with the source at matched playback
level; if mastering changes clarity or introduces distortion, revise it or
use a trim-and-fade-only master rather than accepting a louder degraded file.

Use a stable, URL-friendly filename:

```text
<series-slug>-<message-slug>.wav
```

Lowercase it, use ASCII letters/numbers/hyphens only, collapse repeated
hyphens, and remove punctuation. The message bundle directory uses
`<message-slug>`; if it already exists in the series, stop rather than
overwriting it.

## 4. Create the editorial transcript

Run a final timestamped transcription against the trimmed message audio if the
coarse transcript was produced from the full service. Create a readable,
**lightly edited transcript**, not a summary or a rewrite. Keep the speaker's
original wording, sentence order, illustrations, and conversational voice.
Do not add introductory context, explanatory prose, paraphrased theological
claims, or replacement Scripture wording that the speaker did not say.

- remove repeated words, false starts, obvious microphone checks, and
  non-message stage directions;
- remove accidental ASR duplication, but retain intentional repetition and
  meaningful conversational phrasing;
- drop or reflow only genuine verbal clutter when it does not change meaning:
  leading conjunctions, "all right," "like," "you know," and similar
  interjections; after doing so, ensure the remaining sentence is grammatical
  and properly capitalized;
- correct only obvious punctuation, capitalization, and transcription errors;
- retain uncertainty and theological claims rather than silently rewriting
  them;
- preserve uncertain names, Bible references, or quotations as spoken and
  flag them for review instead of guessing;
- organize the message with concise `##` section headings and frequent,
  short paragraphs (generally one to three spoken ideas) for comfortable
  reading;
- insert headings only between complete spoken sentences; never place a
  heading in the middle of a sentence or to repair a transcription chunk
  boundary;
- never split a direct quotation across paragraphs. Every prose paragraph
  containing straight quotation marks must open and close them within that
  paragraph;
- after cleanup and paragraphing, ensure every prose paragraph starts with a
  capitalized word and repair or remove any stranded ASR fragment rather than
  presenting it as a sentence;
- when the speaker explicitly cites, paraphrases, or reads Scripture, put a
  Scripture card immediately **before** that citation. Use the free NET Bible
  text, provide the reference and `(NET)` in the footer, and follow the
  established markup:

  ```html
  <aside class="scripture-card">
    <p>Scripture text</p>
    <footer>Matthew 5:17 (NET)</footer>
  </aside>
  ```

  Do not add cards for passages that are not clearly referenced or guess a
  citation when the transcript is uncertain;
- set off a few central statements/questions using:

  ```html
  <blockquote class="transcript-pull-quote">
    <p>...</p>
  </blockquote>
  ```

- end with exactly three open-ended questions inviting reflection and practical
  application, using the established markup:

  ```html
  <section class="small-group-discussion">
    <h2>Small Group Discussion</h2>
    <ol>
      <li>...</li>
      <li>...</li>
      <li>...</li>
    </ol>
  </section>
  ```

Write this as `transcription.md` in the message's page bundle. Do not add front
matter to that resource.

## 5. Draft message metadata and summary

Generate a message title of no more than 10 words for the message portion only.
The full front-matter title must read naturally as:

```text
<Series Name>: <Message Title>
```

Derive a 2–3 sentence summary from the sermon and YouTube description. Put it
in the body of `index.md`; it should explain the message rather than advertise
the service.

Use the date shown in the YouTube title when it is unambiguous. Otherwise use
the video release/upload date. Format it in the church's established offset:

```yaml
date: "YYYY-MM-DDT10:00:00-10:00"
```

If the service date remains ambiguous, stop for a date rather than inventing
one. Use the repository's established series slug, or derive it with the same
lowercase ASCII/hyphen rules as the message slug.

## 6. Upload only after review

Before upload, present this compact review set:

- source video title, URL, ID, and selected date;
- proposed sermon start/end timestamps and final duration;
- series slug, title, audio filename, and message-bundle path;
- summary and any transcript uncertainties.

After approval, run the repository's `./encode-sermon.sh` with the full
front-matter title, speaker, processed WAV, and chosen MP3 filename. Capture
its stdout exactly: it provides `podcast`, `podcast_bytes`, and
`podcast_duration`.

`encode-sermon.sh` currently uploads both the encoded MP3 and its supplied
original input via `scp`. Treat this as intentional only when the supplied WAV
is the final trimmed, normalized master. Do not claim an upload succeeded
until the command exits successfully and its output has been captured.

## 7. Add and validate the page bundle

Create:

```text
site/content/messages/<series-slug>/<message-slug>/index.md
site/content/messages/<series-slug>/<message-slug>/transcription.md
```

Use this `index.md` structure, replacing every placeholder:

```yaml
---
date: "YYYY-MM-DDT10:00:00-10:00"
title: "<Series Name>: <Message Title>"
series: "<series-slug>"
speaker: "<Speaker Name>"
type: message
podcast: <encoder podcast URL>
podcast_bytes: <encoder byte count>
podcast_duration: <encoder duration>
youtube_id: <plain YouTube video ID>
---
```

Below the front matter, add the two-to-three-sentence summary. Follow existing
message examples for any optional Scripture teaser formatting.

Run the repository's smallest applicable site build/validation command. Check
that the front matter parses, the message bundle contains `transcription.md`,
and no media or temporary transcript files were added to Git. Leave all changes
uncommitted unless the user explicitly asks for a commit.

## Handoff record

Update `SERMON_PROCESSING_WORKFLOW.md` during each real-message walkthrough.
Record the selected video, source metadata, trim decision, audio settings,
editorial uncertainties, encoder output, created paths, and validation result.
This file is intentionally an uncommitted recovery record until the user says
otherwise.
