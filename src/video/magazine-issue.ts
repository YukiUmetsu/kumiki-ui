/**
 * Pages of a demo magazine for the physical page-flip lab: "Meridian", an original issue about the day the railroads
 * of North America set their clocks to standard time (18 November 1883). Each page is drawn on a canvas with real
 * editorial layouts. The photographs are public domain (Library of Congress) and CC0 (The Met); see
 * `assets/collage/ASSETS.md`.
 */
import greenwichUrl from "./assets/collage/greenwich-stereograph-1904.jpg";
import locomotiveUrl from "./assets/collage/locomotive-1873-cutout.webp";
import watchUrl from "./assets/collage/pocket-watch-cutout.webp";
import sunUrl from "./assets/collage/the-sun-1883-11-19-p1.jpg";
import stationUrl from "./assets/collage/union-station-indianapolis.jpg";

export const PAGE_PX = { width: 768, height: 1024 } as const;

const SERIF = "'Fraunces Variable', Georgia, serif";
const SANS = "'Inter Variable', system-ui, sans-serif";
const INK = "#1d1b19";
const PAPER = "#f6f3ec";
const ACCENT = "#b5452f";

export interface MagazineImages {
  station: HTMLImageElement;
  locomotive: HTMLImageElement;
  watch: HTMLImageElement;
  greenwich: HTMLImageElement;
  sun: HTMLImageElement;
}

