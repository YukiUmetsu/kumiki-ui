/** Screen-space UI is one surface on the front of the 3D glass; no coplanar
 * mesh stacks. Canvas is only constructed in the browser, so CC1 can plan in Node.
 * State changes are discrete and deterministic from an absolute MG1 frame.
 */
import { CanvasTexture, SRGBColorSpace } from "three";

export type JourneyPhoneKind = "sender" | "recipient";
export interface JourneyPhoneScreen {
  texture: CanvasTexture | null;
  update(frame: number, recipientOnline: boolean): void;
  dispose(): void;
}
const WIDTH = 640, HEIGHT = 1328;

export function createJourneyPhoneScreen(kind: JourneyPhoneKind): JourneyPhoneScreen {
  if (typeof document === "undefined") {
    return { texture: null, update() {}, dispose() {} };
  }
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) return { texture: null, update() {}, dispose() {} };
  const texture = new CanvasTexture(canvas);
  texture.name = `journey-${kind}-chat-display`;
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 4;
  let lastState = "";

  const color = { ink: "#172a36", muted: "#637885", line: "#dce7e8",
    background: "#f3f7f6", white: "#ffffff", accent: "#247f77",
    bubble: "#d8efeb", incoming: "#e8edee", amber: "#d99b52" };

  const round = (x: number, y: number, w: number, h: number, radius: number, fill: string) => {
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, radius);
    ctx.fill();
  };
  const txt = (message: string, x: number, y: number, size: number, fill = color.ink, weight = 500, align: CanvasTextAlign = "left") => {
    ctx.textAlign = align;
    ctx.font = `${weight} ${size}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
    ctx.fillStyle = fill;
    ctx.fillText(message, x, y);
    ctx.textAlign = "left";
  };
  const bubble = (message: string, y: number, outgoing = false) => {
    const x = outgoing ? 154 : 34;
    const width = outgoing ? 444 : 470;
    round(x, y, width, 112, 32, outgoing ? color.bubble : color.incoming);
    txt(message, x + 28, y + 69, 35, color.ink, 500);
  };
  function redraw(state: string, recipientOnline: boolean) {
    ctx.fillStyle = color.background;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    // Status bar and safe-area hierarchy.
    txt("9:41", 43, 68, 26, color.ink, 650);
    for (let i = 0; i < 4; i++) round(486 + i * 15, 58 - i * 5, 9, 12 + i * 5, 3, color.ink);
    round(558, 38, 49, 23, 7, color.ink);
    round(562, 42, 35, 15, 4, color.background);
    round(610, 45, 4, 9, 2, color.ink);
    ctx.strokeStyle = color.line; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, 180); ctx.lineTo(WIDTH, 180); ctx.stroke();

    // App masthead, back affordance, avatar, and named conversation.
    txt("‹", 28, 153, 61, color.accent, 400);
    round(115, 92, 65, 65, 33, "#bddbd7");
    txt("A", 147, 139, 37, color.accent, 680, "center");
    txt(kind === "sender" ? "Avery" : "You", 198, 127, 39, color.ink, 660);
    txt(kind === "sender" ? "Messages · online" : "Messages", 198, 159, 23, color.muted, 450);
    txt("•••", 552, 139, 30, color.accent, 700);
    txt("TODAY  6:04 PM", WIDTH / 2, 261, 22, color.muted, 650, "center");

    if (kind === "sender") {
      bubble("Are we still meeting today?", 323, false);
      bubble("Yes! What time works?", 467, true);
      bubble("Around six would be great.", 614, false);
      if (state === "draft") {
        round(24, 1172, 592, 95, 48, color.white);
        round(24, 1172, 592, 95, 48, color.white);
        txt("Meet at six?", 61, 1233, 35, color.ink, 500);
        round(526, 1185, 67, 67, 34, color.accent);
        txt("↑", 559, 1236, 46, color.white, 700, "center");
        txt("Draft · ready to send", 42, 1117, 24, color.muted, 450);
      } else {
        bubble("Meet at six?", 779, true);
        txt(state === "sending" ? "Sending…" : "Sent · 6:04 PM", 586, 932, 24, color.muted, 450, "right");
        round(24, 1172, 592, 95, 48, color.white);
        txt("Message", 61, 1233, 35, "#84969f", 450);
        round(526, 1185, 67, 67, 34, "#bfd3d0");
        txt("↑", 559, 1236, 46, color.white, 700, "center");
      }
    } else {
      if (state === "received") {
        bubble("Meet at six?", 370, false);
        txt("Delivered to this device · not a read receipt", 42, 540, 23, color.muted, 500);
      } else {
        round(48, 375, 544, 230, 26, color.white);
        txt("Conversation with You", 82, 443, 32, color.ink, 650);
        txt(recipientOnline ? "Waiting for a new message…" : "Device is offline",
          82, 505, 30, color.muted, 450);
        txt(recipientOnline ? "No incoming message yet." : "The service can deliver later.",
          82, 557, 24, color.muted, 450);
      }
      round(24, 1172, 592, 95, 48, color.white);
      txt("Message", 61, 1233, 35, "#84969f", 450);
    }
    // Home indicator visibly part of the screen, not competing translucent geometry.
    round(242, 1296, 156, 9, 5, color.ink);
    texture.needsUpdate = true;
  }
  const update = (frame: number, recipientOnline: boolean) => {
    const phase = kind === "sender" ? frame < 105 ? "draft" : frame < 145 ? "sending" : "sent"
      : recipientOnline && frame >= 2430 ? "received" : "waiting";
    const state = phase + "-" + recipientOnline;
    if (state !== lastState) {
      redraw(phase, recipientOnline);
      lastState = state;
    }
  };
  update(0, true);
  return { texture, update, dispose() { texture.dispose(); } };
}
