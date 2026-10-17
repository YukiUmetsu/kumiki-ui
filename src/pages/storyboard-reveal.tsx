import { RevealDemo } from "../motion/reveal-demo";

export function StoryboardRevealPage() {
  return <main className="min-h-screen bg-canvas px-4 py-8 text-foreground md:px-8 md:py-12">
    <div className="mx-auto flex max-w-6xl flex-col gap-8">
      <header className="max-w-prose space-y-3">
        <a href="#/storyboard/camera" className="text-body-sm text-muted-foreground underline underline-offset-4">Camera storyboard</a>
        <h1 className="font-serif text-heading font-normal">Progressive reveal</h1>
        <p className="text-body text-muted-foreground">Build an explanation one element at a time. Control entrances, readable holds and visual emphasis with frames or named cues.</p>
      </header>
      <RevealDemo />
    </div>
  </main>;
}
