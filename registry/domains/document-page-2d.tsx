/** A document page in four stages of scanning and redaction, drawn with placeholder text bars (never
 * real text). The point of the drawing is what a file still contains:
 *  - `scan`: an image of text; nothing can be searched or copied.
 *  - `ocr`: a text layer has been added; every line can be searched and copied.
 *  - `boxed`: a black box was drawn over a line, but the text layer is still there.
 *  - `flattened`: the box is burned in and the text layer is gone.
 */
import { forwardRef } from "react";
import { DomainIllustration, Part, RADIUS, STROKE, Sheet, Shadow, TextRows, useIllustration } from "./illustration-2d";
import type { DomainIllustrationProps } from "./illustration-2d";

export const DOCUMENT_PAGE_STATES = ["scan", "ocr", "boxed", "flattened"] as const;
export type DocumentPageState = typeof DOCUMENT_PAGE_STATES[number];

export interface DocumentPage2DProps extends Omit<DomainIllustrationProps, "title"> {
  /** Defaults to `scan`. */
  state?: DocumentPageState;
  /** Index (0–5) of the line covered by the black box in `boxed` and `flattened`. Defaults to 2. */
  redactedLine?: number;
  /** Accessible name and title band. Defaults by state. */
  title?: string;
}

const DEFAULT_TITLE: Record<DocumentPageState, string> = {
  scan: "Scanned image: no text layer", ocr: "Text layer added", boxed: "Box only: text still there", flattened: "Flattened: text removed",
};
const SHEET = { x: 58, y: 16, w: 124, h: 134 };
const TEXT_X = 72;
// Placeholder text lines: widths are bar lengths, not text.
const LINES = [{ y: 40, w: 96 }, { y: 56, w: 88 }, { y: 72, w: 92 }, { y: 88, w: 70 }, { y: 104, w: 90 }, { y: 120, w: 60 }];

function Page({ state, redactedLine }: { state: DocumentPageState; redactedLine: number }) {
  const c = useIllustration();
  const covered = state === "boxed" || state === "flattened";
  const line = LINES[redactedLine];
  return <g>
    <Shadow cx={SHEET.x + SHEET.w / 2} cy={SHEET.y + SHEET.h + 3} rx={SHEET.w * .5} />
    <Part name="sheet" pivot={[SHEET.x + SHEET.w / 2, SHEET.y + SHEET.h]}>
      <Sheet x={SHEET.x} y={SHEET.y} w={SHEET.w} h={SHEET.h} fold={20} tone={state === "scan" ? "deep" : "surface"} />
      <g data-km-document-lines={state}>
        {LINES.map((l, i) => <TextRows key={i} x={TEXT_X} y={l.y} widths={[l.w]} h={4.5} tone="ink" opacity={state === "scan" ? .3 : .55} />)}
      </g>
      {covered && line && <rect data-km-redaction-box="" x={TEXT_X - 3} y={line.y - 4} width={line.w + 6} height={12} rx={RADIUS.xs} fill={c.tokens.ink} />}
    </Part>
    {(state === "ocr" || state === "boxed") && <g data-km-text-layer="" fill="none" stroke={c.tokens.accent} strokeWidth={STROKE.detail} strokeDasharray="3 2.5">
      {LINES.map((l, i) => <rect key={i} x={TEXT_X - 3} y={l.y - 3.5} width={l.w + 6} height={11.5} rx={3} />)}
    </g>}
  </g>;
}

export const DocumentPage2D = forwardRef<SVGSVGElement, DocumentPage2DProps>(function DocumentPage2D({ state = "scan", redactedLine = 2, title, ...props }, ref) {
  if (!(DOCUMENT_PAGE_STATES as readonly string[]).includes(state)) {
    throw new Error(`Unknown document state "${state}". Use one of: ${DOCUMENT_PAGE_STATES.join(", ")}.`);
  }
  if (!Number.isInteger(redactedLine) || redactedLine < 0 || redactedLine >= LINES.length) {
    throw new Error(`redactedLine must be a whole number from 0 to ${LINES.length - 1}; received ${redactedLine}.`);
  }
  return <DomainIllustration {...props} ref={ref} title={title ?? DEFAULT_TITLE[state]} semanticId={`document-${state}`}
    data={{ "data-km-document-page-2d": state }}>
    <Page state={state} redactedLine={redactedLine} />
  </DomainIllustration>;
});
