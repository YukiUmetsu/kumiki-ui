import { lazy, Suspense, useState } from "react";
import { CameraDemo } from "../motion/camera-demo";
import { Button } from "../ui/button";

const Camera3DDemo = lazy(() => import("../motion/camera-3d-demo"));

/** Dedicated camera planning surface; heavy 3D code loads only when requested. */
export function StoryboardCameraPage() {
  const [mode, setMode] = useState<"2d" | "3d">("3d");
  return <main className="min-h-screen bg-canvas px-4 py-8 text-foreground md:px-8 md:py-12">
    <div className="mx-auto flex max-w-6xl flex-col gap-8">
      <header className="flex flex-col gap-4">
        <nav aria-label="Motion storyboards" className="flex flex-wrap gap-5 text-body-sm text-muted-foreground">
          <a href="#/motion" className="underline underline-offset-4">Motion gallery</a>
          <a href="#/storyboard/reveal" className="underline underline-offset-4">Progressive reveal</a>
          <a href="#/storyboard/diagram" className="underline underline-offset-4">Diagram stage</a>
        </nav>
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div className="max-w-prose space-y-2">
            <h1 className="font-serif text-heading font-normal">Camera storyboard</h1>
            <p className="text-body text-muted-foreground">Plan the viewpoint as part of the story. Inspect a shot, follow its movement, and check the framing for each output.</p>
          </div>
          <div className="flex gap-2" role="group" aria-label="Camera dimensions">
            <Button variant={mode === "3d" ? "primary" : "outline"} aria-pressed={mode === "3d"} onClick={() => setMode("3d")}>3D camera</Button>
            <Button variant={mode === "2d" ? "primary" : "outline"} aria-pressed={mode === "2d"} onClick={() => setMode("2d")}>2D camera</Button>
          </div>
        </div>
      </header>
      {mode === "3d" ? <Suspense fallback={<p role="status" className="py-24 text-center text-muted-foreground">Loading 3D camera preview…</p>}><Camera3DDemo /></Suspense> : <CameraDemo />}
    </div>
  </main>;
}
