import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { MouseEvent as ReactMouseEvent, ReactNode } from "react";
import { MotionConfig } from "motion/react";

import { Artboard, useArtboardContext } from "../media/artboard";
import type { ArtboardFit } from "../media/artboard";
import { AlignmentGuides, useAlignmentGuides } from "../media/alignment-guides";
import type { MeasurementTarget } from "../media/alignment-guides";
import {
  createDocument,
  MEDIA_MASK_KINDS,
  MEDIA_FITS,
  resolveLayerOrder,
  retargetArtboard,
  TEXT_FITS,
  validateDocument,
} from "../media/document";
import type {
  AspectPreset,
  Layer,
  MediaDocument,
  MediaFit,
  MediaMaskKind,
  MediaSpec,
  RetargetResult,
  SnapHit,
  TextFit,
  TextSpec,
} from "../media/document";
import { EditableText } from "../media/editable-text";
import { MediaFrame } from "../media/media-frame";
import { LayerList, LayerStack } from "../media/layer-stack";
import { ExportPreview } from "../media/export-preview";
import {
  editorialSpreadDocument,
  FIXTURE_ASSETS,
  FIXTURE_FONTS,
  NEGATIVE_FIXTURES,
  squarePromoDocument,
  wideHeroDocument,
} from "../media/fixtures";

import { Button } from "../ui/button";
import { Select } from "../ui/select";
import { Surface } from "../ui/surface-card";
import { Switch } from "../ui/switch";

/* -------------------------------------------------------------------------- */
/* Shared helpers                                                             */
/* -------------------------------------------------------------------------- */

/** Render an authored heading tag as a neutral element inside embedded previews. */
function neutralizeHeading(text: TextSpec): TextSpec {
  if (text.as === "h1" || text.as === "h2" || text.as === "h3") {
    return { ...text, as: "div" };
  }
  return text;
}

/* -------------------------------------------------------------------------- */
/* Shared page shell                                                          */
/* -------------------------------------------------------------------------- */

