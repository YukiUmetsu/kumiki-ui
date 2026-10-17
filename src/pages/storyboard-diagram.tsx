import { DiagramDemo } from "../motion/diagram-demo";

export function StoryboardDiagramPage() {
  return <main className="min-h-screen bg-canvas px-4 py-8 text-foreground md:px-8 md:py-12">
    <div className="mx-auto flex max-w-6xl flex-col gap-8">
      <header className="max-w-prose space-y-3">
        <nav aria-label="Motion storyboards" className="flex flex-wrap gap-5 text-body-sm text-muted-foreground">
          <a href="#/storyboard/camera" className="underline underline-offset-4">Camera</a>
          <a href="#/storyboard/reveal" className="underline underline-offset-4">Progressive reveal</a>
          <a href="#/storyboard/exploded" className="underline underline-offset-4">Exploded view</a>
          <a href="#/storyboard/transformation" className="underline underline-offset-4">Visual transformation</a>
        </nav>
        <h1 className="font-serif text-heading font-normal">Diagram stage</h1>
        <p className="text-body text-muted-foreground">Follow the information while the composition changes. Node identities, connector ports and packet positions stay linked to the same graph.</p>
      </header>
      <DiagramDemo />
    </div>
  </main>;
}
