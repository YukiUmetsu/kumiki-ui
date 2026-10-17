import { lazy, Suspense } from "react";

const ExplodedDemo = lazy(() => import("../motion/exploded-demo"));

export function StoryboardExplodedPage() {
  return <main className="min-h-screen bg-canvas px-4 py-8 text-foreground md:px-8 md:py-12">
    <div className="mx-auto flex max-w-6xl flex-col gap-8">
      <header className="max-w-prose space-y-3">
        <nav aria-label="Motion storyboards" className="flex flex-wrap gap-5 text-body-sm text-muted-foreground">
          <a href="#/storyboard/camera" className="underline underline-offset-4">Camera</a>
          <a href="#/storyboard/reveal" className="underline underline-offset-4">Progressive reveal</a>
          <a href="#/storyboard/diagram" className="underline underline-offset-4">Diagram stage</a>
        </nav>
        <h1 className="font-serif text-heading font-normal">Exploded view</h1>
        <p className="text-body text-muted-foreground">Separate an assembly without losing its structure. Inspect the layers, follow the part annotations, then bring every piece home.</p>
      </header>
      <Suspense fallback={<p role="status" className="py-24 text-center text-muted-foreground">Loading assembly preview…</p>}><ExplodedDemo /></Suspense>
    </div>
  </main>;
}