/** Section shell header: serif heading (weight 400) + muted description. */
function PatternSection({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section data-pattern-section={id} className="flex min-w-0 flex-col">
      <header className="mb-8 flex flex-col gap-1">
        <h2 className="font-serif text-heading font-normal tracking-heading text-foreground">
          {title}
        </h2>
        <p className="max-w-prose font-sans text-body text-muted-foreground">{description}</p>
      </header>
      {children}
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* State helpers                                                              */
/* -------------------------------------------------------------------------- */

/** Toggle a layer id in a selection set without mutating the original array. */
function toggleId(ids: readonly string[], id: string): string[] {
  const set = new Set(ids);
  if (set.has(id)) {
    set.delete(id);
  } else {
    set.add(id);
  }
  return Array.from(set);
}

/** Apply an immutable transformation to one layer in a document. */
function mapDocumentLayer(
  document: MediaDocument,
  id: string,
  map: (layer: Layer) => Layer
): MediaDocument {
  return {
    ...document,
    layers: document.layers.map((layer) => (layer.id === id ? map(layer) : layer)),
  };
}

/** Change the visibility of a single layer. */
function setLayerVisible(document: MediaDocument, id: string, visible: boolean): MediaDocument {
  return mapDocumentLayer(document, id, (layer) => ({ ...layer, visible }));
}

/** Change the lock state of a single layer. */
function setLayerLocked(document: MediaDocument, id: string, locked: boolean): MediaDocument {
  return mapDocumentLayer(document, id, (layer) => ({ ...layer, locked }));
}

/**
 * Reorder a layer by moving it one step (or to the extreme) in the stacking
 * order. The document owns `z`, so this returns a new document with adjusted
 * `z` values.
 */
function reorderLayer(
  document: MediaDocument,
  id: string,
  direction: "up" | "down" | "top" | "bottom"
): MediaDocument {
  const ordered = resolveLayerOrder(document.layers);
  const index = ordered.findIndex((layer) => layer.id === id);
  if (index === -1) return document;

  if (direction === "up") {
    const next = ordered[index + 1];
    if (!next) return document;
    const currentZ = ordered[index].z;
    return {
      ...document,
      layers: document.layers.map((layer) => {
        if (layer.id === id) return { ...layer, z: next.z };
        if (layer.id === next.id) return { ...next, z: currentZ };
        return layer;
      }),
    };
  }

  if (direction === "down") {
    const prev = ordered[index - 1];
    if (!prev) return document;
    const currentZ = ordered[index].z;
    return {
      ...document,
      layers: document.layers.map((layer) => {
        if (layer.id === id) return { ...layer, z: prev.z };
        if (layer.id === prev.id) return { ...prev, z: currentZ };
        return layer;
      }),
    };
  }

  if (direction === "top") {
    const maxZ = ordered[ordered.length - 1]?.z ?? 0;
    return mapDocumentLayer(document, id, (layer) => ({ ...layer, z: maxZ + 1 }));
  }

  const minZ = ordered[0]?.z ?? 0;
  return mapDocumentLayer(document, id, (layer) => ({ ...layer, z: minZ - 1 }));
}

/* -------------------------------------------------------------------------- */
/* 1. Artboard                                                                */
/* -------------------------------------------------------------------------- */

const ZOOM_OPTIONS = [0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4].map((zoom) => ({
  value: String(zoom),
  label: `${Math.round(zoom * 100)}%`,
}));

const FIT_OPTIONS: { value: ArtboardFit; label: string }[] = [
  { value: "none", label: "None" },
  { value: "contain", label: "Contain" },
  { value: "actual", label: "Actual" },
];

function ArtboardSection() {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [fit, setFit] = useState<ArtboardFit>("contain");
  const [showSafeRegion, setShowSafeRegion] = useState(false);
  const [showBleed, setShowBleed] = useState(false);
  const [showCrop, setShowCrop] = useState(false);

  const { artboard, layers, fonts, assets } = wideHeroDocument;

  return (
    <PatternSection
      id="artboard"
      title="Artboard"
      description="The design-space frame with zoom, pan and authoring overlays that are never exported."
    >
      <div className="flex min-w-0 flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <Button
            size="sm"
            aria-label="Zoom out"
            onClick={() => setZoom((value) => Math.max(0.25, value - 0.25))}
          >
            −
          </Button>
          <Select
            label="Zoom"
            options={ZOOM_OPTIONS}
            value={String(zoom)}
            onValueChange={(value) => setZoom(Number(value ?? "1"))}
            className="w-28"
          />
          <Button
            size="sm"
            aria-label="Zoom in"
            onClick={() => setZoom((value) => Math.min(4, value + 0.25))}
          >
            +
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setZoom(1);
              setPan({ x: 0, y: 0 });
            }}
          >
            Reset
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <Select
            label="Fit"
            options={FIT_OPTIONS}
            value={fit}
            onValueChange={(value) => setFit(value ?? "none")}
            className="w-40"
          />
          <Switch
            label="Safe region"
            checked={showSafeRegion}
            onCheckedChange={setShowSafeRegion}
          />
          <Switch label="Bleed" checked={showBleed} onCheckedChange={setShowBleed} />
          <Switch label="Crop" checked={showCrop} onCheckedChange={setShowCrop} />
        </div>

        <p className="text-body-sm text-muted-foreground">
          Design size: {artboard.width} × {artboard.height} px. Current fit: {fit}. Focus the
          canvas to use +/− to step zoom, 0 to reset, and the arrow keys to pan (Shift for larger
          steps).
        </p>

        <div
          className="w-full max-w-full overflow-hidden rounded-surface border border-border bg-canvas"
          style={{ aspectRatio: `${artboard.width} / ${artboard.height}` }}
        >
          <Artboard
            artboard={artboard}
            zoom={zoom}
            pan={pan}
            fit={fit}
            showSafeRegion={showSafeRegion}
            showBleed={showBleed}
            showCrop={showCrop}
            onZoomChange={setZoom}
            onPanChange={setPan}
            aria-label="Artboard canvas"
            className="h-full w-full"
          >
            <LayerStack
              layers={layers}
              fonts={fonts}
              assets={assets}
              headingSemantics="neutral"
            />
          </Artboard>
        </div>
      </div>
    </PatternSection>
  );
}

/* -------------------------------------------------------------------------- */
/* 2. Editable text                                                           */
/* -------------------------------------------------------------------------- */

const LONG_STRING =
  "This is a deliberately long sentence that overflows the available width when clipping is active, demonstrating the truncation marker and overflow diagnostic in the readout below.";

