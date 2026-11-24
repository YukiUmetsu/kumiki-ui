import type { CSSProperties, ReactNode } from "react";
import "@fontsource/yuji-boku";
import "@fontsource-variable/playfair-display";
import "@fontsource-variable/newsreader";
import { InkFilmPlayer } from "../../../registry/video/ink/ink-film-react";
import type { InkFilmPlayerProps } from "../../../registry/video/ink/ink-film-react";
import { inkPainter } from "../../../registry/video/ink/ink-paint-pool";
import { INK_BOOK } from "../../../registry/video/ink/ink-subjects";

/** Fonts of the demos: a brush hand (SIL OFL 1.1) for characters, a serif for Latin letters. */
export const INK_FONTS = { brush: "400 {px} 'Yuji Boku'", latin: "600 {px} 'Playfair Display Variable'" };
export const INK_WORDS = { "--ink-film-latin": "'Newsreader Variable', Georgia, serif", "--ink-film-zh": "'Yuji Boku', 'Songti SC', serif" } as CSSProperties;
export function InkStudioPage({ children, wide = true }: { children: ReactNode; wide?: boolean }) {
  return <main style={{ minHeight: "100vh", boxSizing: "border-box", padding: "24px 20px", background: "#E4E0D6", ...INK_WORDS }}><div style={{ maxWidth: wide ? 1280 : 720, margin: "0 auto" }}>{children}</div></main>;
}
/** A film on its page, painted by the workers. */
export function InkStudioFilm({ wide, ...props }: Omit<InkFilmPlayerProps, "book" | "painter"> & { wide?: boolean }) {
  return <InkStudioPage wide={wide}><InkFilmPlayer {...props} book={INK_BOOK} painter={inkPainter} /></InkStudioPage>;
}
