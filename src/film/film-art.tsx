import { BusinessObject2D } from "../../registry/domains/business-object-2d";
import type { BusinessObjectKind } from "../../registry/domains/business-object-model";
import { FinanceObject2D } from "../../registry/domains/finance-object-2d";
import type { FinanceObjectKind } from "../../registry/domains/finance-object-model";
import { TechnologyObject2D } from "../../registry/domains/technology-object-2d";
import type { TechnologyObjectKind } from "../../registry/domains/technology-object-model";
import type { ObjectStoryProps } from "../../registry/video/object-story-react";

export const FILM_ART_FAMILIES = ["finance", "technology", "business"] as const;

/** The domain artboards keep wide margins for a gallery. A film object fills its box, so draw past them. */
const ART_SCALE = 1.55;

function DomainArt({ art, width, height }: { art: string; width: number; height: number }) {
  const [family, kind] = art.split(":");
  const size = { width, height, showTitle: false } as const;
  if (family === "finance") return <FinanceObject2D spec={{ id: kind, kind: kind as FinanceObjectKind }} {...size} />;
  if (family === "technology") return <TechnologyObject2D spec={{ id: kind, kind: kind as TechnologyObjectKind }} {...size} />;
  return <BusinessObject2D spec={{ id: kind, kind: kind as BusinessObjectKind }} {...size} />;
}

/** Draw `family:kind` from the 2D domain packs. A story with other art needs its own `renderObject`. */
export const renderFilmObject: ObjectStoryProps["renderObject"] = (object, { width, height }) => object.art
  ? <div style={{ width, height, transform: `scale(${ART_SCALE})` }}><DomainArt art={object.art} width={width} height={height} /></div>
  : null;