const TEXT_FIT_OPTIONS = TEXT_FITS.map((fit) => ({
  value: fit,
  label: fit.charAt(0).toUpperCase() + fit.slice(1),
}));

function useContainerBox(ref: React.RefObject<HTMLDivElement | null>) {
  const [box, setBox] = useState({ width: 0, height: 0 });

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;

    const update = () => {
      const width = Math.min(element.clientWidth - 32, 384);
      const height = element.clientHeight - 32;
      setBox((prev) => {
        if (
          Math.abs(prev.width - width) < 1 &&
          Math.abs(prev.height - height) < 1
        ) {
          return prev;
        }
        return { width: Math.max(0, width), height: Math.max(0, height) };
      });
    };

    update();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);

  return box;
}

function LayoutReadout({
  label,
  layout,
}: {
  label: string;
  layout: {
    size: number;
    lineCount: number;
    overflow: boolean;
    truncated: boolean;
  } | null;
}) {
  if (!layout) return null;
  return (
    <div className="flex flex-col gap-1">
      <p className="text-body-sm font-medium text-foreground">{label}</p>
      <dl className="grid grid-cols-2 gap-2 text-body-sm sm:grid-cols-4">
        <div>
          <dt className="text-muted-foreground">Size</dt>
          <dd className="font-semibold">{Math.round(layout.size)} px</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Lines</dt>
          <dd className="font-semibold">{layout.lineCount}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Overflow</dt>
          <dd className="font-semibold">{layout.overflow ? "Yes" : "No"}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Truncated</dt>
          <dd className="font-semibold">{layout.truncated ? "Yes" : "No"}</dd>
        </div>
      </dl>
    </div>
  );
}

function TextSection() {
  const [text, setText] = useState<TextSpec>({
    fontId: "font-sans",
    size: 36,
    lineHeight: 1.3,
    letterSpacing: 0,
    align: "start",
    direction: "ltr",
    fit: "wrap",
    maxLines: 3,
    as: "p",
    spans: [
      {
        text: "Edit this line and watch the layout readout update. ",
        color: "#101418",
        weight: 700,
      },
      {
        text: "This run is italic and cool-toned. ",
        color: "#2b59d1",
        italic: true,
      },
      {
        text: "And this closing run is underlined and warm.",
        color: "#a13d10",
        weight: 500,
        underline: true,
      },
    ],
  });

  const [editorLayout, setEditorLayout] = useState<{
    size: number;
    lineCount: number;
    overflow: boolean;
    truncated: boolean;
  } | null>(null);

  const [readOnlyLayout, setReadOnlyLayout] = useState<{
    size: number;
    lineCount: number;
    overflow: boolean;
    truncated: boolean;
  } | null>(null);

  const editorContainerRef = useRef<HTMLDivElement>(null);
  const readOnlyContainerRef = useRef<HTMLDivElement>(null);
  const editorBox = useContainerBox(editorContainerRef);
  const readOnlyBox = useContainerBox(readOnlyContainerRef);

  return (
    <PatternSection
      id="text"
      title="Editable text"
      description="Live text editing, multi-span styling and deterministic fit policies. The read-only specimen shows the styled runs; the editable specimen suspends the policy so edits are never clipped."
    >
      <div className="flex min-w-0 flex-col gap-4">
        <p className="text-body-sm text-muted-foreground">
          The left specimen is read-only: italic, cool-toned, underlined and warm runs render as
          styled spans. The right specimen is editable: typing collapses run boundaries and
          suspends the fit policy.
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <Select
            label="Fit policy"
            options={TEXT_FIT_OPTIONS}
            value={text.fit}
            onValueChange={(value) =>
              setText((current) => ({ ...current, fit: (value as TextFit) ?? "wrap" }))
            }
            className="w-40"
          />
          <Button
            size="sm"
            onClick={() =>
              setText((current) => ({
                ...current,
                spans: [{ ...current.spans[0], text: LONG_STRING }],
              }))
            }
          >
            Use long string
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              setText((current) => ({
                ...current,
                spans: [{ ...current.spans[0], text: "Short text." }],
              }))
            }
          >
            Reset
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="flex flex-col gap-2">
            <p className="text-body-sm text-muted-foreground">Read-only presentation</p>
            <div
              ref={readOnlyContainerRef}
              className="h-64 rounded-surface border border-border bg-canvas p-4"
            >
              <div className="mx-auto h-full w-full max-w-md">
                <EditableText
                  text={text}
                  fonts={FIXTURE_FONTS}
                  box={readOnlyBox}
                  aria-label="Read-only text specimen"
                  showDiagnostics
                  onLayoutChange={(result) =>
                    setReadOnlyLayout({
                      size: result.size,
                      lineCount: result.lineCount,
                      overflow: result.overflow,
                      truncated: result.truncated,
                    })
                  }
                />
              </div>
            </div>
            <LayoutReadout label="Read-only layout" layout={readOnlyLayout} />
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-body-sm text-muted-foreground">Editable specimen</p>
            <div
              ref={editorContainerRef}
              className="min-h-64 rounded-surface border border-border bg-canvas p-4"
            >
              <div className="mx-auto w-full max-w-md">
                <EditableText
                  text={text}
                  fonts={FIXTURE_FONTS}
                  box={editorBox}
                  editable
                  aria-label="Editable text specimen"
                  showDiagnostics={false}
                  onChange={setText}
                  onLayoutChange={(result) =>
                    setEditorLayout({
                      size: result.size,
                      lineCount: result.lineCount,
                      overflow: result.overflow,
                      truncated: result.truncated,
                    })
                  }
                />
              </div>
            </div>
            <LayoutReadout label="Editor layout" layout={editorLayout} />
          </div>
        </div>
      </div>
    </PatternSection>
  );
}

