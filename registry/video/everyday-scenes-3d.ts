/** Serializable direction for physical everyday-object films. Existing craft,
 * studio, camera and export infrastructure are the renderer/clock owners.
 */
import { composeHeroScene, createStageSet } from "../craft/hero-stage-set";
import type { HeroComposition } from "../craft/hero-stage-set";
import { createLaptop, createSmartphone } from "../domains/technology-3d";
import { createEverydayObject } from "../craft/everyday-objects-3d";
import type { EverydayDocumentContent } from "../craft/everyday-objects-3d";
import { evaluateEverydayInteraction } from "../craft/everyday-interactions";
import { smooth } from "../craft/hero-action";
import type { SceneTemplateSpec } from "./scene-templates";

export const EVERYDAY_SCENE_RECIPES = [
  "cinematic-desk-explainer", "invoice-to-software", "epic-book-storytelling",
] as const;
export type EverydayRecipeId = typeof EVERYDAY_SCENE_RECIPES[number];

export interface EverydaySceneSpec {
  schemaVersion: 1;
  id: string;
  recipeId: EverydayRecipeId;
  fps: { num: number; den: number };
  durationFrames: number;
  width: number;
  height: number;
  deskFinish?: "walnut" | "white";
  content: {
    title: string;
    caption?: string;
    document?: EverydayDocumentContent;
    software?: { title: string; status: string };
    pages?: readonly { heading: string; text: string }[];
  };
}

const text = (value: unknown) => typeof value === "string" && value.trim().length > 0;
export function validateEverydaySceneSpec(spec: EverydaySceneSpec): void {
  if (!spec || spec.schemaVersion !== 1 || !text(spec.id)) throw new Error("Everyday scene needs a version and id.");
  if (!EVERYDAY_SCENE_RECIPES.includes(spec.recipeId)) throw new Error("Unknown everyday 3D recipe.");
  if (!Number.isSafeInteger(spec.width) || spec.width < 240 || spec.width > 3840 || spec.width % 2 ||
      !Number.isSafeInteger(spec.height) || spec.height < 240 || spec.height > 3840 || spec.height % 2)
    throw new Error("width and height must be even integers from 240 to 3840.");
  if (!Number.isSafeInteger(spec.durationFrames) || spec.durationFrames < 72 || spec.durationFrames > 18000)
    throw new Error("durationFrames must be between 72 and 18000.");
  if (!spec.fps || !Number.isSafeInteger(spec.fps.num) || !Number.isSafeInteger(spec.fps.den) ||
      spec.fps.den < 1 || spec.fps.num / spec.fps.den < 1 || spec.fps.num / spec.fps.den > 120)
    throw new Error("fps must be a rational rate between 1 and 120.");
  if (!spec.content || !text(spec.content.title) || spec.content.title.length > 140 ||
      (spec.content.caption !== undefined && (typeof spec.content.caption !== "string" || spec.content.caption.length > 300)))
    throw new Error("A scene needs a concise authored title and caption.");
  if (spec.recipeId === "epic-book-storytelling" && (!spec.content.pages || spec.content.pages.length < 2 ||
      spec.content.pages.length > 12 || spec.content.pages.some(p => !text(p.heading) || !text(p.text))))
    throw new Error("Book scene needs 2–12 authored pages with heading and text.");
  if (spec.content.document?.rows && (spec.content.document.rows.length > 8 ||
      spec.content.document.rows.some(row => !text(row.label) || !text(row.value))))
    throw new Error("Document needs up to eight labeled rows.");
  if (spec.content.software && (!text(spec.content.software.title) || !text(spec.content.software.status) ||
      spec.content.software.title.length > 36 || spec.content.software.status.length > 40))
    throw new Error("Software screen needs a concise title (36) and status (40).");
  if (spec.deskFinish && !["walnut", "white"].includes(spec.deskFinish))
    throw new Error("Desk finish must be walnut or white.");
}

type CameraPose = { position: readonly [number, number, number]; target: readonly [number, number, number]; fov: number };
const mixVec = (a: readonly [number, number, number], b: readonly [number, number, number], t: number) =>
  a.map((n, i) => n + (b[i] - n) * t) as [number, number, number];

/** Authored portrait staging is independent of landscape cropping. */
export function evaluateEverydayCamera(spec: EverydaySceneSpec, frame: number): CameraPose {
  validateEverydaySceneSpec(spec);
  if (!Number.isFinite(frame)) throw new Error("Camera frame must be finite.");
  const isPortrait = spec.height > spec.width;
  const book = spec.recipeId === "epic-book-storytelling";
  const invoice = spec.recipeId === "invoice-to-software";
  const from: CameraPose = isPortrait
    ? { position: [8, 23, 38], target: [-2.5, 0.4, 1], fov: 36 }
    : { position: [19, 20, 28], target: [-1, .6, 1], fov: 37 };
  const to: CameraPose = isPortrait
    ? { position: [3, 18, 29], target: [invoice ? -3.7 : -2, .6, invoice ? -1 : 1], fov: 33 }
    : { position: [invoice ? 10 : 13, 15, invoice ? 18 : 21], target: [invoice ? -3.7 : -1.7, .8, invoice ? -1.4 : 1.2], fov: 34 };
  const t = book ? 0 : smooth((frame - spec.durationFrames * .12) / (spec.durationFrames * .72));
  return { position: mixVec(from.position, to.position, t),
    target: mixVec(from.target, to.target, t), fov: from.fov + (to.fov - from.fov) * t };
}

