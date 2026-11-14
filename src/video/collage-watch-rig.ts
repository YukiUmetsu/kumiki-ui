/**
 * The Met pocket watch (CC0), taken apart into a plate and moving parts for COLLAGE1 `photoRig`.
 * Layers were cut from `pocket-watch-cutout.webp` (see assets/collage/ASSETS.md for how): the plate has the hands
 * and bow removed and the dial restored; each hand keeps its own photographed pixels.
 *
 * All geometry is in source-photo pixels (743 × 1040). In the photograph the watch reads about 4:48:20.
 */
import type { CollageEase, CollageKey } from "../../registry/video/collage/collage-motion";
import type { CollageNode } from "../../registry/video/collage/collage-scene";
import type { PhotoRigOptions } from "../../registry/video/collage/collage-kit-photo";
import { clockHandKeys, photoRig, tickingSecondKeys } from "../../registry/video/collage/collage-kit-photo";
import plateUrl from "./assets/collage/pocket-watch-plate.webp";
import minuteUrl from "./assets/collage/pocket-watch-minute.webp";
import hourUrl from "./assets/collage/pocket-watch-hour.webp";
import secondsUrl from "./assets/collage/pocket-watch-seconds.webp";
import capUrl from "./assets/collage/pocket-watch-cap.webp";
import subcapUrl from "./assets/collage/pocket-watch-subcap.webp";
import bowUrl from "./assets/collage/pocket-watch-bow.webp";

export const WATCH = {
  size: [743, 1040] as const,
  arbor: [366.5, 676] as const,
  secondsArbor: [366, 835.5] as const,
  bowHinge: [371.5, 212] as const,
  /** Where each hand points in the photograph, degrees clockwise from 12. */
  photoAngle: { hour: 146.4, minute: 288.8, second: 122.4 },
  boxes: {
    minute: [88, 581, 350, 675], hour: [363, 674, 473, 833], seconds: [317, 804, 471, 904],
    cap: [348, 657, 386, 696], subcap: [359, 829, 374, 843], bow: [221, 3, 523, 221],
  } as const,
  /** The photographed time, in hours. */
  photoTime: 4 + 48 / 60 + 20 / 3600,
};

export interface WatchMotion {
  /** Clock time keys (hours, e.g. 11.75 = quarter to twelve) for the hour and minute hands. */
  time?: readonly { frame: number; hours: number; ease?: CollageEase }[];
  /** Seconds hand ticks once per second from `startSecond`. Omit to keep it as photographed. */
  ticking?: { frame: number; startSecond: number; seconds: number };
  /** Bow flop (the ring tips on its hinge) at these frames, e.g. when the watch lands. */
  bowFlops?: readonly number[];
}

/** Bow keys: the ring tips forward on its hinge (vertical squash about the hinge) and settles with a decaying wobble. */
export function bowFlopKeys(frames: readonly number[]): CollageKey[] {
  const keys: CollageKey[] = [];
  for (const f of frames) keys.push(
    { frame: f, scaleY: 1, rotate: 0 }, { frame: f + 4, scaleY: .74, rotate: -3, ease: "out" }, { frame: f + 10, scaleY: 1.06, rotate: 2, ease: "inOut" },
    { frame: f + 16, scaleY: .95, rotate: -1, ease: "inOut" }, { frame: f + 22, scaleY: 1, rotate: 0, ease: "inOut" },
  );
  return keys;
}

/** Plate + bow + seconds hand + hour hand + minute hand + caps, each part on its real axle. */
export function watchRig(id: string, o: Omit<PhotoRigOptions, "href" | "sourceWidth" | "sourceHeight" | "parts"> & WatchMotion): CollageNode[] {
  const b = WATCH.boxes, a = WATCH.photoAngle;
  const hm = (unit: "hour" | "minute") => o.time ? clockHandKeys(unit, a[unit], o.time) : undefined;
  return photoRig(id, {
    ...o, href: plateUrl, sourceWidth: WATCH.size[0], sourceHeight: WATCH.size[1],
    parts: [
      { id: "bow", href: bowUrl, box: b.bow, pivot: WATCH.bowHinge, shadow: .35, sticker: o.sticker ?? Math.max(4, o.width * .016), keys: o.bowFlops?.length ? bowFlopKeys(o.bowFlops) : undefined },
      { id: "seconds", href: secondsUrl, box: b.seconds, pivot: WATCH.secondsArbor, shadow: .35, keys: o.ticking ? tickingSecondKeys(a.second, o.ticking) : undefined },
      { id: "subcap", href: subcapUrl, box: b.subcap, shadow: .25 },
      { id: "hour", href: hourUrl, box: b.hour, pivot: WATCH.arbor, keys: hm("hour") },
      { id: "minute", href: minuteUrl, box: b.minute, pivot: WATCH.arbor, keys: hm("minute") },
      { id: "cap", href: capUrl, box: b.cap, shadow: .3 },
    ],
  });
}
