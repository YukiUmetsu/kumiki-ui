import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { compileFilm } from "../registry/video/film-document";
import type { FilmDocument } from "../registry/video/film-document";
import { cardCues, chatTiming, inspectCard } from "../registry/video/film-cards";
import type { ChatCard } from "../registry/video/film-cards";
import { FilmCard } from "../registry/video/film-cards-react";

const chat = (extra: Partial<ChatCard> = {}): ChatCard => ({ card: "chat", people: [{ id: "me", name: "Me" }, { id: "sam", name: "Sam" }],
  messages: [{ from: "sam", text: "did you borrow my umbrella?" }, { from: "me", text: "no, why" }, { from: "sam", text: "it's gone and it is pouring" }], ...extra });

describe("chat card", () => {
  it("lands the first message at once, then each after the last is read, the other side's after typing dots", () => {
    const timing = chatTiming(chat(), 30);
    expect(timing[0]).toEqual({ index: 0, from: "sam", mine: false, landAt: 12 });
    // Mine arrive without typing dots; theirs type for 0.5 to 1.6 s, while the last message is read.
    expect(timing[1].typingAt).toBeUndefined();
    expect(timing[2].typingAt).toBeGreaterThan(timing[1].landAt);
    expect(timing[2].landAt - timing[2].typingAt!).toBeGreaterThanOrEqual(15);
    expect(timing[1].landAt - timing[0].landAt).toBeGreaterThanOrEqual(Math.round(30 * (.35 + 5 / 3.2)) - 1);
    // A pause waits longer; no typing removes the dots.
    expect(chatTiming(chat({ messages: [chat().messages[0], { from: "me", text: "no, why", pause: 20 }] }), 30)[1].landAt - timing[1].landAt).toBe(20);
    expect(chatTiming(chat({ typing: false }), 30)[2].typingAt).toBeUndefined();
    expect(cardCues(chat(), 30).map(cue => cue.id)).toEqual(["message-1", "message-2", "message-3", "landed"]);
  });

  it("checks who speaks, how long, and that the card leaves time to read the last message", () => {
    const codes = (content: ChatCard, frames = 400) => inspectCard(content, frames, 30).map(item => item.code);
    expect(codes(chat())).toEqual([]);
    expect(codes(chat({ people: [{ id: "me", name: "Me" }] }))).toContain("card-chat-people");
    expect(codes(chat({ people: [{ id: "me", name: "Me" }, { id: "me", name: "Also me" }] }))).toContain("card-chat-people");
    expect(codes(chat({ messages: [{ from: "nobody", text: "hi" }] }))).toContain("card-chat-from");
    expect(codes(chat({ messages: [{ from: "sam", text: " " }] }))).toContain("card-chat-text");
    expect(codes(chat({ messages: [{ from: "sam", text: Array(45).fill("word").join(" ") }] }))).toContain("card-chat-long");
    expect(codes(chat({ messages: [{ from: "me", text: "one" }, { from: "me", text: "two" }] }))).toContain("card-chat-one-side");
    expect(codes(chat(), 90)).toContain("card-short");
  });

  it("draws a log of bubbles: typing dots before a message lands, and the message after", () => {
    const content = chat(), timing = chatTiming(content, 30), render = (frame: number) => renderToStaticMarkup(<FilmCard content={content} frame={frame} fps={30} width={540} height={960} />);
    const typing = render(timing[2].typingAt! + 2), landed = render(timing[2].landAt + 10);
    expect(typing).toContain('role="log"');
    expect(typing).toContain('aria-label="typing"');
    expect(typing).toContain("typing…");
    expect(typing).not.toContain("it&#x27;s gone");
    expect(landed).toContain("it&#x27;s gone and it is pouring");
    expect(landed).not.toContain('aria-label="typing"');
    // A group names each sender over the first of their run of messages.
    const group = renderToStaticMarkup(<FilmCard content={chat({ people: [...content.people, { id: "noor", name: "Noor" }], messages: [{ from: "noor", text: "hello" }, { from: "sam", text: "hey" }] })} frame={200} fps={30} width={540} height={960} />);
    expect(group).toContain(">Noor<");
    expect(group).toContain(">Sam<");
  });

  it("compiles the example and plays a sound as each message lands, mine and theirs apart", () => {
    const doc = JSON.parse(readFileSync("examples/film/chat-story.film.json", "utf8")) as FilmDocument;
    const kit = { sounds: { "catalog:whoosh-fast-soft": { file: "a.wav", peakSeconds: .05 }, "catalog:tech-pulse-soft": { file: "b.wav", peakSeconds: .02 } } };
    const result = compileFilm(doc, { accentKit: kit });
    if (!result.ok) throw new Error(result.diagnostics.map(item => item.message).join("\n"));
    const sounds = (result.film.audio!.sounds ?? []).filter(sound => sound.id.startsWith("chat/umbrella/"));
    const timing = chatTiming((doc.scenes[0].content as ChatCard), 30);
    expect(sounds.map(sound => sound.frame)).toEqual(timing.map(item => item.landAt));
    expect(sounds.filter(sound => sound.id.endsWith("whoosh-fast-soft")).length).toBe(timing.filter(item => item.mine).length);
  });
});
