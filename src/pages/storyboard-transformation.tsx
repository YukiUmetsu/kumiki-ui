import { VisualTransformationDemo } from "../motion/visual-transformation-demo";

export function StoryboardTransformationPage() {
  return <main className="min-h-screen bg-canvas px-4 py-8 text-foreground [overflow-wrap:anywhere] md:px-8 md:py-12">
    <div className="mx-auto flex max-w-6xl flex-col gap-8">
      <header className="max-w-prose space-y-3">
        <nav aria-label="Motion storyboards" className="flex flex-wrap gap-5 text-body-sm text-muted-foreground">
          <a href="#/motion" className="underline underline-offset-4">Motion gallery</a>
          <a href="#/storyboard/diagram" className="underline underline-offset-4">Diagram stage</a>
          <a href="#/storyboard/exploded" className="underline underline-offset-4">Exploded view</a>
        </nav>
        <h1 className="font-serif text-heading font-normal">Visual transformation</h1>
        <p className="text-body text-muted-foreground">Follow an idea as its representation changes. Three identities connect a continuous study of form, relationships, notation and composition.</p>
      </header>
      <VisualTransformationDemo />
    </div>
  </main>;
}
