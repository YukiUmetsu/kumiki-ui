/** Draws a chat card (`film-cards.ts`, VE1.4): a message thread that fills from the bottom, as on a phone. Each bubble grows its own
 * height into the thread over a few frames (a grid row from 0fr to 1fr), so older messages scroll up smoothly without measuring anything;
 * the other side's messages arrive after a typing indicator that becomes the message. A pure function of the frame. Neutral styling:
 * "me" in the brand colour on the right, the others on a quiet surface on the left, a name and an initial for each sender in a group. */
import type { CSSProperties } from "react";
import { CHAT_GROW, chatTiming } from "./film-cards";
import type { ChatCard } from "./film-cards";

const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const out3 = (t: number) => 1 - (1 - clamp01(t)) ** 3;
const BODY = "var(--km-font-body, system-ui, sans-serif)", DISPLAY = "var(--km-font-display, var(--km-font-body, system-ui, sans-serif))";

/** The colours a chat needs, from the card's palette. */
export interface ChatColors { ink: string; soft: string; fill: string; onFill: string; surface: string; border: string; light: boolean }
/** Text on a bubble of `fill`: white or near-black, whichever reads better (WCAG relative luminance). */
function inkFor(fill: string, fallback: string): string {
  const hex = /^#([0-9a-f]{6})$/i.exec(fill.trim())?.[1];
  if (!hex) return fallback;
  const [r, g, b] = [0, 2, 4].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(c => c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4), l = .2126 * r + .7152 * g + .0722 * b;
  return 1.05 / (l + .05) >= (l + .05) / .055 ? "#ffffff" : "#14161a";
}

/** Three dots that rise in turn, about twice a second. */
function TypingDots({ frame, fps, size, color, still }: { frame: number; fps: number; size: number; color: string; still: boolean }) {
  return <span role="img" aria-label="typing" style={{ display: "inline-flex", gap: size * .55, alignItems: "center", height: size * 1.6, padding: `0 ${size * .2}px` }}>
    {[0, 1, 2].map(i => {
      const phase = still ? 0 : Math.max(0, Math.sin((frame / fps) * Math.PI * 4 - i * .9)), lift = phase * size * .45;
      return <span key={i} style={{ width: size, height: size, borderRadius: size, background: color, opacity: .45 + .55 * phase, transform: `translateY(${-lift}px)` }} />;
    })}
  </span>;
}

