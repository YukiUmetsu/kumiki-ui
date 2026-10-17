import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { MotionConfig } from "motion/react";
import "./styles/global.css";
import "./styles/showcase-font.css";
import { ToastProvider } from "./ui/toast";
import { ComponentGalleryPage } from "./pages/component-gallery";
import { AppPatternsPage } from "./pages/app-patterns";

/**
 * Hash router for the two showcase surfaces. `#/patterns` renders the composed
 * patterns page; every other hash (including the empty one) renders the
 * component gallery. Both read the semantic tokens from `global.css`, so the
 * light/dark appearance comes from `data-km-appearance` on the document.
 */
function Router() {
  const [hash, setHash] = useState(() => window.location.hash);

  useEffect(() => {
    const handleHashChange = () => setHash(window.location.hash);
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  return hash === "#/patterns" ? <AppPatternsPage /> : <ComponentGalleryPage />;
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
