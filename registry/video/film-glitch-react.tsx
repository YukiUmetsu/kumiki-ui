/** The SVG filter of a glitch cut (`film-glitch.ts`): each band of the layer moved sideways inside its own filter region, its red and blue
 * channels torn apart if the band splits. The outgoing layer draws every band (so a jump shows the outgoing picture behind it), the
 * incoming layer only the bands it has taken. */
import { Fragment } from "react";
import type { GlitchBand } from "./film-glitch";

const R_ONLY = "1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0", G_ONLY = "0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0", B_ONLY = "0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0";

export function GlitchFilter({ id, bands, incoming, width, height }: { id: string; bands: readonly GlitchBand[]; incoming: boolean; width: number; height: number }) {
  const shown = bands.map((band, k) => ({ band, k })).filter(({ band }) => !incoming || band.incoming);
  return <svg aria-hidden="true" width="0" height="0" style={{ position: "absolute" }}>
    <filter id={id} x="0" y="0" width={width} height={height} filterUnits="userSpaceOnUse" primitiveUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
      {/* An empty start, so a layer with no band of its own draws nothing. */}
      <feFlood floodOpacity={0} result="none" />
      {shown.map(({ band, k }) => {
        const region = { x: 0, y: band.y, width, height: band.height };
        return <Fragment key={k}>
          {band.split ? <>
            <feColorMatrix in="SourceGraphic" type="matrix" values={R_ONLY} result={`r${k}`} />
            <feOffset in={`r${k}`} dx={band.dx + band.split} dy={0} {...region} result={`ro${k}`} />
            <feColorMatrix in="SourceGraphic" type="matrix" values={G_ONLY} result={`g${k}`} />
            <feOffset in={`g${k}`} dx={band.dx} dy={0} {...region} result={`go${k}`} />
            <feColorMatrix in="SourceGraphic" type="matrix" values={B_ONLY} result={`b${k}`} />
            <feOffset in={`b${k}`} dx={band.dx - band.split} dy={0} {...region} result={`bo${k}`} />
            <feComposite in={`ro${k}`} in2={`go${k}`} operator="arithmetic" k2={1} k3={1} {...region} result={`rg${k}`} />
            <feComposite in={`rg${k}`} in2={`bo${k}`} operator="arithmetic" k2={1} k3={1} {...region} result={`band${k}`} />
          </> : <feOffset in="SourceGraphic" dx={band.dx} dy={0} {...region} result={`band${k}`} />}
        </Fragment>;
      })}
      <feMerge><feMergeNode in="none" />{shown.map(({ k }) => <feMergeNode key={k} in={`band${k}`} />)}</feMerge>
    </filter>
  </svg>;
}
