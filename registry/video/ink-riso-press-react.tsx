import { forwardRef, useImperativeHandle, useLayoutEffect, useMemo, useRef } from "react";
import type { CanvasHTMLAttributes } from "react";
import { createInkRisoSheet, pressInkRiso } from "./ink-riso-press";
import type { InkRisoSheet, InkRisoSheetSpec } from "./ink-riso-press";
import { paintInk } from "./ink-riso-wet";

export interface InkRisoCanvasProps extends Omit<CanvasHTMLAttributes<HTMLCanvasElement>, "width" | "height" | "children"> {
  /** The sheet: size, paper, drums. Keep the reference stable; a new one draws again. */
  spec: InkRisoSheetSpec;
  /** Draws the masters, back to front. Keep the reference stable. */
  draw: (sheet: InkRisoSheet) => void;
  /** "riso" presses the sheet in spot inks (default); "ink" shows it as brush ink on xuan paper. */
  finish?: "riso" | "ink";
  /** Print only these drums: a proof. The riso finish only. */
  drums?: readonly string[];
  /** What the picture shows. */
  label: string;
}
/** A brush drawing, printed in spot inks or left as ink. It draws once per `spec` and `draw`, and finishes again when `finish` or `drums` changes. */
export const InkRisoCanvas = forwardRef<HTMLCanvasElement, InkRisoCanvasProps>(function InkRisoCanvas({ spec, draw, finish = "riso", drums, label, style, ...props }, ref) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useImperativeHandle(ref, () => canvas.current as HTMLCanvasElement, []);
  const sheet = useMemo(() => { const s = createInkRisoSheet(spec); draw(s); return s; }, [spec, draw]);
  const only = drums?.join(" ");
  useLayoutEffect(() => {
    const context = canvas.current?.getContext("2d");
    if (!context) return;
    const print = finish === "ink" ? paintInk(sheet) : pressInkRiso(sheet, only === undefined ? undefined : only.split(" "));
    const image = context.createImageData(print.width, print.height);
    image.data.set(print.rgba);
    context.putImageData(image, 0, 0);
  }, [sheet, finish, only]);
  return <canvas {...props} ref={canvas} role={props["aria-hidden"] ? undefined : "img"} aria-label={props["aria-hidden"] ? undefined : label} width={sheet.w} height={sheet.h}
    style={{ display: "block", width: "100%", height: "auto", aspectRatio: `${sheet.w} / ${sheet.h}`, ...style }} />;
});
