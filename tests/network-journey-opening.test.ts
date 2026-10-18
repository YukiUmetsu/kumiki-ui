import { describe, expect, it } from "vitest";
import { SENDER_MESSAGE, SENDER_SEND_FRAME, senderOpeningState } from "../src/network-journey/journey-phone-screen";

describe("Network Journey animated Send opening", () => {
  it("reveals characters progressively using absolute frame indices", () => {
    expect(senderOpeningState(0).typedText).toBe("");
    expect(senderOpeningState(40).typedText.length).toBeGreaterThan(1);
    expect(senderOpeningState(40).typedText.length).toBeLessThan(SENDER_MESSAGE.length);
    expect(senderOpeningState(75).typedText).toBe(SENDER_MESSAGE);
    expect(senderOpeningState(75).showSendButton).toBe(true);
  });

  it("keeps the keyboard and composer visible through the actual tap, then removes it", () => {
    const before = senderOpeningState(96);
    const pressed = senderOpeningState(SENDER_SEND_FRAME);
    const sliding = senderOpeningState(122);
    const sent = senderOpeningState(154);
    expect(before.composerY).toBeLessThan(950);
    expect(pressed.sendPressed).toBe(true);
    expect(pressed.keyboardProgress).toBeCloseTo(1);
    expect(sliding.keyboardProgress).toBeLessThan(1);
    expect(sliding.composerY).toBeGreaterThan(pressed.composerY);
    expect(sent.keyboardProgress).toBe(0);
    expect(sent.composing).toBe(false);
    expect(sent.sent).toBe(true);
    expect(sent.bubbleReveal).toBe(1);
  });

  it("has frame-seek determinism without a CSS or wall-clock animation", () => {
    const frames = [0, 25, 48, 80, 105, 112, 122, 133, 140, 152, 170];
    const originals = frames.map(senderOpeningState);
    for (const frame of [...frames].reverse()) senderOpeningState(frame);
    expect(frames.map(senderOpeningState)).toEqual(originals);
  });
});
