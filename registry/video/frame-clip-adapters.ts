/** Frame source adapters for FrameAccurateClip. Each advertises what it can guarantee.
 * Write your own (WebCodecs + a demuxer, a server frame API, a native bridge) by implementing
 * `ClipFrameAdapter`; nothing else in the clip depends on how frames are decoded.
 */
import { clipFrameTime } from "./frame-clip";
import type { ClipAdapterCapabilities, ClipSource } from "./frame-clip";

export interface ClipFrameImage {
  image: CanvasImageSource;
  width: number;
  height: number;
  /** True only when the adapter knows this is the requested frame. */
  exact: boolean;
  /** Presentation time actually shown, when the decoder reports it. */
  presentedTime?: number;
}
export interface ClipFrameAdapter {
  id: string;
  capabilities: ClipAdapterCapabilities;
  /** Resolve frame `index` of `source`. Reject on failure; never substitute another frame silently. */
  load(source: ClipSource, index: number, signal?: AbortSignal): Promise<ClipFrameImage>;
  dispose?(): void;
}

const aborted = (signal?: AbortSignal) => { if (signal?.aborted) throw new DOMException("Frame request superseded.", "AbortError"); };

/** Small LRU keyed by `${sourceId}:${index}`. */
function lru<T>(size: number) {
  const map = new Map<string, Promise<T>>();
  return {
    get(key: string, make: () => Promise<T>) {
      const hit = map.get(key);
      if (hit) { map.delete(key); map.set(key, hit); return hit; }
      const value = make();
      map.set(key, value);
      value.catch(() => map.delete(key));
      while (map.size > size) map.delete(map.keys().next().value!);
      return value;
    },
    clear: () => map.clear(),
  };
}

/** Exact: one image per frame (PNG/JPEG/WebP sequence, data URLs or a frame server). */
export function createImageSequenceAdapter(options: {
  url: (source: ClipSource, index: number) => string;
  cacheSize?: number;
  crossOrigin?: "anonymous" | "use-credentials";
  alpha?: boolean;
}): ClipFrameAdapter {
  const cache = lru<HTMLImageElement>(options.cacheSize ?? 48);
  return {
    id: "image-sequence",
    capabilities: { exactFrames: true, alpha: options.alpha ?? true, vfr: true },
    async load(source, index, signal) {
      aborted(signal);
      const image = await cache.get(`${source.id}:${index}`, async () => {
        const img = new Image();
        if (options.crossOrigin) img.crossOrigin = options.crossOrigin;
        img.decoding = "async";
        img.src = options.url(source, index);
        await img.decode();
        return img;
      });
      aborted(signal);
      return { image, width: image.naturalWidth, height: image.naturalHeight, exact: true, presentedTime: clipFrameTime(source, index) };
    },
    dispose: () => cache.clear(),
  };
}

/** Exact: frames drawn by code (synthetic footage, data-driven plates, tests). */
export function createProceduralAdapter(options: {
  draw: (context: CanvasRenderingContext2D, source: ClipSource, index: number) => void;
  alpha?: boolean;
}): ClipFrameAdapter {
  return {
    id: "procedural",
    capabilities: { exactFrames: true, alpha: options.alpha ?? true, vfr: true },
    async load(source, index, signal) {
      aborted(signal);
      const canvas = document.createElement("canvas");
      canvas.width = source.width; canvas.height = source.height;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("2D canvas is unavailable in this environment.");
      options.draw(context, source, index);
      return { image: canvas, width: canvas.width, height: canvas.height, exact: true, presentedTime: clipFrameTime(source, index) };
    },
  };
}

type FrameCallbackVideo = HTMLVideoElement & { requestVideoFrameCallback?: (cb: (now: number, meta: { mediaTime: number }) => void) => number };

/** Browser `<video>` seeking, verified per frame: the presented media time from
 * `requestVideoFrameCallback` must match the requested frame, otherwise the frame is reported
 * `exact: false` (an error under requireExact). Codec support depends on the browser.
 */