export async function loadMagazineImages(): Promise<MagazineImages> {
  const load = (src: string) => new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Could not load ${src}`));
    image.src = src;
  });
  const [station, locomotive, watch, greenwich, sun] = await Promise.all([stationUrl, locomotiveUrl, watchUrl, greenwichUrl, sunUrl].map(load));
  await Promise.all([`600 64px ${SERIF}`, `400 16px ${SANS}`, `700 16px ${SANS}`].map((font) => document.fonts?.load(font).catch(() => undefined)));
  return { station, locomotive, watch, greenwich, sun };
}

const BODY = [
  "Until the autumn of 1883, every town in North America kept its own time. Noon came when the sun stood highest over the town, so clocks a few miles apart disagreed by minutes. The railroads ran their timetables on dozens of local times, and a traveller changing trains had to do the arithmetic.",
  "On Sunday, 18 November, the railroads changed together. At noon the telegraph carried the time from the observatories, and station clocks across the country were set to one of four zones an hour apart, centred on the meridians of 75, 90, 105 and 120 degrees west. Towns at the eastern edge of a zone heard noon twice that day; the papers called it the day of two noons.",
  "There was no law behind it. The change was agreed by the railway managers themselves, and most towns followed within weeks because their trains already had. Congress did not make standard time official until 1918.",
  "A year later, in October 1884, delegates from twenty-five nations met in Washington and chose the meridian through the transit circle at Greenwich as the zero of longitude. The world was not divided into hours at once, but the reference was fixed, and every zone since is counted from that line.",
];

/** Wrap text into lines that fit `width`. */
function wrap(ctx: CanvasRenderingContext2D, text: string, width: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? line + " " + word : word;
    if (ctx.measureText(next).width > width && line) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

/** Set paragraphs in columns; the first paragraph opens with a drop cap. Returns the y the text reached. */
function columns(ctx: CanvasRenderingContext2D, paragraphs: readonly string[], x: number, y: number, count: number, width: number, gap: number, bottom: number, dropCap = true): number {
  const size = 15;
  const lead = 21;
  ctx.font = `400 ${size}px ${SANS}`;
  ctx.fillStyle = INK;
  ctx.textBaseline = "alphabetic";
  let col = 0;
  let cy = y;
  let reached = y;
  const colX = () => x + col * (width + gap);
  paragraphs.forEach((paragraph, p) => {
    let text = paragraph;
    if (p === 0 && dropCap) {
      // A three-line drop cap in the accent colour.
      const cap = text[0];
      text = text.slice(1);
      ctx.font = `600 ${lead * 3 + 6}px ${SERIF}`;
      ctx.fillStyle = ACCENT;
      ctx.fillText(cap, colX(), cy + lead * 2 + 6);
      const capWidth = ctx.measureText(cap).width + 6;
      ctx.font = `400 ${size}px ${SANS}`;
      ctx.fillStyle = INK;
      const lines = wrap(ctx, text, width - capWidth);
      const first = lines.slice(0, 3);
      first.forEach((line, i) => ctx.fillText(line, colX() + capWidth, cy + lead * (i + 1)));
      cy += lead * 3;
      text = lines.slice(3).join(" ");
    }
    for (const line of wrap(ctx, text, width)) {
      if (cy + lead > bottom) {
        col += 1;
        cy = y;
        if (col >= count) return;
      }
      cy += lead;
      ctx.fillText(line, colX(), cy);
      reached = Math.max(reached, cy);
    }
    cy += lead * 0.6;
  });
  return reached;
}

/** Draw an image to cover a box (cropping like CSS object-fit: cover). */
function cover(ctx: CanvasRenderingContext2D, image: HTMLImageElement, x: number, y: number, w: number, h: number, focusY = 0.5) {
  const scale = Math.max(w / image.naturalWidth, h / image.naturalHeight);
  const sw = w / scale;
  const sh = h / scale;
  ctx.drawImage(image, (image.naturalWidth - sw) / 2, (image.naturalHeight - sh) * focusY, sw, sh, x, y, w, h);
}

function contain(ctx: CanvasRenderingContext2D, image: HTMLImageElement, x: number, y: number, w: number, h: number) {
  const scale = Math.min(w / image.naturalWidth, h / image.naturalHeight);
  const dw = image.naturalWidth * scale;
  const dh = image.naturalHeight * scale;
  ctx.drawImage(image, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
}

/** A warm duotone over a photograph, like a magazine's archival plates. */
function tone(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string, alpha: number) {
  ctx.save();
  ctx.globalCompositeOperation = "multiply";
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
}

function folio(ctx: CanvasRenderingContext2D, page: number, section: string, light = false) {
  const { width, height } = PAGE_PX;
  const recto = page % 2 === 1;
  ctx.font = `700 11px ${SANS}`;
  ctx.fillStyle = light ? "rgba(255,255,255,0.85)" : "rgba(29,27,25,0.7)";
  ctx.textAlign = recto ? "right" : "left";
  const x = recto ? width - 48 : 48;
  ctx.fillText(String(page), x, height - 36);
  ctx.font = `400 11px ${SANS}`;
  ctx.fillText(`MERIDIAN · ${section.toUpperCase()}`, recto ? x - 28 : x + 28, height - 36);
  ctx.textAlign = "left";
}

function caption(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, width: number, light = false) {
  ctx.font = `400 12px ${SANS}`;
  ctx.fillStyle = light ? "rgba(255,255,255,0.8)" : "rgba(29,27,25,0.72)";
  wrap(ctx, text, width).forEach((line, i) => ctx.fillText(line, x, y + i * 16));
}

const LAYOUTS = ["cover", "contents", "opener", "text", "archive", "photo-text", "quote", "text"] as const;

/** Draw page `page` (1-based) of an issue with `pages` pages. */
export function drawMagazinePage(ctx: CanvasRenderingContext2D, page: number, pages: number, images: MagazineImages): void {
  const { width: W, height: H } = PAGE_PX;
  ctx.save();
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, W, H);
  const layout = page === 1 ? "cover" : page === pages ? "back" : LAYOUTS[(page - 1) % LAYOUTS.length] === "cover" ? "text" : LAYOUTS[(page - 1) % LAYOUTS.length];
  const margin = 48;
  switch (layout) {
    case "cover": {
      cover(ctx, images.station, 0, 0, W, H, 0.55);
      tone(ctx, 0, 0, W, H, "#d9b98f", 0.35);
      const grad = ctx.createLinearGradient(0, 0, 0, H * 0.4);
      grad.addColorStop(0, "rgba(20,16,12,0.65)");
      grad.addColorStop(1, "rgba(20,16,12,0)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H * 0.4);
      ctx.fillStyle = "#fbf7ee";
      ctx.font = `700 118px ${SERIF}`;
      ctx.fillText("Meridian", margin - 6, 150);
      ctx.font = `600 13px ${SANS}`;
      ctx.fillText("NO. 18  ·  AUTUMN  ·  THE STANDARD TIME ISSUE", margin, 182);
      const bottom = ctx.createLinearGradient(0, H * 0.6, 0, H);
      bottom.addColorStop(0, "rgba(20,16,12,0)");
      bottom.addColorStop(1, "rgba(20,16,12,0.78)");
      ctx.fillStyle = bottom;
      ctx.fillRect(0, H * 0.6, W, H * 0.4);
      ctx.fillStyle = "#fbf7ee";
      ctx.font = `600 56px ${SERIF}`;
      ctx.fillText("The day the", margin, H - 210);
      ctx.fillText("clocks agreed", margin, H - 150);
      ctx.font = `400 17px ${SANS}`;
      ctx.fillText("How four railway zones replaced the local noon", margin, H - 110);
      ctx.font = `700 12px ${SANS}`;
      ctx.fillText("ALSO: THE DAY OF TWO NOONS · GREENWICH, 1884 · A WATCH FOR EVERY ZONE", margin, H - 66);
      break;
    }
    case "contents": {
      ctx.fillStyle = INK;
      ctx.font = `600 64px ${SERIF}`;
      ctx.fillText("Contents", margin, 130);
      const items = [["3", "Railroad time", "Why the local noon had to go"], ["4", "The day of two noons", "Sunday, 18 November 1883"], ["5", "From the archive", "The Sun reports the change"], ["6", "Greenwich", "Choosing the zero of longitude"], ["7", "Keeping time", "The pocket watch and the zone"]];
      items.forEach(([n, title, deck], i) => {
        const y = 230 + i * 110;
        ctx.fillStyle = ACCENT;
        ctx.font = `600 44px ${SERIF}`;
        ctx.fillText(n, margin, y);
        ctx.fillStyle = INK;
        ctx.font = `600 26px ${SERIF}`;
        ctx.fillText(title, margin + 80, y - 14);
        ctx.font = `400 15px ${SANS}`;
        ctx.fillStyle = "rgba(29,27,25,0.75)";
        ctx.fillText(deck, margin + 80, y + 12);
        ctx.fillStyle = "rgba(29,27,25,0.18)";
        ctx.fillRect(margin, y + 40, W - 2 * margin, 1);
      });
      contain(ctx, images.watch, W - 330, H - 400, 280, 330);
      caption(ctx, "Pocket watch, about 1900. The Metropolitan Museum of Art (CC0).", margin, H - 90, 360);
      folio(ctx, page, "Contents");
      break;
    }
    case "opener": {
      ctx.fillStyle = "#2f3b40";
      ctx.fillRect(0, 0, W, H);
      contain(ctx, images.locomotive, 20, 160, W - 40, 520);
      ctx.fillStyle = "#f2ece0";
      ctx.font = `600 78px ${SERIF}`;
      ctx.fillText("Railroad", margin, 780);
      ctx.fillText("time", margin, 860);
      ctx.font = `400 18px ${SANS}`;
      wrap(ctx, "Timetables in dozens of local times, and a country that ran on the telegraph.", W - 2 * margin).forEach((l, i) => ctx.fillText(l, margin, 910 + i * 24));
      caption(ctx, "Pennsylvania Railroad locomotive no. 421, 1873. Library of Congress.", margin, 120, 420, true);
      folio(ctx, page, "Feature", true);
      break;
    }
    case "text": {
      ctx.fillStyle = INK;
      ctx.font = `600 40px ${SERIF}`;
      ctx.fillText(page % 4 === 0 ? "The day of two noons" : "Keeping time", margin, 120);
      ctx.font = `400 17px ${SANS}`;
      ctx.fillStyle = "rgba(29,27,25,0.8)";
      ctx.fillText(page % 4 === 0 ? "Sunday, 18 November 1883, at noon on four meridians" : "Every zone since is counted from one line", margin, 152);
      ctx.fillStyle = ACCENT;
      ctx.fillRect(margin, 176, 64, 3);
      const colW = (W - 2 * margin - 2 * 24) / 3;
      columns(ctx, BODY.slice(page % 2), margin, 200, 3, colW, 24, H - 260);
      // Pull quote across the foot of the page.
      ctx.fillStyle = ACCENT;
      ctx.font = `italic 600 30px ${SERIF}`;
      wrap(ctx, "“Towns on the eastern edge of a zone heard noon twice that day.”", W - 2 * margin).forEach((l, i) => ctx.fillText(l, margin, H - 200 + i * 38));
      folio(ctx, page, "Feature");
      break;
    }
    case "archive": {
      ctx.fillStyle = "#e9e2d2";
      ctx.fillRect(0, 0, W, H);
      ctx.save();
      ctx.shadowColor = "rgba(40,30,20,0.35)";
      ctx.shadowBlur = 18;
      ctx.shadowOffsetY = 8;
      ctx.fillStyle = "#fff";
      ctx.fillRect(margin, 120, W - 2 * margin, W - 2 * margin);
      ctx.restore();
      cover(ctx, images.sun, margin + 8, 128, W - 2 * margin - 16, W - 2 * margin - 16, 0);
      ctx.fillStyle = INK;
      ctx.font = `600 34px ${SERIF}`;
      ctx.fillText("From the archive", margin, 86);
      caption(ctx, "The Sun (New York), 19 November 1883, page 1: the morning after the railroads changed their clocks. Library of Congress, Chronicling America.", margin, W + 110, W - 2 * margin);
      const colW = (W - 2 * margin - 24) / 2;
      columns(ctx, BODY.slice(2, 3), margin, W + 150, 2, colW, 24, H - 70, false);
      folio(ctx, page, "Archive");
      break;
    }
    case "photo-text": {
      cover(ctx, images.greenwich, 0, 0, W, H * 0.48, 0.5);
      tone(ctx, 0, 0, W, H * 0.48, "#c9a678", 0.3);
      ctx.fillStyle = INK;
      ctx.font = `600 40px ${SERIF}`;
      ctx.fillText("Greenwich", margin, H * 0.48 + 70);
      caption(ctx, "The Royal Observatory, Greenwich, 1904 (stereograph). Library of Congress.", margin, H * 0.48 + 96, W - 2 * margin);
      const colW = (W - 2 * margin - 24) / 2;
      columns(ctx, BODY.slice(3), margin, H * 0.48 + 120, 2, colW, 24, H - 70);
      folio(ctx, page, "Feature");
      break;
    }
    case "quote": {
      ctx.fillStyle = "#1f2326";
      ctx.fillRect(0, 0, W, H);
      contain(ctx, images.watch, 140, 90, W - 280, 520);
      ctx.fillStyle = "#f2ece0";
      ctx.font = `italic 500 38px ${SERIF}`;
      wrap(ctx, "“There was no law behind it. The trains had already changed.”", W - 2 * margin).forEach((l, i) => ctx.fillText(l, margin, 720 + i * 50));
      ctx.font = `700 12px ${SANS}`;
      ctx.fillText("CONGRESS MADE STANDARD TIME OFFICIAL IN 1918", margin, 900);
      folio(ctx, page, "Feature", true);
      break;
    }
    case "back": {
      ctx.fillStyle = "#2f3b40";
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#f2ece0";
      ctx.font = `700 92px ${SERIF}`;
      ctx.fillText("Meridian", margin, H / 2);
      ctx.font = `400 16px ${SANS}`;
      ctx.fillText("A magazine about how the world keeps time.", margin, H / 2 + 40);
      break;
    }
  }
  ctx.restore();
}