/** Two desk recipes share physical objects, placement, lifetime and camera. */
export function createEverydayDeskScene(spec: EverydaySceneSpec): HeroComposition {
  validateEverydaySceneSpec(spec);
  if (spec.recipeId === "epic-book-storytelling")
    throw new Error("Epic Book uses the existing PhysicalBookHero3D adapter and toEverydayBookSpec().");
  const set = createStageSet("desk", { deskFinish: spec.deskFinish });
  const laptop = createLaptop({ id: "desk-laptop", screen: spec.content.software });
  const invoice = createEverydayObject("invoice", { id: "desk-invoice", document: spec.content.document });
  const folder = createEverydayObject("folder", { id: "desk-folder" });
  const pen = createEverydayObject("pen", { id: "desk-pen" });
  const phone = createSmartphone({ id: "desk-phone", notification: {
    title: "Workflow complete", body: spec.content.software?.status ?? "Your update is ready",
    icon: { glyph: "✓", color: "#318777" },
  } });
  const composed = composeHeroScene(set, [
    { id: "laptop", asset: laptop, slot: "desk-back", yaw: -.025 },
    { id: "invoice", asset: invoice, slot: "mat-left", yaw: -.06 },
    { id: "folder", asset: folder, slot: "desk-right", offset: [.4, 0, -.12], yaw: -.1 },
    { id: "pen", asset: pen, slot: "mat-right", yaw: .27 },
    { id: "phone", asset: phone, slot: "desk-right", offset: [.34, 0, .24], yaw: -.2 },
  ], { id: spec.id, frame: "set" });
  const paperHolder = composed.group.getObjectByName("item-invoice");
  const folderHolder = composed.group.getObjectByName("item-folder");
  const phoneHolder = composed.group.getObjectByName("item-phone");
  if (!paperHolder || !folderHolder || !phoneHolder) { composed.dispose(); throw new Error("Everyday scene could not find its named holders."); }
  // The generic phone hero is authored upright for product spins. Its tabletop
  // pose lies on the machined rear enclosure while preserving the notification UI.
  phoneHolder.rotation.x = -Math.PI / 2;
  phoneHolder.position.y += .20;
  const paperRest = paperHolder.position.clone(), folderRest = folderHolder.position.clone();
  const paperYaw = paperHolder.rotation.y;
  const begin = spec.durationFrames * .28, finish = spec.durationFrames * .78;
  return {
    ...composed,
    studio: { ...composed.studio, palette: "graphite", keyAzimuth: -32, rimColor: "#f0d9bd" },
    pose(state) {
      const frame = state.id === "static" ? spec.durationFrames - 1 : state.frame;
      if (!Number.isFinite(frame)) throw new Error("Everyday scene frame must be finite.");
      composed.poseItems({
        laptop: { id: "open", frame: Math.max(0, frame - spec.durationFrames * .07), fps: state.fps },
        phone: { id: spec.recipeId === "cinematic-desk-explainer" ? "notify" : null,
          frame: Math.max(0, frame - spec.durationFrames * .56), fps: state.fps },
      });
      paperHolder.position.copy(paperRest);
      paperHolder.rotation.y = paperYaw;
      folderHolder.position.copy(folderRest);
      if (spec.recipeId === "invoice-to-software") {
        const flight = evaluateEverydayInteraction({
          from: paperRest.toArray() as [number, number, number],
          to: [-6.4, paperRest.y, -1.35],
          startFrame: begin, endFrame: finish, clearance: 2.5,
          fromYaw: paperYaw, toYaw: .04,
        }, frame);
        paperHolder.position.set(...flight.position); paperHolder.rotation.y = flight.yaw;
        // The document settles flat near the computer; it does not pass through the screen.
      } else {
        const t = smooth((frame - spec.durationFrames * .55) / (spec.durationFrames * .25));
        folderHolder.position.x = folderRest.x + .8 * t;
      }
    },
  };
}

/** Bridges serialized everyday narrative pages to the existing bending paper renderer. */
export function toEverydayBookSpec(spec: EverydaySceneSpec): SceneTemplateSpec<"page-turn-story"> {
  validateEverydaySceneSpec(spec);
  if (spec.recipeId !== "epic-book-storytelling") throw new Error("Book adapter requires epic-book-storytelling recipe.");
  return {
    schemaVersion: 1, recipeId: "page-turn-story", recipeVersion: 1,
    id: spec.id, width: spec.width, height: spec.height, fps: spec.fps,
    durationFrames: spec.durationFrames,
    content: { documentTitle: spec.content.title, direction: "left",
      paper: { color: "#f7f1e4", ink: "#243442", roughness: .88, thickness: .19 },
      spreads: spec.content.pages!.map((page, i) => ({ id: `chapter-${i + 1}`,
        left: { heading: page.heading, text: page.text },
        right: { heading: page.heading, text: page.text },
      })),
    },
  };
}
