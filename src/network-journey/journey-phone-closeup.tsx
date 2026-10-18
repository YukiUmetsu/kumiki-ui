/** Editorial macro shot of the SAME Canvas2D messaging screen used as a
 * Three.js phone texture. This is a shot insert, not a second messaging UI.
 * Driven by the absolute MG1 frame: no CSS/time-based animation clock.
 */
import { useEffect, useMemo, useRef } from "react";
import { createJourneyPhoneScreen } from "./journey-phone-screen";

export interface JourneyPhoneCloseupProps { frame: number; portrait: boolean; }
export function JourneyPhoneCloseup({ frame, portrait }: JourneyPhoneCloseupProps) {
  const mount = useRef<HTMLDivElement>(null);
  const screen = useMemo(() => createJourneyPhoneScreen("sender"), []);
  useEffect(() => {
    const host = mount.current, canvas = screen.canvas;
    if (!host || !canvas) return;
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.display = "block";
    host.appendChild(canvas);
    return () => { if (canvas.parentNode === host) host.removeChild(canvas); screen.dispose(); };
  }, [screen]);
  screen.update(frame, true);
  const ease = (value: number) => { const t = Math.max(0, Math.min(1, value)); return t * t * (3 - 2 * t); };
  const approach = ease((frame - 65) / 34);
  const zoom = 1.12 - .12 * approach;
  return <div data-network-phone-closeup="" className="absolute inset-0 overflow-hidden"
    style={{ display: "grid", placeItems: "center",
      background: "radial-gradient(ellipse at 52% 32%, #435f67 0%, #263e49 40%, #142932 85%)" }}>
    <div aria-hidden="true" className="absolute inset-0" style={{ opacity: .24,
      backgroundImage: "linear-gradient(130deg,transparent 0%,#88a9a9 48%,transparent 49%)", backgroundSize: "160% 160%" }} />
    <div className="relative" data-phone-hardware=""
      style={{
        height: portrait ? "89%" : "94%", aspectRatio: "0.49",
        maxWidth: portrait ? "82%" : "46%",
        padding: "min(1.6vw,9px)", boxSizing: "border-box",
        border: "2px solid #b5bfc3", borderRadius: "min(4vw,43px)",
        background: "linear-gradient(110deg,#697a83 0%,#e2edf0 20%,#3f5660 44%,#aabcc1 94%)",
        boxShadow: "0 30px 85px #06151fdd, inset 0 0 0 2px #607a85",
        transform: `scale(${zoom})`, transformOrigin: "50% 50%",
      }}>
      <div ref={mount} style={{ width: "100%", height: "100%",
        borderRadius: "min(3.5vw,35px)", overflow: "hidden", background: "#eff5f3" }} />
    </div>
    {frame >= 70 && frame < 140 ? <div className="absolute"
      style={{ bottom: portrait ? "6%" : "9%", right: portrait ? "7%" : "10%",
        maxWidth: portrait ? "39%" : "29%",
        color: "#f0f5f2", textShadow: "0 2px 10px #10242a",
        font: `550 ${portrait ? "clamp(14px,3vw,22px)" : "clamp(17px,2vw,25px)"}/1.25 -apple-system,BlinkMacSystemFont,sans-serif` }}>
      Tap Send <span aria-hidden="true" style={{ color: "#edbb7e" }}>↗</span>
      </div> : null}
    <span className="sr-only">Messages conversation with Avery. The composed message is Meet at six?; its Send button is tapped and the message appears in the conversation.</span>
  </div>;
}