/* -------------------------------------------------------------------------- */
/* 3. Media frames                                                            */
/* -------------------------------------------------------------------------- */

const FOCAL_OPTIONS = [0, 0.25, 0.5, 0.75, 1].map((value) => ({
  value: String(value),
  label: String(value),
}));

const MASK_OPTIONS = MEDIA_MASK_KINDS.map((kind) => ({
  value: kind,
  label: kind.charAt(0).toUpperCase() + kind.slice(1),
}));

function MediaSection() {
  const [focal, setFocal] = useState({ x: 0.5, y: 0.5 });
  const [mask, setMask] = useState<MediaMaskKind>("none");
  const asset = FIXTURE_ASSETS["asset-landscape"];

  const mediaByFit = useMemo<Record<MediaFit, MediaSpec>>(
    () =>
      Object.fromEntries(
        MEDIA_FITS.map((fit) => [
          fit,
          {
            assetId: asset.id,
            fit,
            focalPoint: focal,
            mask: { kind: mask },
          },
        ])
      ) as Record<MediaFit, MediaSpec>,
    [asset.id, focal, mask]
  );

  return (
    <PatternSection
      id="media"
      title="Media frames"
      description="Fit, focal point and mask are view transforms: they never mutate the source asset."
    >
      <div className="flex min-w-0 flex-col gap-4">
        <p className="text-body-sm text-muted-foreground">
          Cropping and masking never change the source asset&apos;s dimensions.
        </p>

        <div className="flex flex-wrap items-center gap-4">
          <Select
            label="Focal X"
            options={FOCAL_OPTIONS}
            value={String(focal.x)}
            onValueChange={(value) =>
              setFocal((current) => ({ ...current, x: Number(value ?? "0.5") }))
            }
            className="w-28"
          />
          <Select
            label="Focal Y"
            options={FOCAL_OPTIONS}
            value={String(focal.y)}
            onValueChange={(value) =>
              setFocal((current) => ({ ...current, y: Number(value ?? "0.5") }))
            }
            className="w-28"
          />
          <Select
            label="Mask"
            options={MASK_OPTIONS}
            value={mask}
            onValueChange={(value) => setMask((value as MediaMaskKind) ?? "none")}
            className="w-40"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {MEDIA_FITS.map((fit) => (
            <Surface
              key={fit}
              header={
                <h3 className="font-serif text-subheading font-normal tracking-subheading normal-case text-foreground">{fit}</h3>
              }
            >
              <div className="aspect-video w-full">
                <MediaFrame
                  media={mediaByFit[fit]}
                  asset={asset}
                  loading="eager"
                  className="h-full w-full"
                />
              </div>
            </Surface>
          ))}
        </div>
      </div>
    </PatternSection>
  );
}

/* -------------------------------------------------------------------------- */
/* 4. Layers                                                                  */
/* -------------------------------------------------------------------------- */

