/**
 * Plays paper sound cues in a Storybook lab while its frame advances: a cue fires when playback crosses its frame
 * (peak-aligned sounds start early by their measured peak time). Scrubbing backwards or jumping does not fire.
 */
import { useEffect, useRef } from "react";
import catalogFile from "../../assets/sound/catalog.json";
import type { PaperSoundCue } from "../../registry/motion/paper-sound";

const previews = import.meta.glob("../../assets/sound/lab/catalog/*.m4a", { eager: true, query: "?url", import: "default" }) as Record<string, string>;
const peaks = new Map((catalogFile as { sounds: { id: string; peakSeconds: number }[] }).sounds.map((sound) => [sound.id, sound.peakSeconds]));

export function usePaperCuePlayer(cues: readonly PaperSoundCue[], frame: number, fps: number, enabled: boolean): void {
  const last = useRef(frame);
  const playing = useRef<HTMLAudioElement[]>([]);
  useEffect(() => {
    const from = last.current;
    last.current = frame;
    if (!enabled) return;
    // Only steady forward playback fires cues (a frame or a few at a time), not a jump or a scrub back.
    if (frame <= from || frame - from > 4) return;
    for (const cue of cues) {
      const lead = cue.align === "peak" ? Math.round((peaks.get(cue.sound) ?? 0) * fps) : 0;
      const at = cue.frame - lead;
      if (at > from && at <= frame) {
        const url = previews[`../../assets/sound/lab/catalog/${cue.sound}.m4a`];
        if (!url) continue;
        const audio = new Audio(url);
        audio.volume = Math.min(1, 10 ** (cue.gainDb / 20));
        playing.current.push(audio);
        // Media playback, not a story play function.
        void HTMLMediaElement.prototype.play.call(audio).catch(() => undefined);
      }
    }
  }, [cues, frame, fps, enabled]);
  useEffect(() => () => { for (const audio of playing.current) audio.pause(); }, []);
}
