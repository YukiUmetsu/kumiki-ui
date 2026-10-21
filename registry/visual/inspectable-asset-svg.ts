/** SVG adapter: inspect any rendered SVG whose parts are tagged groups.
 *
 * Works with the domain illustration toolkit (`data-km-part` +
 * `data-km-part-index`) or any attribute you choose. Part IDs are
 * `<name>-<index>`; parents are the nearest tagged ancestor. Bounds come from
 * `getBBox()` mapped into the root's user space, so they include part poses.
 * This is a DOM snapshot: frames are accepted but not re-rendered — re-create
 * the adapter (or re-render the SVG) per frame when parts move. 2D only.
 */
import { createInspectableAsset } from "./inspectable-asset";
import type { InspectableAsset, InspectablePart } from "./inspectable-asset";

export interface InspectSvgOptions {
  id: string;
  /** Attribute naming a part (default "data-km-part"). */
  attribute?: string;
  /** Attribute holding a repeat index (default "data-km-part-index"). */
  indexAttribute?: string;
  revision?: string;
}

export function svgPartId(name: string, index: number) { return `${name}-${index}`; }

export function inspectSvgParts(root: SVGSVGElement, options: InspectSvgOptions): InspectableAsset {
  const attr = options.attribute ?? "data-km-part", indexAttr = options.indexAttribute ?? "data-km-part-index";
  const elements = Array.from(root.querySelectorAll<SVGGraphicsElement>(`[${attr}]`));
  const idOf = new Map<Element, string>();
  for (const el of elements) idOf.set(el, svgPartId(el.getAttribute(attr) ?? "part", Number(el.getAttribute(indexAttr) ?? 0)));
  const seen = new Map<string, number>();
  for (const el of elements) {
    // Tagged groups may legitimately repeat a name+index (e.g. nested shadows); disambiguate in paint order.
    const id = idOf.get(el)!, n = seen.get(id) ?? 0;
    if (n) idOf.set(el, `${id}~${n}`);
    seen.set(id, n + 1);
  }
  const parentOf = (el: Element) => { for (let p: Element | null = el.parentElement; p && p !== root; p = p.parentElement) if (idOf.has(p)) return idOf.get(p); return undefined; };
  const parts: InspectablePart[] = elements.map(el => ({ id: idOf.get(el)!, parentId: parentOf(el), label: el.getAttribute(attr) ?? undefined, hideable: true, ghostable: true }));
  const byId = new Map(elements.map(el => [idOf.get(el)!, el]));
  const rootInverse = () => root.getScreenCTM()?.inverse();
  const bounds = (id: string) => {
    const el = byId.get(id)!, box = el.getBBox(), m = el.getScreenCTM(), inv = rootInverse();
    if (!m || !inv) return { min: [box.x, box.y], max: [box.x + box.width, box.y + box.height] };
    const toRoot = inv.multiply(m);
    const pts = [[box.x, box.y], [box.x + box.width, box.y], [box.x, box.y + box.height], [box.x + box.width, box.y + box.height]].map(([x, y]) => {
      const p = new DOMPoint(x, y).matrixTransform(toRoot); return [p.x, p.y];
    });
    return { min: [Math.min(...pts.map(p => p[0])), Math.min(...pts.map(p => p[1]))], max: [Math.max(...pts.map(p => p[0])), Math.max(...pts.map(p => p[1]))] };
  };
  return createInspectableAsset({
    id: options.id, dimension: 2, parts,
    anchors: parts.map(p => ({ id: `${p.id}:center`, partId: p.id, kind: "focus" as const })),
    capabilities: { sectioning: "isolate-ghost", explodable: false, canGhost: parts.length > 0, flowPorts: false, stateful: false },
    revision: options.revision ?? `${options.id}:svg:${parts.length}`,
  }, {
    bounds: id => bounds(id),
    anchor: anchorId => { const b = bounds(anchorId.slice(0, -":center".length)); return { position: [(b.min[0] + b.max[0]) / 2, (b.min[1] + b.max[1]) / 2] }; },
  });
}
