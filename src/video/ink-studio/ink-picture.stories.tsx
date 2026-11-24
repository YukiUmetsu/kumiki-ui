import { useEffect, useMemo, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { InkFilmPlayer } from "../../../registry/video/ink/ink-film-react";
import type { InkFilm } from "../../../registry/video/ink/ink-film";
import { inkPicture } from "../../../registry/video/ink/ink-picture";
import type { InkImage, InkPictureOptions } from "../../../registry/video/ink/ink-picture";
import mountains from "../../../assets/photos/look-plates/mountains-dusk.jpg?url";
import beach from "../../../assets/photos/look-plates/summer-beach.jpg?url";
import { InkStudioPage } from "./ink-page";

const BOOK = {};
/** Pixels of a picture, at most `most` across. */
async function pixelsOf(url: string, most: number): Promise<InkImage> {
  const img = new Image(); img.src = url; await img.decode();
  const k = Math.min(1, most / img.naturalWidth), c = document.createElement("canvas"); c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
  const x = c.getContext("2d", { willReadFrequently: true })!; x.drawImage(img, 0, 0, c.width, c.height);
  return x.getImageData(0, 0, c.width, c.height);
}
function Picture({ url, label, options }: { url: string; label: string; options: InkPictureOptions }) {
  const [image, set] = useState<InkImage | null>(null), [error, setError] = useState(false);
  useEffect(() => { let live = true; pixelsOf(url, 1600).then(i => { if (live) set(i); }, () => { if (live) setError(true); }); return () => { live = false; }; }, [url]);
  const film = useMemo((): InkFilm | null => {
    if (!image) return null;
    const subject = inkPicture(image, { width: 1600, label, ...options }), { width, height } = subject.page;
    return { schemaVersion: 1, id: `ink-picture-${label}`, title: label, fps: 30, paper: "#F8F1E3", size: { width, height }, shots: [{ id: "picture", seconds: 12, label, layers: [{ subject, at: [width / 2, height / 2], enter: { kind: "develop", at: 0.3, seconds: 7 } }], camera: [{ at: 0, zoom: 1.03 }, { at: 12, zoom: 1 }] }] };
  }, [image, label, options]);
  return <InkStudioPage>
    {film ? <InkFilmPlayer film={film} book={BOOK} pixels={1400} /> : <p role="status" style={{ font: "16px/1.5 system-ui, sans-serif" }}>{error ? "The picture could not be loaded. Reload the page to try again." : "Reading the picture…"}</p>}
    <figure style={{ margin: "18px 0 0" }}><img src={url} alt={`The photograph: ${label}`} style={{ width: "min(360px, 100%)", display: "block" }} /><figcaption style={{ font: "15px/1.5 system-ui, sans-serif", color: "#2A2624", paddingTop: 6 }}>The photograph it was painted from</figcaption></figure>
  </InkStudioPage>;
}
const MOUNTAINS: InkPictureOptions = { seed: 3, tint: "indigo", tintAmount: 0.2 }, BEACH: InkPictureOptions = { seed: 5 };
const meta: Meta = { title: "Video production/Film Looks/Chinese Ink/Any Picture In Ink", id: "video-ink-picture", parameters: { layout: "fullscreen" } };
export default meta;
/** A photograph, a film frame or a drawing becomes an ink painting that paints itself. */
export const Mountains: StoryObj = { render: () => <Picture url={mountains} label="Mountain ridges at dusk" options={MOUNTAINS} /> };
export const Beach: StoryObj = { render: () => <Picture url={beach} label="A summer beach" options={BEACH} /> };