function LayersSection() {
  const [document, setDocument] = useState<MediaDocument>(editorialSpreadDocument);
  const [selectedIds, setSelectedIds] = useState<readonly string[]>([]);
  const [modifierPressed, setModifierPressed] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.shiftKey) {
        setModifierPressed(true);
      }
    };
    const handleKeyUp = (event: globalThis.KeyboardEvent) => {
      if (!event.ctrlKey && !event.metaKey && !event.shiftKey) {
        setModifierPressed(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  const handleSelect = (id: string | null) => {
    if (id == null) {
      setSelectedIds([]);
      return;
    }
    if (modifierPressed) {
      setSelectedIds((ids) => toggleId(ids, id));
    } else {
      setSelectedIds([id]);
    }
  };

  const selectedName = useMemo(() => {
    if (selectedIds.length === 0) return "None";
    if (selectedIds.length === 1) {
      return document.layers.find((layer) => layer.id === selectedIds[0])?.name ?? selectedIds[0];
    }
    return `${selectedIds.length} layers`;
  }, [selectedIds, document.layers]);

  return (
    <PatternSection
      id="layers"
      title="Layers"
      description="Select, show, hide, lock and reorder a grouped document from the layer panel."
    >
      <div className="flex min-w-0 flex-col gap-4">
        <p className="text-body-sm text-muted-foreground">
          Selected: <span className="font-semibold text-foreground">{selectedName}</span>. Hold
          Ctrl/Cmd or Shift and click a layer to multi-select. The canvas and the layer tree are
          separate tab stops.
        </p>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div
            className="min-w-0 overflow-hidden rounded-surface border border-border bg-canvas"
            style={{
              aspectRatio: `${document.artboard.width} / ${document.artboard.height}`,
            }}
          >
            <Artboard
              artboard={document.artboard}
              fit="contain"
              selectedIds={selectedIds}
              onSelect={handleSelect}
              aria-label="Composition canvas"
              className="h-full w-full"
            >
              <LayerStack
                layers={document.layers}
                fonts={document.fonts}
                assets={document.assets}
                selectedIds={selectedIds}
                onSelect={handleSelect}
                multiSelect
                headingSemantics="neutral"
              />
            </Artboard>
          </div>

          <div className="min-w-0">
            <LayerList
              layers={document.layers}
              selectedIds={selectedIds}
              onSelect={handleSelect}
              onVisibilityChange={(id, visible) =>
                setDocument((current) => setLayerVisible(current, id, visible))
              }
              onLockChange={(id, locked) =>
                setDocument((current) => setLayerLocked(current, id, locked))
              }
              onReorder={(id, direction) =>
                setDocument((current) => reorderLayer(current, id, direction))
              }
              className="h-full"
            />
          </div>
        </div>
      </div>
    </PatternSection>
  );
}

/* -------------------------------------------------------------------------- */
/* 5. Alignment guides                                                        */
/* -------------------------------------------------------------------------- */

const GUIDES_DOCUMENT: MediaDocument = createDocument({
  id: "guides-demo",
  artboard: {
    preset: "16:9",
    width: 640,
    height: 360,
    background: "#f6f6f4",
    safeRegion: 0.05,
  },
  fonts: FIXTURE_FONTS,
  assets: FIXTURE_ASSETS,
  guides: [
    { id: "guide-left", axis: "x", position: 160 },
    { id: "guide-right", axis: "x", position: 480 },
    { id: "guide-horizontal", axis: "y", position: 180 },
  ],
  grid: { visible: true, size: 16, subdivisions: 4 },
  layers: [
    {
      id: "movable-box",
      name: "Movable box",
      kind: "shape",
      semanticId: "movable-box",
      parentId: null,
      transform: { x: 60, y: 60, width: 80, height: 60 },
      z: 0,
      visible: true,
      locked: false,
      opacity: 1,
      blend: "normal",
      clip: false,
      summary: "Movable box for snap demo",
      shape: { kind: "rect", fill: "#2f6f4f" },
    } satisfies Layer,
  ],
});

function GuidesCanvas({
  document,
  selectedId,
  offset,
  snapHits,
  onOffsetChange,
  onSnapHitsChange,
}: {
  document: MediaDocument;
  selectedId: string;
  offset: { x: number; y: number };
  snapHits: readonly SnapHit[];
  onOffsetChange: (offset: { x: number; y: number }) => void;
  onSnapHitsChange: (hits: SnapHit[]) => void;
}) {
  const canvas = useArtboardContext();
  const { snap } = useAlignmentGuides(document.layers, {
    threshold: 16,
    includeGrid: true,
    gridSize: document.grid?.size ?? 32,
  });
  const rootRef = useRef<HTMLDivElement>(null);

  const applyMove = useCallback(
    (nextX: number, nextY: number) => {
      const layer = document.layers.find((entry) => entry.id === selectedId);
      if (!layer) return;
      const result = snap({
        x: nextX,
        y: nextY,
        width: layer.transform.width,
        height: layer.transform.height,
      });
      onOffsetChange({
        x: result.rect.x - layer.transform.x,
        y: result.rect.y - layer.transform.y,
      });
      onSnapHitsChange(result.hits);
    },
    [document.layers, selectedId, snap, onOffsetChange, onSnapHitsChange]
  );

  useEffect(() => {
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) return;
      const step = event.shiftKey ? 40 : 8;
      let dx = 0;
      let dy = 0;
      if (event.key === "ArrowLeft") dx = -step;
      else if (event.key === "ArrowRight") dx = step;
      else if (event.key === "ArrowUp") dy = -step;
      else if (event.key === "ArrowDown") dy = step;
      else return;
      event.preventDefault();
      const layer = document.layers.find((entry) => entry.id === selectedId);
      if (!layer) return;
      applyMove(
        layer.transform.x + offset.x + dx,
        layer.transform.y + offset.y + dy
      );
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [applyMove, document.layers, offset, selectedId]);

  const handlePointerDown = (event: ReactMouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    const startClient = { x: event.clientX, y: event.clientY };
    const startOffset = { ...offset };

    const handlePointerMove = (pointerEvent: globalThis.PointerEvent) => {
      const layer = document.layers.find((entry) => entry.id === selectedId);
      if (!layer) return;
      const dxCss = pointerEvent.clientX - startClient.x;
      const dyCss = pointerEvent.clientY - startClient.y;
      const scale = canvas.scale || 1;
      applyMove(
        layer.transform.x + startOffset.x + dxCss / scale,
        layer.transform.y + startOffset.y + dyCss / scale
      );
    };

    const handlePointerUp = () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  };

  const measurements = useMemo<MeasurementTarget[]>(() => {
    const layer = document.layers.find((entry) => entry.id === selectedId);
    if (!layer) return [];
    return [
      {
        id: layer.id,
        rect: {
          x: layer.transform.x + offset.x,
          y: layer.transform.y + offset.y,
          width: layer.transform.width,
          height: layer.transform.height,
        },
        label: layer.name,
      },
    ];
  }, [document.layers, offset, selectedId]);

  const renderLayer = (layer: Layer) => {
    if (layer.id !== selectedId) return undefined;
    return (
      <div
        onPointerDown={handlePointerDown}
        className="h-full w-full cursor-move"
        style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}
      >
        {layer.kind === "shape" ? (
          <div
            className="h-full w-full"
            style={{
              background: layer.shape.fill,
              borderRadius: layer.shape.radius ? `${layer.shape.radius}px` : undefined,
            }}
          />
        ) : null}
      </div>
    );
  };

  return (
    <div ref={rootRef} className="relative h-full w-full">
      <LayerStack
        layers={document.layers}
        fonts={document.fonts}
        assets={document.assets}
        selectedIds={[selectedId]}
        onSelect={() => {}}
        renderLayer={renderLayer}
        headingSemantics="neutral"
      />
      <AlignmentGuides
        showGrid
        showGuides
        showSafeRegion
        showCenterAxes
        showMeasurements
        measurements={measurements}
        activeSnaps={snapHits}
        minimumScale={0.2}
      />
    </div>
  );
}

function GuidesSection() {
  const [document] = useState<MediaDocument>(GUIDES_DOCUMENT);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [snapHits, setSnapHits] = useState<readonly SnapHit[]>([]);

  return (
    <PatternSection
      id="guides"
      title="Alignment guides"
      description="Grid, guides, safe region, centre axes and live snapping are authoring-only overlays."
    >
      <div className="flex min-w-0 flex-col gap-4">
        <p className="text-body-sm text-muted-foreground">
          Guides are never exported. Focus the canvas, then use a pointer or the arrow keys (Shift for
          larger steps) to move the green box; blue dashed lines show active snaps.
        </p>

        <div
          className="w-full max-w-full overflow-hidden rounded-surface border border-border bg-canvas"
          style={{
            aspectRatio: `${document.artboard.width} / ${document.artboard.height}`,
          }}
        >
          <Artboard
            artboard={document.artboard}
            guides={document.guides}
            grid={document.grid}
            aria-label="Guides canvas"
            className="h-full w-full"
          >
            <GuidesCanvas
              document={document}
              selectedId="movable-box"
              offset={offset}
              snapHits={snapHits}
              onOffsetChange={setOffset}
              onSnapHitsChange={setSnapHits}
            />
          </Artboard>
        </div>

        {snapHits.length > 0 ? (
          <ul className="flex flex-wrap gap-2" aria-label="Active snaps">
            {snapHits.map((hit, index) => (
              <li
                key={`${hit.axis}-${hit.target.kind}-${index}`}
                className="rounded-control border border-border bg-surface px-2 py-1 text-caption text-foreground"
              >
                {hit.axis === "x" ? "Vertical" : "Horizontal"} snap to{" "}
                {hit.target.kind} at {Math.round(hit.position)} px
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </PatternSection>
  );
}

/* -------------------------------------------------------------------------- */
/* 6. Export preview                                                          */
/* -------------------------------------------------------------------------- */

function ExportSection() {
  const [document] = useState<MediaDocument>(wideHeroDocument);

  return (
    <PatternSection
      id="export"
      title="Export preview"
      description="What you preview is what you ship, plus the diagnostics that catch broken documents before export."
    >
      <div className="flex min-w-0 flex-col gap-8">
        <ExportPreview
          document={document}
          scale={0.5}
          titleAs="h3"
          className="mx-auto min-w-0 max-w-3xl"
        />

        <div className="flex min-w-0 flex-col gap-4">
          <h3 className="font-serif text-subheading font-normal tracking-subheading text-foreground">
            Diagnostics
          </h3>
          <p className="text-body-sm text-muted-foreground">
            validateDocument is run on deliberately broken fixtures so the failure
            path is visible without reading code.
          </p>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {NEGATIVE_FIXTURES.map((fixture) => {
              const diagnostics = validateDocument(fixture.document);
              return (
                <Surface
                  key={fixture.id}
                  header={
                    <span className="text-body-sm font-semibold">{fixture.label}</span>
                  }
                >
                  <ul className="flex flex-col gap-2">
                    {diagnostics.length === 0 ? (
                      <li className="text-body-sm text-muted-foreground">
                        No diagnostics.
                      </li>
                    ) : (
                      diagnostics.map((diagnostic, index) => (
                        <li key={index} className="text-body-sm">
                          <div className="flex flex-wrap items-center gap-2">
                            <code className="rounded-sm bg-surface-subtle px-1 text-caption">
                              {diagnostic.code}
                            </code>
                            <span className="inline-flex items-center rounded-full border border-border bg-surface-subtle px-2 py-0.5 text-caption font-medium normal-case text-foreground">
                              {diagnostic.severity.charAt(0).toUpperCase() +
                                diagnostic.severity.slice(1)}
                            </span>
                            {diagnostic.layerId ? (
                              <span className="text-caption text-muted-foreground">
                                layer {diagnostic.layerId}
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-1 text-foreground">{diagnostic.message}</p>
                        </li>
                      ))
                    )}
                  </ul>
                </Surface>
              );
            })}
          </div>
        </div>
      </div>
    </PatternSection>
  );
}

/* -------------------------------------------------------------------------- */
/* 7. Golden compositions                                                     */
/* -------------------------------------------------------------------------- */

const GOLDEN_PRESETS: { value: Exclude<AspectPreset, "custom">; label: string }[] = [
  { value: "16:9", label: "16:9" },
  { value: "9:16", label: "9:16" },
  { value: "1:1", label: "1:1" },
];

const GOLDEN_MIN_SCALE = 0.65;

function isLightColor(color: string): boolean {
  const hex = color.replace("#", "");
  if (hex.length !== 6) return false;
  const r = Number.parseInt(hex.slice(0, 2), 16);
  const g = Number.parseInt(hex.slice(2, 4), 16);
  const b = Number.parseInt(hex.slice(4, 6), 16);
  if (!Number.isFinite(r + g + b)) return false;
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.7;
}

function GoldenComposition({
  document: initialDocument,
  initialPreset,
}: {
  document: MediaDocument;
  initialPreset: Exclude<AspectPreset, "custom">;
}) {
  const [result, setResult] = useState<RetargetResult>(() =>
    retargetArtboard(initialDocument, { preset: initialPreset })
  );

  const title = result.document.metadata?.title ?? result.document.id;
  const { width, height } = result.document.artboard;
  const minPreviewWidth = Math.round(width * GOLDEN_MIN_SCALE);

  const renderLayer = useCallback(
    (layer: Layer) => {
      if (layer.kind !== "text") return undefined;
      const needsBackdrop = layer.text.spans.some(
        (span) => span.color && isLightColor(span.color)
      );
      return (
        <>
          {needsBackdrop ? (
            <div className="absolute inset-0 bg-black/50" aria-hidden="true" />
          ) : null}
          <EditableText
            text={neutralizeHeading(layer.text)}
            box={{ width: layer.transform.width, height: layer.transform.height }}
            fonts={result.document.fonts}
            editable={false}
            showDiagnostics={false}
          />
        </>
      );
    },
    [result.document.fonts]
  );

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-serif text-subheading font-normal tracking-subheading text-foreground">
            {title}
          </h3>
          <p className="text-caption text-muted-foreground">
            {width} × {height} px
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {GOLDEN_PRESETS.map((preset) => (
            <Button
              key={preset.value}
              size="sm"
              variant={result.document.artboard.aspect === preset.value ? "primary" : "outline"}
              onClick={() => setResult(retargetArtboard(initialDocument, { preset: preset.value }))}
            >
              {preset.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="max-h-[38rem] min-w-0 w-full overflow-auto rounded-surface border border-border bg-canvas">
        <div
          className="mx-auto"
          style={{
            aspectRatio: `${width} / ${height}`,
            width: `min(100%, calc(38rem * ${width} / ${height}))`,
            minWidth: `${minPreviewWidth}px`,
          }}
        >
          <Artboard artboard={result.document.artboard} fit="contain" className="h-full w-full">
            <LayerStack
              layers={result.document.layers}
              fonts={result.document.fonts}
              assets={result.document.assets}
              headingSemantics="neutral"
              renderLayer={renderLayer}
            />
          </Artboard>
        </div>
      </div>

      {result.diagnostics.length > 0 ? (
        <ul className="flex flex-col gap-1 text-body-sm text-muted-foreground">
          {result.diagnostics.map((diagnostic, index) => (
            <li key={index}>
              {diagnostic.code} · {diagnostic.severity}
              {diagnostic.layerId ? ` · ${diagnostic.layerId}` : ""}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function GoldenSection() {
  return (
    <PatternSection
      id="golden"
      title="Golden compositions"
      description="Three complete compositions reframed at authoring time so every layer keeps its aspect ratio."
    >
      <div className="flex min-w-0 flex-col gap-12">
        <GoldenComposition document={wideHeroDocument} initialPreset="16:9" />
        <GoldenComposition document={squarePromoDocument} initialPreset="16:9" />
        <GoldenComposition document={editorialSpreadDocument} initialPreset="9:16" />
      </div>
    </PatternSection>
  );
}

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Showcase page that exercises the media foundation end to end through
 * interactive sections for artboards, text, media, layers, guides, export and
 * three responsive golden compositions.
 */
export function MediaCompositionsPage() {
  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen bg-canvas p-4 py-8 md:p-8 md:py-10">
        <div className="mx-auto flex max-w-5xl flex-col gap-16">
          <header className="flex flex-col gap-1">
            <h1 className="font-serif text-heading font-normal tracking-heading text-foreground">
              Media compositions
            </h1>
            <p className="text-body text-muted-foreground">
              Interactive showcase of the media foundation: artboards, text, media,
              layers, guides, export and responsive reflow.
            </p>
          </header>

          <ArtboardSection />
          <TextSection />
          <MediaSection />
          <LayersSection />
          <GuidesSection />
          <ExportSection />
          <GoldenSection />
        </div>
      </div>
    </MotionConfig>
  );
}

export default MediaCompositionsPage;
