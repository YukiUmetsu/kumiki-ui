import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { MotionConfig } from "motion/react";
import "./styles/global.css";
import "./styles/showcase-font.css";
import { ToastProvider } from "./ui/toast";
import { ComponentGalleryPage } from "./pages/component-gallery";
import { AppPatternsPage } from "./pages/app-patterns";
import { MediaCompositionsPage } from "./pages/media-compositions";
import { InfographicGalleryPage } from "./pages/infographic-gallery";
import { MotionGalleryPage } from "./pages/motion-gallery";
import { StoryboardCameraPage } from "./pages/storyboard-camera";
import { StoryboardRevealPage } from "./pages/storyboard-reveal";

/**
 * Hash router for the five showcase surfaces. `#/patterns` renders the composed
 * patterns page, `#/media` the media compositions page, `#/infographic` the
 * infographic gallery, and `#/motion` the motion gallery; every other hash
 * (including the empty one) renders the component gallery. All five read the
 * semantic tokens from `global.css`, so the light/dark appearance comes from
 * `data-km-appearance` on the document.
 */
function Router() {
  const [hash, setHash] = useState(() => window.location.hash);

  useEffect(() => {
    const handleHashChange = () => setHash(window.location.hash);
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  if (hash === "#/patterns") return <AppPatternsPage />;
  if (hash === "#/media") return <MediaCompositionsPage />;
  if (hash === "#/infographic") return <InfographicGalleryPage />;
  if (hash === "#/motion") return <MotionGalleryPage />;
  if (hash === "#/storyboard/camera") return <StoryboardCameraPage />;
  if (hash === "#/storyboard/reveal") return <StoryboardRevealPage />;
  return <ComponentGalleryPage />;
}

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Missing #root element");
}

createRoot(rootElement).render(
  <StrictMode>
    <MotionConfig reducedMotion="user">
      <ToastProvider position="top-end" timeout={5000}>
        <Router />
      </ToastProvider>
    </MotionConfig>
  </StrictMode>
);
