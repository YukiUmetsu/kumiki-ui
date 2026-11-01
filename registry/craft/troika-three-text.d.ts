/** Minimal public surface consumed by the portable Kumiki text adapter.
 * troika-three-text@0.52.5 does not ship TypeScript declarations.
 * Keep this adjacent to text-label.ts in registry fixtures.
 */
declare module "troika-three-text" {
  import { Mesh } from "three";

  export class Text extends Mesh {
    text: string;
    font: string | null;
    fontSize: number;
    maxWidth: number;
    textAlign: "left" | "center" | "right" | "justify";
    anchorX: "left" | "center" | "right";
    anchorY: "middle" | "top" | "bottom" | "bottom-baseline" | "top-baseline";
    color: number;
    outlineWidth: number;
    outlineColor: number;
    unicodeFontsURL: string | null;
    gpuAccelerateSDF: boolean;
    sync(callback?: () => void): void;
    dispose(): void;
  }
}
