# Jump cuts (VE1.10)

`npm run video:jumpcut` tightens a talking head. It takes the pauses out and pushes in on every other long stretch, so each cut reads as a new, tighter angle instead of a jump. This is the "retention editing" of short-form video: MrBeast's team cut to 23 to 38 cuts a minute ([Tubefilter](https://www.tubefilter.com/2024/03/04/mrbeast-editing-style-number-of-cuts-per-video/amp/)), and short-form editors ship silence removal as one tap ([CapCut](https://www.capcut.com/newsroom/revealing-the-creative-trends-on-capcut-in-2025)). Commentators already see a backlash against over-cut videos ([Gigazine](https://gigazine.net/gsc_news/en/20240403-retention-editing-beastification-may-be-end)), so keep a breath.

```
npm run video:jumpcut -- talk.mp4 --out=cut.mp4 [--from=<s|Nf>] [--to=<s|Nf>] [--noise=-35] [--min-silence=0.3] [--keep=0.08]
  [--punch=1.12] [--focus=0.5,0.38] [--srt=talk.srt] [--report=segments.json] [--crf=18] [--overwrite] [--log=info] [--format=json]
```

1. **Find the pauses.** FFmpeg's `silencedetect` finds every stretch quieter than `--noise` dB for at least `--min-silence` seconds.
2. **Keep the speech.** The speech between pauses is kept, with `--keep` seconds of each pause at both ends, so breaths and word endings are not clipped.
   - Stretches shorter than 0.15 s (a click, a cough) are dropped.
   - Stretches that touch are merged.
3. **Push in.** Every other long stretch is pushed in by `--punch` about `--focus`: fractions of the frame, by default a face in a medium shot.
   - A stretch under 0.5 s keeps the framing before it, so the picture never flicks in and out on a single word.
   - `--punch=1` turns the push off.
4. **Join.** Each stretch's audio fades over 10 ms at both ends, so no cut clicks. The stretches are joined (`concat`) and encoded.
5. **Time map.** `--report` writes the kept stretches.
   - `mapTime(segments, t)` moves a source time into the cut, or reports it removed.
   - `--srt` retimes the source's subtitles into `<out>.srt`. A caption that falls wholly inside a removed pause is dropped; one that starts in a pause moves to the next kept stretch.

**Exports.** `parseSilences`, `speechSegments`, `mapTime`, `retimeCues`, `parseSrt`, `formatSrt` and `jumpcutFilter` are exported and pure.

**Errors.** Each has a code: `usage`, `file-missing`, `probe-failed`, `ffmpeg-missing`, `no-audio`, `time-range`, `output-exists`, `no-speech`, `encode-failed`.

## Evidence (2026-11-21)

**The clip.** [Interview with a Teacher - Glen Caruso](https://commons.wikimedia.org/wiki/File:Interview_with_a_Teacher_-_Glen_Caruso.webm) by Chase Bohannon and Glen Caruso, CC0, a locked-off medium shot.

- **Fetching it.** A 35 s section was streamed with range requests, under a descriptive user agent; Wikimedia throttles FFmpeg's default agent with HTTP 429.
- **The cut.** It removed 4.4 s of pauses from 35 s: 9 cuts, 17.6 a minute.
- **The demo.** The committed 22 s demo (640×360) loses 2.1 s over 4 cuts.

**Review fix.** The first version alternated the push-in on every stretch, including two of 0.2 s, which would flick the framing in and out within a fifth of a second. Short stretches now keep the framing before them.

**Frames.** Frames before and after a cut show the wide shot and then a tighter push-in at the same face height.

**Tests.** `node --test tests/video-jumpcut.test.mjs` covers:

- the options;
- parsing silences, including one still open at the end;
- keeping speech with a breath, dropping clicks and merging touching stretches;
- the framing rule;
- the time map;
- SRT parsing and retiming;
- the filter;
- a real run on a tone with two 1 s gaps: 2 cuts, about 2 s removed, a 4 s result, and both captions kept, the second moved to 1.6 s.

**Storybook.** **Promo Moves → Jump Cuts** plays the original and the cut side by side with their sound, over a strip of the kept stretches. The demo has no transcript, so it plays without captions: there is no speech-to-text tool here, and making up a transcript would be dishonest.

**Owner review.** Viewing and listening review is pending.
