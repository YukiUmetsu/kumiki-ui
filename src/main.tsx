import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { MotionConfig } from "motion/react";
import "./styles/global.css";
import "./styles/showcase-font.css";
import { Button } from "./ui/button";
import { Field, Input } from "./ui/input";
import { Dialog } from "./ui/dialog";

type Appearance = "light" | "dark";
type Density = "comfortable" | "compact" | "spacious";

function Showcase() {
  const [appearance, setAppearance] = useState<Appearance>("light");
  const [density, setDensity] = useState<Density>("comfortable");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [email, setEmail] = useState("");

  useEffect(() => {
    document.documentElement.dataset.kmAppearance = appearance;
    document.documentElement.dataset.kmDensity = density;
  }, [appearance, density]);

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-8 p-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-serif text-heading font-normal tracking-heading text-foreground">
          Kumiki UI — Phase 0
        </h1>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAppearance(appearance === "light" ? "dark" : "light")}
          >
            {appearance === "light" ? "Dark" : "Light"} appearance
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setDensity(
                density === "comfortable" ? "compact" : density === "compact" ? "spacious" : "comfortable"
              )
            }
          >
            Density: {density}
          </Button>
        </div>
      </header>

      <section className="flex flex-col gap-2 rounded-surface border border-border bg-surface p-6">
        <h2 className="font-serif text-heading-sm font-normal tracking-heading-sm text-foreground">
          Buttons
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="subtle">Subtle</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="destructive">Destructive</Button>
          <Button isLoading loadingLabel="Saving…">
            Save
          </Button>
          <Button size="icon" aria-label="Add item">
            +
          </Button>
        </div>
      </section>

      <section className="flex flex-col gap-2 rounded-surface border border-border bg-surface p-6">
        <h2 className="font-serif text-heading-sm font-normal tracking-heading-sm text-foreground">
          Fields
        </h2>
        <Field
          label="Email"
          hint="We never share your address."
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <Field label="Password" error="Password is required." defaultValue="" />
        <Field label="Disabled" disabled defaultValue="Read only" />
        <Input aria-label="Bare input" placeholder="Bare input" />
      </section>

      <section className="flex flex-col gap-2 rounded-surface border border-border bg-surface p-6">
        <h2 className="font-serif text-heading-sm font-normal tracking-heading-sm text-foreground">
          Dialog
        </h2>
        <div>
          <Button onClick={() => setDialogOpen(true)}>Open dialog</Button>
        </div>
        <Dialog
          open={dialogOpen}
          title="Confirm action"
          description="This action cannot be undone."
          onOpenChange={setDialogOpen}
        >
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => setDialogOpen(false)}>
              Delete
            </Button>
          </div>
        </Dialog>
      </section>
    </main>
  );
}

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Missing #root element");

createRoot(rootElement).render(
  <StrictMode>
    <MotionConfig reducedMotion="user">
      <Showcase />
    </MotionConfig>
  </StrictMode>
);
