/** Screen-space UI is one surface on the front of the 3D glass; no coplanar
 * mesh stacks. Canvas is only constructed in the browser, so CC1 can plan in Node.
 * State changes are discrete and deterministic from an absolute MG1 frame.
 */
import { CanvasTexture, SRGBColorSpace } from "three";

export type JourneyPhoneKind = "sender" | "recipient";
export interface JourneyPhoneScreen {
  texture: CanvasTexture | null;
  /** Same canvas feeds the 3D texture and the focused editorial UI shot. */
  canvas: HTMLCanvasElement | null;
  update(frame: number, recipientOnline: boolean): void;
  dispose(): void;
}
const WIDTH = 640, HEIGHT = 1328;
export const SENDER_MESSAGE = "Meet at six?";
export const SENDER_SEND_FRAME = 105;

/** Absolute-frame editorial beats shared by Canvas2D, close-up camera and QA. */
export function senderOpeningState(frame: number) {
  const clamp = (v: number) => Math.max(0, Math.min(1, v));
  const smooth = (v: number) => { const t = clamp(v); return t * t * (3 - 2 * t); };
  const count = Math.max(0, Math.min(SENDER_MESSAGE.length, Math.floor((frame - 20) / 4) + 1));
  const typedText = frame >= SENDER_SEND_FRAME ? SENDER_MESSAGE : SENDER_MESSAGE.slice(0, count);
  const keyboardProgress = 1 - smooth((frame - 115) / 18);
  const composing = frame < 134;
  const composerY = 888 + (1172 - 888) * (1 - keyboardProgress);
  return {
    typedText,
    composing,
    caretVisible: frame < 105 && Math.floor(frame / 10) % 2 === 0,
    keyboardProgress,
    composerY,
    sendPressed: frame >= 102 && frame <= 116,
    sent: frame >= 134,
    bubbleReveal: smooth((frame - 134) / 18),
    showSendButton: frame < 118 && typedText.length > 0,
  };
}