export function ChatThread({ content, frame, fps, width, height, u, vertical, colors, reducedMotion }: {
  content: ChatCard; frame: number; fps: number; width: number; height: number; u: number; vertical: boolean; colors: ChatColors; reducedMotion: boolean;
}) {
  const timing = chatTiming(content, fps), me = content.people[0], others = content.people.slice(1), group = others.length > 1;
  const person = new Map(content.people.map(item => [item.id, item]));
  // A column like a phone's: most of a tall frame, about half a wide one, centred.
  const column = vertical ? .86 * width : Math.min(.5 * width, 1.05 * height), top = (vertical ? .1 : .07) * height, bottom = (vertical ? .12 : .07) * height;
  const text = (vertical ? 4.3 : 3.5) * u, gap = 1.1 * u, avatar = 4.4 * u;
  const title = content.title ?? (group ? others.map(item => item.name).join(", ") : others[0]?.name ?? "");
  const typingNow = timing.find(item => item.typingAt !== undefined && frame >= item.typingAt && frame < item.landAt);
  const header = clamp01(frame / 8), mine = colors.fill, theirs = colors.light ? "#e7e3da" : "rgba(255,255,255,.1)";
  const bubbleFill = (from: string) => person.get(from)?.color ?? (from === me.id ? mine : theirs);
  const bubbleInk = (from: string) => { const own = person.get(from)?.color; return own ? inkFor(own, colors.ink) : from === me.id ? colors.onFill : colors.ink; };
  const initial = (name: string) => [...name.trim()][0]?.toUpperCase() ?? "?";
  const shown = timing.filter(item => frame >= (item.typingAt ?? item.landAt));
  return <div role="log" aria-label={`Messages${title ? ` with ${title}` : ""}`} style={{ position: "absolute", left: (width - column) / 2, width: column, top, bottom, display: "flex", flexDirection: "column" }}>
    {/* The header: the other side's initial and name, and "typing…" while they type. */}
    <div style={{ display: "flex", alignItems: "center", gap: 2 * u, paddingBottom: 2.2 * u, borderBottom: `1px solid ${colors.border}`, opacity: header, transform: `translateY(${(1 - header) * -1.5 * u}px)` }}>
      <div aria-hidden="true" style={{ width: avatar * 1.25, height: avatar * 1.25, borderRadius: "50%", flex: "none", display: "grid", placeItems: "center", background: colors.light ? "#e1ddd3" : "#2b313a", border: `1px solid ${colors.border}`,
        font: `750 ${avatar * .55}px/1 ${DISPLAY}`, color: colors.ink }}>{group ? others.length + 1 : initial(others[0]?.name ?? "")}</div>
      <div style={{ minWidth: 0 }}>
        <div style={{ font: `720 ${text * 1.02}px/1.15 ${DISPLAY}`, color: colors.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{title}</div>
        <div style={{ font: `500 ${text * .62}px/1.3 ${BODY}`, color: colors.soft, minHeight: text * .8 }}>{typingNow ? (group ? `${person.get(typingNow.from)?.name} is typing…` : "typing…") : ""}</div>
      </div>
    </div>
    {/* The thread fills from the bottom; what no longer fits leaves at the top, as it would scroll away. */}
    <div style={{ flex: 1, minHeight: 0, overflow: "hidden", display: "flex", flexDirection: "column", justifyContent: "flex-end", paddingTop: 2 * u }}>
      {shown.map((item, k) => {
        const message = content.messages[item.index], landed = frame >= item.landAt, sender = person.get(item.from);
        const grow = reducedMotion ? 1 : out3((frame - (item.typingAt ?? item.landAt)) / CHAT_GROW), swap = reducedMotion ? 1 : out3((frame - item.landAt) / CHAT_GROW);
        // A group shows the sender's name over the first of their run of messages, and their initial beside its last.
        const previous = shown[k - 1], next = shown[k + 1], firstOfRun = previous?.from !== item.from, lastOfRun = next?.from !== item.from;
        const side: CSSProperties = item.mine ? { alignSelf: "flex-end", alignItems: "flex-end" } : { alignSelf: "flex-start", alignItems: "flex-start" };
        const corner = (big: number, small: number) => item.mine ? `${big}px ${big}px ${lastOfRun ? small : big}px ${big}px` : `${big}px ${big}px ${big}px ${lastOfRun ? small : big}px`;
        const bubble: CSSProperties = { maxWidth: "100%", padding: `${1.1 * u}px ${1.9 * u}px`, borderRadius: corner(2.6 * u, .7 * u), background: bubbleFill(item.from), color: bubbleInk(item.from),
          font: `500 ${text}px/1.32 ${BODY}`, overflowWrap: "anywhere", textWrap: "pretty", boxShadow: colors.light ? `0 ${.2 * u}px ${.8 * u}px rgba(0,0,0,.06)` : undefined } as CSSProperties;
        return <div key={item.index} {...grow < 1 || (landed && swap < 1) ? { "data-km-text-entering": "" } : {}}
          style={{ display: "grid", gridTemplateRows: `${grow}fr`, marginTop: grow * (firstOfRun ? gap * 1.8 : gap * .55), opacity: clamp01(grow * 1.6) }}>
          <div style={{ minHeight: 0, overflow: "hidden", display: "flex", gap: 1.4 * u, alignItems: "flex-end", ...side, flexDirection: item.mine ? "row-reverse" : "row", maxWidth: "100%", width: "100%",
            justifyContent: item.mine ? "flex-start" : "flex-start" }}>
            {group && !item.mine && <div aria-hidden="true" style={{ width: avatar, height: avatar, flex: "none", borderRadius: "50%", display: "grid", placeItems: "center", visibility: lastOfRun ? "visible" : "hidden",
              background: sender?.color ?? colors.surface, color: sender?.color ? inkFor(sender.color, colors.ink) : colors.ink, font: `720 ${avatar * .5}px/1 ${DISPLAY}` }}>{initial(sender?.name ?? "")}</div>}
            <div style={{ display: "flex", flexDirection: "column", ...side, maxWidth: "78%", transformOrigin: item.mine ? "100% 100%" : "0 100%", transform: `scale(${.92 + .08 * grow})` }}>
              {group && !item.mine && firstOfRun && <div style={{ font: `650 ${text * .62}px/1.3 ${BODY}`, color: colors.soft, margin: `0 0 ${.4 * u}px ${1.2 * u}px` }}>{sender?.name}</div>}
              {landed ? <div style={{ ...bubble, opacity: .35 + .65 * swap }}>{message.text}</div>
                : <div aria-hidden="true" style={{ ...bubble, padding: `${1.2 * u}px ${1.6 * u}px` }}><TypingDots frame={frame} fps={fps} size={text * .32} color={bubbleInk(item.from)} still={reducedMotion} /></div>}
            </div>
          </div>
        </div>;
      })}
    </div>
  </div>;
}
