/** Editorial macro shot of the SAME Canvas2D messaging screen used as a
 * Three.js phone texture. This is a shot insert, not a second messaging UI.
 * Driven by the absolute MG1 frame: no CSS/time-based animation clock.
 */
import { useEffect, useMemo, useRef } from "react";
import { createJourneyPhoneScreen, senderOpeningState } from "./journey-phone-screen";
import type { JourneyPhoneKind } from "./journey-phone-screen";

export interface JourneyPhoneCloseupProps { frame: number; portrait: boolean; kind?: JourneyPhoneKind; recipientOnline?: boolean; }
export function JourneyPhoneCloseup({ frame, portrait, kind = "sender", recipientOnline = true }: JourneyPhoneCloseupProps) {
  const mount = useRef<HTMLDivElement>(null);
  const screen = useMemo(() => createJourneyPhoneScreen(kind), [kind]);
  useEffect(() => {
    const host = mount.current, canvas = screen.canvas;
    if (!host || !canvas) return;
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.display = "block";
    host.appendChild(canvas);
    return () => { if (canvas.parentNode === host) host.removeChild(canvas); screen.dispose(); };
  }, [screen]);
  screen.update(frame, recipientOnline);
  const ease = (value: number) => { const t = Math.max(0, Math.min(1, value)); return t * t * (3 - 2 * t); };
  const beat = senderOpeningState(frame);
  // Editorial camera: establish the full device, PUSH INTO its lower half
  // while typing, HOLD on the composer/tap, then pull back for the handoff.
  // Translation is in percentages of the device, keeping both 16:9 and 9:16
  // screen frames safe. These poses derive from absolute MG1 frames.
  const inMotion = ease((frame - 12) / 47);
  const outMotion = ease((frame - 139) / 39);
  const emphasis = kind === "sender" ? inMotion * (1 - outMotion) : 0;
  const zoom = 1 + (portrait ? .20 : .48) * emphasis;
  const cameraPan = -(portrait ? 11 : 18) * emphasis;
  const tapActive = kind === "sender" && frame >= 100 && frame < 123;
  const tapY = ((beat.composerY + 43) / 1328) * 100;
  const editorialBeat = frame < 25 ? "THE MESSAGE" : frame < 101 ? "TYPE" : frame < 129 ? "SEND" : "THE JOURNEY";
  const editorialLine = frame < 25 ? "A moment, before it travels." :
    frame < 101 ? "Meet at six?" : frame < 129 ? "Tap Send." : "Where does it go?";
  return <div data-network-phone-closeup="" data-typed-text={kind === "sender" ? beat.typedText : undefined}
    data-zoom={zoom.toFixed(3)} data-camera-pan={cameraPan.toFixed(2)} className="absolute inset-0 overflow-hidden"
    style={{ display: "grid", placeItems: "center",
      background: "radial-gradient(ellipse at 52% 32%, #435f67 0%, #263e49 40%, #142932 85%)" }}>
    <div aria-hidden="true" className="absolute inset-0" style={{ opacity: .24,
      backgroundImage: "linear-gradient(130deg,transparent 0%,#88a9a9 48%,transparent 49%)", backgroundSize: "160% 160%" }} />
    <div className="relative" data-phone-hardware=""
      style={{
        height: portrait ? "86%" : "82%", aspectRatio: "0.49",
        maxWidth: portrait ? "82%" : "46%",
        padding: "min(1.6vw,9px)", boxSizing: "border-box",
        border: "2px solid #b5bfc3", borderRadius: "min(4vw,43px)",
        background: "linear-gradient(110deg,#697a83 0%,#e2edf0 20%,#3f5660 44%,#aabcc1 94%)",
        boxShadow: "0 30px 85px #06151fdd, inset 0 0 0 2px #607a85",
        transform: `translateY(${cameraPan}%) scale(${zoom})`, transformOrigin: "50% 50%",
      }}>
      <div ref={mount} style={{ width: "100%", height: "100%",
        borderRadius: "min(3.5vw,35px)", overflow: "hidden", background: "#eff5f3" }} />
      {kind === "sender" ? <span aria-hidden="true" data-composer-anchor=""
        className="absolute" style={{ left: "87.4%", top: `${tapY}%`,
          width: 1, height: 1, pointerEvents: "none" }} /> : null}
      {tapActive ? <div aria-hidden="true" className="absolute" data-send-tap=""
        style={{ left: "87.4%", top: `${tapY}%`, width: 46, height: 46, borderRadius: "50%",
          border: "2px solid #f6c38a", background: "rgba(247,185,109,.14)",
          transform: `translate(-50%,-50%) scale(${.55 + 1.35 * ease((frame - 101) / 17)})`,
          opacity: Math.max(0, Math.min(1, (123 - frame) / 9)),
          boxShadow: "0 0 0 8px rgba(247,185,109,.13), 0 0 20px rgba(247,185,109,.35)",
          pointerEvents: "none" }} /> : null}

    </div>
    {kind === "sender" ? <div data-opening-beat={editorialBeat}
      className="absolute hidden sm:block" aria-hidden="true"
      style={{ right: portrait ? "4%" : "5%", top: portrait ? "5%" : "42%",
        width: portrait ? "35%" : "18%", color: "#eff5f2",
        textShadow: "0 3px 24px rgba(6,19,25,.95)",
        fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" }}>
      <div style={{ letterSpacing: ".20em", color: "#9bd6cc", fontSize: "clamp(10px,1.05vw,15px)", fontWeight: 650 }}>
        {editorialBeat}
      </div>
      <div style={{ marginTop: 10, fontSize: portrait ? "clamp(17px,2.6vw,24px)" : "clamp(19px,2.3vw,33px)",
        fontWeight: 550, lineHeight: 1.2 }}>{editorialLine}</div>
      <div style={{ marginTop: 20, width: "100%", height: 2, background: "rgba(215,234,228,.22)" }}>
        <div style={{ width: `${Math.min(100, Math.max(0, frame / 190 * 100))}%`, height: "100%", background: "#edbb7e" }} />
      </div>
    </div> : null}
    <span className="sr-only">{kind === "sender" ? "Messages conversation with Avery. The composed message is Meet at six?; its Send button is tapped and the message appears in the conversation." : recipientOnline ? "Recipient Messages app. The message Meet at six? has arrived. Delivery does not establish that it was read." : "Recipient Messages app is offline. The message remains with the service for later delivery."}</span>
  </div>;
}
