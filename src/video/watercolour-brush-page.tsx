import { WatercolourSurface } from "../../registry/video/watercolour-brush-react";
import type { PaintSurfaceSpec } from "../../registry/video/watercolour-brush";
import type { PaintedSubject } from "./watercolour-brush-demo";

/** Shared original presentation for Storybook and the PRODUCTION FilmStage slots. */
export function PaintedPage({ spec, frame, subject, reducedMotion }: {
  spec: PaintSurfaceSpec; frame: number; subject: PaintedSubject; reducedMotion: boolean;
}) {
  const portrait = spec.height > spec.width;
  const iris = subject === "wild-iris";
  const heading = iris ? ["The quiet", "garden"] : ["Where the", "sea begins"];
  return <div style={{ width: spec.width, height: spec.height, position: "relative", background: spec.paper.color, overflow: "hidden" }}>
    <WatercolourSurface spec={spec} frame={frame} reducedMotion={reducedMotion}
      label={iris ? "Watercolour iris growing across textured paper" : "Watercolour cliffs and a quiet morning sea"}/>
    {/* Letterpress-style marginalia is a separate, stable text layer. No animated wash crosses the reading zone. */}
    <svg viewBox={`0 0 ${spec.width} ${spec.height}`} xmlns="http://www.w3.org/2000/svg"
      aria-label={iris ? "The quiet garden. A study in water and pigment." : "Where the sea begins. Notes on colour and light."}
      role="img" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
      <g fill="#394B4D">
        <path d={portrait ? "M39 53 H501" : "M42 51 H918"} stroke="#768A83" strokeWidth="1" opacity=".58"/>
        <text x={portrait ? 39 : 46} y={portrait ? 83 : 80} fontFamily="system-ui,sans-serif"
          fontSize={portrait ? 12 : 11} letterSpacing="3.4" fontWeight="700">FIELD NOTES   /   PAINT &amp; PAPER</text>
        <text x={portrait ? 35 : 42} y={portrait ? 162 : 172} fontFamily="Georgia, 'Times New Roman', serif"
          fontStyle="italic" fontSize={portrait ? 66 : 58} letterSpacing="-2.6">{heading[0]}</text>
        <text x={portrait ? 35 : 42} y={portrait ? 232 : 240} fontFamily="Georgia, 'Times New Roman', serif"
          fontStyle="italic" fontSize={portrait ? 70 : 65} letterSpacing="-2.5">{heading[1]}</text>
        <path d={portrait ? "M39 261 H326" : "M46 275 H350"} stroke="#9D8978" strokeWidth="1"/>
        <text x={portrait ? 40 : 46} y={portrait ? 299 : 312} fontFamily="Georgia,serif" fontSize={portrait ? 20 : 18}
          letterSpacing=".1" fill="#576466">{iris ? "A study in water and pigment." : "Notes on colour and light."}</text>
        <text x={portrait ? 40 : 46} y={portrait ? 333 : 347} fontFamily="system-ui,sans-serif" fontSize={portrait ? 13 : 12}
          letterSpacing="1.0" fill="#6F7874">水彩の表情  ·  WASHES ON COTTON PAPER</text>
        <path d={portrait ? "M39 896 H501" : "M42 477 H918"} stroke="#768A83" strokeWidth="1" opacity=".58"/>
        <text x={portrait ? 41 : 46} y={portrait ? 925 : 502} fontFamily="system-ui,sans-serif" fontSize={12}
          letterSpacing="2.4" fontWeight="600">ILLUSTRATION STUDY</text>
        <text x={portrait ? 416 : 850} y={portrait ? 925 : 502} fontFamily="Georgia,serif"
          fontSize={15} fontStyle="italic">{iris ? "01 / 02" : "02 / 02"}</text>
      </g>
    </svg>
  </div>;
}

