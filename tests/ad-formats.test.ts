import { describe, expect, it } from "vitest";
import { AD_FORMATS, compileAdBrief, inspectAdBrief } from "../registry/video/ad-formats";
import type { AdBrief } from "../registry/video/ad-formats";
import { cardCues, inspectCard, readingWords } from "../registry/video/film-cards";
import { inkOn, readableOn } from "../registry/video/film-cards-react";
import { compileFilm } from "../registry/video/film-document";
import type { FilmDocument } from "../registry/video/film-document";

const brand = { name: "Brand A", color: "#2f6bff", cta: { text: "Try it free", url: "example.com" } };
const briefs: Record<string, AdBrief> = {
  "hook-body-close": { id: "a1", format: "hook-body-close", brand, hook: "Your budget leaks every week", emphasis: "leaks", points: ["See every charge", "Cancel what you forgot", "Keep the difference"] },
  "problem-solution": { id: "a2", format: "problem-solution", brand, hook: "Why is month end always tight?", problem: { statement: "Small charges add up", pains: ["Subscriptions renew quietly", "Fees land late"] }, solution: "One view of every charge" },
  "before-after": { id: "a3", format: "before-after", brand, hook: "Same income, different month", before: ["Ten apps", "Missed bills"], after: ["One view", "Bills on time"] },
  "three-reasons": { id: "a4", format: "three-reasons", brand, hook: "Three reasons people switch", points: ["It is faster", "It is clearer", "It is free"], product: { subject: "phone", claim: "In your pocket" } },
  "myth-vs-fact": { id: "a5", format: "myth-vs-fact", brand, hook: "Budgeting is not about cutting", myths: [{ myth: "You must track every coffee", fact: "Track the big three" }, { myth: "Apps are complicated", fact: "Setup takes two minutes" }] },
  "social-proof": { id: "a6", format: "social-proof", brand, hook: "Forty thousand people tried it", quotes: [{ quote: "I found two subscriptions I had forgotten.", name: "A. Reviewer", rating: 5 }], rating: { value: 4.8, count: 40213 } },
};

describe("ad formats", () => {
  it("covers every format", () => expect(Object.keys(briefs).sort()).toEqual([...AD_FORMATS].sort()));
  for (const format of AD_FORMATS) it(`compiles ${format} into a film that passes its checks`, () => {
    const result = compileAdBrief(briefs[format]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const film = result.film;
    expect(film.scenes[0]).toMatchObject({ recipeId: "card", content: { card: "headline" } });
    expect(film.scenes[film.scenes.length - 1]).toMatchObject({ recipeId: "card", content: { card: "end" } });
    const compiled = compileFilm(film);
    const errors = compiled.diagnostics.filter(d => d.severity === "error");
    expect(errors).toEqual([]);
    const flagged = compiled.diagnostics.filter(d => /^(ad-|story-|card-|pacing-)/.test(d.code)).map(d => d.code);
    expect(flagged).toEqual([]);
    const seconds = film.scenes.reduce((sum, scene) => sum + scene.durationFrames, 0) / 30;
    expect(seconds).toBeLessThanOrEqual(60);
  });
  it("reports what a brief is missing, and makes no film", () => {
    const result = compileAdBrief({ id: "x", format: "three-reasons", brand: { name: "B", color: "#000" }, hook: "", points: ["one"] });
    expect(result.ok).toBe(false);
    expect(result.problems.map(p => p.path).sort()).toEqual(["/brand/cta", "/hook", "/points"]);
    expect(inspectAdBrief({ ...briefs["hook-body-close"], hook: "one two three four five six seven eight nine ten eleven" }).map(p => p.code)).toEqual(["ad-hook-long"]);
  });
});

describe("film cards and ad checks", () => {
  it("times list items from the longest item and flags lists that end before the last is read", () => {
    const list = { card: "list" as const, title: "Why", items: ["One", "Two", "A much longer third point to read"] };
    const cues = cardCues(list);
    expect(cues.map(c => c.id)).toEqual(["title", "item-1", "item-2", "item-3"]);
    expect(cues[2].frame - cues[1].frame).toBeGreaterThanOrEqual(30);
    expect(inspectCard(list, 60, 30).map(p => p.code)).toContain("card-short");
    expect(inspectCard({ card: "headline", text: "Hello there", emphasis: "nope" }, 90, 30).map(p => p.code)).toContain("card-emphasis");
    expect(inspectCard({ card: "end" }, 90, 30).map(p => p.code)).toEqual(["card-end-brand"]);
    // CJK has no spaces: two characters count as a word, so a Japanese headline is not timed as one word.
    expect(readingWords("毎週、予算が漏れている")).toBe(5);
    expect(readingWords("Try 無料")).toBe(2);
    expect(inspectCard({ card: "headline", text: "毎週、あなたの予算は少しずつ漏れています" }, 40, 30).map(p => p.code)).toContain("card-short");
  });
  it("flags a late hook, a late brand, a missing call to action and a long vertical ad", () => {
    const result = compileAdBrief(briefs["hook-body-close"]);
    if (!result.ok) throw new Error("brief");
    const late: FilmDocument = { ...result.film, brand: { name: "Brand A", color: "#2f6bff" },
      scenes: [{ id: "intro", recipeId: "shot-3d", durationFrames: 1900, content: { shot: "hero-turn", subject: "phone", label: "The phone turns slowly.", spec: { yawFrom: -80, yawTo: -30, settleFrame: 120 } } },
        ...result.film.scenes.slice(1, -1)] } as FilmDocument;
    const codes = compileFilm(late).diagnostics.map(d => d.code);
    expect(codes).toEqual(expect.arrayContaining(["ad-hook-late", "ad-brand-late", "ad-cta-missing", "ad-vertical-long"]));
  });
  it("lightens a dark brand colour until it reads as text, and picks the better ink for a fill", () => {
    expect(readableOn("#2f6bff", "#0f1216")).not.toBe("#2f6bff");
    expect(readableOn("#f2b33d", "#0f1216")).toBe("#f2b33d");
    expect(readableOn("teal", "#0f1216")).toBe("teal");
    expect(inkOn("#f2b33d")).toBe("#14161a");
    expect(inkOn("#2f6bff")).toBe("#ffffff");
  });
});
