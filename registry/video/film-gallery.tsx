import { forwardRef, useMemo, useState } from "react";
import type { ComponentPropsWithoutRef } from "react";

export interface GalleryFilm {
  id: string;
  title: string;
  /** One line that says what happens in the film. */
  summary: string;
  src: string;
  poster: string;
  /** Words that find this film in the search box. */
  keywords?: readonly string[];
  /** For example "26 s, 16:9". */
  meta?: string;
  /** Set this for a 9:16 film. */
  portrait?: boolean;
  /** A caption file. Add one to any film that has speech. */
  captions?: string;
}
export interface FilmCardProps extends ComponentPropsWithoutRef<"figure"> { film: GalleryFilm }
/** One film. It loads nothing until the viewer presses play, and it never plays by itself. */
export const FilmCard = forwardRef<HTMLElement, FilmCardProps>(function FilmCard({ film, style, ...props }, ref) {
  return <figure {...props} ref={ref} data-km-film-card={film.id} style={{ margin: 0, display: "grid", gap: 10, alignContent: "start", minWidth: 0, ...style }}>
    <video controls preload="none" playsInline poster={film.poster} src={film.src} aria-label={film.title} style={{ display: "block", width: "100%", aspectRatio: film.portrait ? "9 / 16" : "16 / 9", maxHeight: film.portrait ? "80vh" : undefined, objectFit: "contain", borderRadius: 12, background: "#0a0d12" }}>
      {film.captions && <track kind="captions" src={film.captions} default />}
    </video>
    <figcaption style={{ display: "grid", gap: 4 }}>
      <strong style={{ fontSize: "1.125rem", lineHeight: 1.3 }}>{film.title}</strong>
      <span style={{ lineHeight: 1.5 }}>{film.summary}</span>
      {film.meta && <span style={{ fontSize: ".875rem", opacity: .75 }}>{film.meta}</span>}
    </figcaption>
  </figure>;
});
export interface FilmGalleryProps extends ComponentPropsWithoutRef<"section"> {
  films: readonly GalleryFilm[];
  /** A label for the search box. */
  searchLabel?: string;
}
/** A searchable wall of films. The search reads titles, summaries and keywords. All words must match. */
export const FilmGallery = forwardRef<HTMLElement, FilmGalleryProps>(function FilmGallery({ films, searchLabel = "Search films", style, ...props }, ref) {
  const [query, setQuery] = useState("");
  const shown = useMemo(() => {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    return films.filter(film => { const text = [film.title, film.summary, ...film.keywords ?? []].join(" ").toLowerCase(); return words.every(word => text.includes(word)); });
  }, [films, query]);
  return <section {...props} ref={ref} style={{ display: "grid", gap: 20, ...style }}>
    <label style={{ display: "grid", gap: 6, maxWidth: 420 }}>{searchLabel}
      <input type="search" value={query} onChange={event => setQuery(event.target.value)} style={{ font: "inherit", minHeight: 44, padding: "8px 12px", borderRadius: 8, border: "1px solid currentColor", background: "transparent", color: "inherit" }} /></label>
    <p aria-live="polite" style={{ margin: 0 }}>{shown.length === films.length ? `${films.length} films` : `${shown.length} of ${films.length} films`}</p>
    {shown.length ? <div style={{ display: "grid", gap: 28, gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 420px), 1fr))" }}>{shown.map(film => <FilmCard key={film.id} film={film} />)}</div>
      : <p style={{ margin: 0 }}>No film matches. Try one word, such as water or ice.</p>}
  </section>;
});
