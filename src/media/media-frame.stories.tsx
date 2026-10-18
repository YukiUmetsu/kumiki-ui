import type { ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ImageAsset, MediaSpec } from "./document";
import { MediaFrame } from "./media-frame";
import { FIXTURE_ASSETS, gradientDataUri } from "./fixtures";

const meta = {
  title: "Media/Media Frame",
  component: MediaFrame,
  parameters: { layout: "padded" },
  args: { media: media({ assetId: "asset-landscape" }) },
} satisfies Meta<typeof MediaFrame>;

export default meta;
type Story = StoryObj<typeof meta>;

const landscape = FIXTURE_ASSETS["asset-landscape"];
const square = FIXTURE_ASSETS["asset-square"];
const decorativeAsset = FIXTURE_ASSETS["asset-decorative"];

/** Fill in the placement defaults so each story only states what it varies. */
function media(overrides: Partial<MediaSpec> & { assetId: string }): MediaSpec {
  return {
    fit: "cover",
    focalPoint: { x: 0.5, y: 0.5 },
    mask: { kind: "none" },
    ...overrides,
  };
}

function Frame({
  caption,
  width = 200,
  height = 140,
  children,
}: {
  caption: string;
  width?: number;
  height?: number;
  children: ReactNode;
}) {
  return (
    <figure className="m-0 flex flex-col gap-2">
      <figcaption className="text-caption text-muted-foreground">{caption}</figcaption>
      <div className="overflow-hidden rounded-surface border border-border" style={{ width, height }}>
        {children}
      </div>
    </figure>
  );
}

const FITS = ["cover", "contain", "fill", "none"] as const;

export const Fits: Story = {
  render: () => (
    <div className="flex flex-wrap gap-6">
      {FITS.map((fit) => (
        <Frame key={fit} caption={`fit="${fit}"`} width={220} height={140}>
          <MediaFrame
            media={media({ assetId: "asset-landscape", fit })}
            asset={landscape}
            className="h-full w-full"
          />
        </Frame>
      ))}
    </div>
  ),
};

const FOCALS = [0, 0.5, 1] as const;

export const FocalPoints: Story = {
  render: () => (
    <div className="flex flex-col gap-6">
      {FOCALS.map((y) => (
        <div key={y} className="flex flex-wrap gap-6">
          {FOCALS.map((x) => (
            <Frame key={x} caption={`x ${x} · y ${y}`} width={140} height={180}>
              <MediaFrame
                media={media({ assetId: "asset-landscape", focalPoint: { x, y } })}
                asset={landscape}
                className="h-full w-full"
              />
            </Frame>
          ))}
        </div>
      ))}
    </div>
  ),
};

const MASKS: ReadonlyArray<{ caption: string; spec: MediaSpec }> = [
  { caption: "mask none", spec: media({ assetId: "asset-square", mask: { kind: "none" } }) },
  {
    caption: "mask rounded · 24",
    spec: media({ assetId: "asset-square", mask: { kind: "rounded", radius: 24 } }),
  },
  { caption: "mask circle", spec: media({ assetId: "asset-square", mask: { kind: "circle" } }) },
  {
    caption: "mask inset · 12",
    spec: media({
      assetId: "asset-square",
      mask: { kind: "inset", inset: { top: 12, right: 12, bottom: 12, left: 12 } },
    }),
  },
];

export const Masks: Story = {
  render: () => (
    <div className="flex flex-wrap gap-6">
      {MASKS.map((entry) => (
        <Frame key={entry.caption} caption={entry.caption} width={180} height={180}>
          <MediaFrame media={entry.spec} asset={square} className="h-full w-full" />
        </Frame>
      ))}
    </div>
  ),
};

export const Crop: Story = {
  render: () => (
    <div className="flex flex-wrap gap-6">
      <Frame caption="source" width={240} height={150}>
        <MediaFrame media={media({ assetId: "asset-landscape" })} asset={landscape} className="h-full w-full" />
      </Frame>
      <Frame caption="crop 10% / 25% / 10% / 25%" width={240} height={150}>
        <MediaFrame
          media={media({
            assetId: "asset-landscape",
            crop: { top: 0.1, right: 0.25, bottom: 0.1, left: 0.25 },
          })}
          asset={landscape}
          className="h-full w-full"
        />
      </Frame>
    </div>
  ),
};

export const Decorative: Story = {
  render: () => (
    <Frame caption="decorative — skipped by assistive technology" width={160} height={160}>
      <MediaFrame
        media={media({ assetId: "asset-decorative", decorative: true })}
        asset={decorativeAsset}
        className="h-full w-full"
      />
    </Frame>
  ),
};

export const MissingAsset: Story = {
  render: () => (
    <Frame caption="no asset supplied — honest missing state" width={200} height={140}>
      <MediaFrame media={media({ assetId: "asset-does-not-exist" })} className="h-full w-full" />
    </Frame>
  ),
};

export const Fallback: Story = {
  render: () => (
    <Frame caption="missing asset with a supplied fallback" width={240} height={150}>
      <MediaFrame
        media={media({ assetId: "asset-does-not-exist" })}
        fallback={
          <div className="flex h-full w-full items-center justify-center bg-surface-subtle p-3 text-center text-caption text-muted-foreground">
            Placeholder frame — the referenced asset is unavailable.
          </div>
        }
        className="h-full w-full"
      />
    </Frame>
  ),
};

/**
 * A `video/*` asset rendered as a static authoring frame.
 *
 * The asset is declared inline, deliberately: **there is no video file in this
 * repository**. The `uri` is a clearly-labelled `data:video/mp4` placeholder whose
 * bytes are not a decodable video track, so the frame builds the control-free
 * `<video>` element and then reports its honest failure state; `poster` points at
 * a generated fixture image, which is what a real file would show until metadata
 * arrives. Swapping `uri` for a real file is the only change a consumer needs.
 */
const PLACEHOLDER_VIDEO: ImageAsset = {
  id: "asset-video-placeholder",
  uri: "data:video/mp4;base64,cGxhY2Vob2xkZXItdmlkZW8=",
  mediaType: "video/mp4",
  width: 1280,
  height: 720,
  attribution: "Placeholder — no video file is stored in this repository",
};

export const VideoAsset: Story = {
  render: () => (
    <Frame caption="video/mp4 — static frame, no controls or autoplay" width={280} height={158}>
      <MediaFrame
        media={media({
          assetId: PLACEHOLDER_VIDEO.id,
          alt: "Placeholder video poster",
          poster: gradientDataUri("video poster", 1280, 720, "#1f3b5c", "#101418"),
        })}
        asset={PLACEHOLDER_VIDEO}
        className="h-full w-full"
      />
    </Frame>
  ),
};