export function createVideoElementAdapter(options: {
  url: (source: ClipSource) => string;
  crossOrigin?: "anonymous" | "use-credentials";
  /** Accepted |presented − requested| as a fraction of the frame interval. Default 0.5. */
  toleranceFrames?: number;
  cacheSize?: number;
  /** Fail a load or seek that has not completed in this many ms (e.g. an unsupported codec). Default 10000. */
  timeoutMs?: number;
  /** How long to wait for the presented-frame callback after a seek before reporting the frame unverified. Default 400. */
  verifyTimeoutMs?: number;
}): ClipFrameAdapter {
  const timeout = options.timeoutMs ?? 10000;
  const within = <T,>(task: Promise<T>, what: string) => new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${what} did not complete within ${timeout} ms; the browser may not decode this codec.`)), timeout);
    task.then(value => { clearTimeout(timer); resolve(value); }, cause => { clearTimeout(timer); reject(cause); });
  });
  const videos = new Map<string, Promise<FrameCallbackVideo>>();
  const lastPresented = new WeakMap<HTMLVideoElement, number | undefined>();
  const queues = new Map<string, Promise<unknown>>();
  const cache = lru<ClipFrameImage>(options.cacheSize ?? 24);
  const video = (source: ClipSource) => {
    let entry = videos.get(source.id);
    if (!entry) {
      entry = within(new Promise<FrameCallbackVideo>((resolve, reject) => {
        const element = document.createElement("video") as FrameCallbackVideo;
        element.muted = true; element.playsInline = true; element.preload = "auto";
        // Frame callbacks only fire for composited video, so keep the element in the page, effectively invisible.
        element.setAttribute("aria-hidden", "true");
        Object.assign(element.style, { position: "fixed", left: "0", top: "0", width: "2px", height: "2px", opacity: "0.01", pointerEvents: "none" });
        document.body.appendChild(element);
        if (options.crossOrigin) element.crossOrigin = options.crossOrigin;
        element.addEventListener("loadeddata", () => resolve(element), { once: true });
        element.addEventListener("error", () => reject(new Error(`Video "${source.id}" failed to load (${element.error?.message ?? "decode error"}).`)), { once: true });
        element.src = options.url(source);
      }), `Loading video "${source.id}"`);
      entry.catch(() => videos.delete(source.id));
      videos.set(source.id, entry);
    }
    return entry;
  };
  const decode = async (source: ClipSource, index: number): Promise<ClipFrameImage> => {
    const element = await video(source);
    const start = clipFrameTime(source, index), next = index + 1 < source.frameCount ? clipFrameTime(source, index + 1) : start + (start - clipFrameTime(source, Math.max(0, index - 1)) || 1 / 30);
    const interval = next - start;
    // Aim for the middle of the frame's display interval so rounding cannot land on a neighbour.
    const target = start + interval / 2;
    const presented = await within(new Promise<number | undefined>((resolve, reject) => {
      // Register the frame callback BEFORE seeking: a paused video presents the sought frame once.
      // Without a callback (unsupported, or none arrives) the frame is reported unverified, never assumed exact.
      if (Math.abs(element.currentTime - target) < 1e-4 && element.readyState >= 2) { resolve(lastPresented.get(element)); return; }
      let mediaTime: number | undefined, seeked = false, fallback: ReturnType<typeof setTimeout> | undefined;
      const finish = () => { if (fallback) clearTimeout(fallback); lastPresented.set(element, mediaTime); resolve(mediaTime); };
      element.requestVideoFrameCallback?.((_, meta) => { mediaTime = meta.mediaTime; if (seeked) finish(); });
      element.addEventListener("seeked", () => {
        seeked = true;
        if (mediaTime !== undefined || !element.requestVideoFrameCallback) finish();
        else fallback = setTimeout(finish, options.verifyTimeoutMs ?? 400);
      }, { once: true });
      element.addEventListener("error", () => reject(new Error(`Seek to frame ${index} failed.`)), { once: true });
      element.currentTime = target;
    }), `Seeking "${source.id}" to frame ${index}`);
    const canvas = document.createElement("canvas");
    canvas.width = element.videoWidth; canvas.height = element.videoHeight;
    canvas.getContext("2d")?.drawImage(element, 0, 0);
    const exact = presented !== undefined && Math.abs(presented - start) <= (options.toleranceFrames ?? 0.5) * interval;
    return { image: canvas, width: canvas.width, height: canvas.height, exact, presentedTime: presented };
  };
  return {
    id: "video-element",
    capabilities: { exactFrames: "verified", alpha: false, vfr: true },
    async load(source, index, signal) {
      aborted(signal);
      // One element per source can seek to one place at a time: serialize requests.
      const run = (queues.get(source.id) ?? Promise.resolve()).catch(() => undefined)
        .then(() => cache.get(`${source.id}:${index}`, () => decode(source, index)));
      queues.set(source.id, run);
      const frame = await run;
      aborted(signal);
      return frame;
    },
    dispose() { for (const entry of videos.values()) void entry.then(v => { v.removeAttribute("src"); v.load(); v.remove(); }, () => undefined); videos.clear(); cache.clear(); },
  };
}