export function createJourneyPhoneScreen(kind: JourneyPhoneKind): JourneyPhoneScreen {
  if (typeof document === "undefined") {
    return { texture: null, canvas: null, update() {}, dispose() {} };
  }
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  let obtained: CanvasRenderingContext2D | null = null;
  try { obtained = canvas.getContext("2d"); } catch { /* jsdom and server previews may have no canvas renderer. */ }
  if (!obtained) return { texture: null, canvas: null, update() {}, dispose() {} };
  const ctx = obtained;
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
    const maxTextWidth = width - 56;
    ctx.font = '500 35px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    const words = message.split(/\s+/);
    const lines: string[] = [];
    let line = "";
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (line && ctx.measureText(candidate).width > maxTextWidth) {
        lines.push(line);
        line = word;
      } else line = candidate;
    }
    if (line) lines.push(line);
    const height = Math.max(112, 53 + lines.length * 50);
    round(x, y, width, height, 32, outgoing ? color.bubble : color.incoming);
    lines.forEach((content, index) => txt(content, x + 28, y + 62 + index * 48, 35, color.ink, 500));
    return height;
  };
  function drawKeyboard(progress: number) {
    if (progress < .01) return;
    const offset = (1 - progress) * 382;
    const y0 = 990 + offset;
    ctx.fillStyle = "#dce6e8";
    ctx.fillRect(0, y0 - 20, WIDTH, HEIGHT - (y0 - 20));
    const rows = ["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"];
    for (let row = 0; row < rows.length; row++) {
      const letters = [...rows[row]];
      const usable = row === 1 ? 574 : row === 2 ? 480 : 606;
      const step = usable / letters.length;
      const begin = (WIDTH - usable) / 2;
      const y = y0 + row * 76;
      letters.forEach((letter, index) => {
        round(begin + index * step + 2, y, step - 5, 61, 8, "#f8fbfc");
        txt(letter, begin + (index + .5) * step, y + 42, 27, "#253c48", 470, "center");
      });
    }
    round(130, y0 + 231, 380, 47, 12, "#f9fcfc");
    txt("space", 320, y0 + 265, 26, color.muted, 470, "center");
  }
  function redraw(frame: number, recipientOnline: boolean) {
    const opening = senderOpeningState(frame);
    ctx.fillStyle = color.background;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    txt("9:41", 43, 68, 26, color.ink, 650);
    for (let i = 0; i < 4; i++) round(486 + i * 15, 58 - i * 5, 9, 12 + i * 5, 3, color.ink);
    round(558, 38, 49, 23, 7, color.ink);
    round(562, 42, 35, 15, 4, color.background);
    round(610, 45, 4, 9, 2, color.ink);
    ctx.strokeStyle = color.line; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, 180); ctx.lineTo(WIDTH, 180); ctx.stroke();

    txt("‹", 28, 153, 61, color.accent, 400);
    round(115, 92, 65, 65, 33, "#bddbd7");
    txt("A", 147, 139, 37, color.accent, 680, "center");
    txt(kind === "sender" ? "Avery" : "You", 198, 127, 39, color.ink, 660);
    txt(kind === "sender" ? "Messages · online" : "Messages", 198, 159, 23, color.muted, 450);
    txt("•••", 552, 139, 30, color.accent, 700);
    txt("TODAY  6:04 PM", WIDTH / 2, 261, 22, color.muted, 650, "center");

    if (kind === "sender") {
      bubble("Are we still meeting today?", 323, false);
      bubble("Yes! What time works?", 503, true);
      bubble("Around six would be great.", 662, false);
      if (opening.sent && opening.bubbleReveal > .005) {
        // The sent bubble lifts from the composer into the conversation;
        // no instant jump/cut when the software keyboard retracts.
        ctx.globalAlpha = opening.bubbleReveal;
        bubble(SENDER_MESSAGE, 849 + (1 - opening.bubbleReveal) * 220, true);
        ctx.globalAlpha = 1;
        if (opening.bubbleReveal > .98) {
          txt("Sent · 6:04 PM", 586, 1015, 24, color.muted, 450, "right");
        }
      }
      // The real composer remains directly above the virtual keyboard while
      // typing, then slides to the bottom as the keyboard retracts.
      const composerY = opening.composerY;
      drawKeyboard(opening.keyboardProgress);
      round(24, composerY, 592, 88, 44, color.white);
      if (opening.composing) {
        txt(opening.typedText || "Message", 60, composerY + 58, 35,
          opening.typedText ? color.ink : "#8798a1", 500);
        if (opening.caretVisible) {
          ctx.fillStyle = color.accent;
          ctx.font = '500 35px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
          const w = ctx.measureText(opening.typedText).width;
          ctx.fillRect(61 + w + 3, composerY + 24, 2.5, 42);
        }
      } else txt("Message", 60, composerY + 58, 35, "#8798a1", 470);
      const sendColor = opening.showSendButton ? color.accent : "#bfd3d0";
      round(526, composerY + 10, 67, 67, 34, sendColor);
      txt("↑", 559, composerY + 61 + (opening.sendPressed ? 2 : 0), 46, color.white, 700, "center");
    } else {
      if (recipientOnline && frame >= 2430) {
        bubble(SENDER_MESSAGE, 370, false);
        txt("Delivered to this device · not a read receipt", 42, 540, 23, color.muted, 500);
      } else {
        round(48, 375, 544, 230, 26, color.white);
        txt("Conversation", 82, 443, 32, color.ink, 650);
        txt(recipientOnline ? "Waiting for a new message…" : "Device is offline", 82, 505, 30, color.muted, 450);
        txt(recipientOnline ? "No incoming message yet." : "The service can deliver later.", 82, 557, 24, color.muted, 450);
      }
      round(24, 1172, 592, 95, 48, color.white);
      txt("Message", 61, 1233, 35, "#84969f", 450);
    }
    round(242, 1296, 156, 9, 5, color.ink);
    texture.needsUpdate = true;
  }
  const update = (frame: number, recipientOnline: boolean) => {
    const opening = senderOpeningState(frame);
    const state = kind === "sender"
      ? `${opening.typedText}|${opening.keyboardProgress.toFixed(3)}|${opening.caretVisible}|${opening.bubbleReveal.toFixed(3)}|${opening.sendPressed}`
      : `${recipientOnline}|${frame >= 2430}`;
    if (state !== lastState) {
      redraw(frame, recipientOnline);
      lastState = state;
    }
  };
  update(0, true);
  return { texture, canvas, update, dispose() { texture.dispose(); } };
}
