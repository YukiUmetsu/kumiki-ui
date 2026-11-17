/** The module worker that runs MAKEUP1's render job (see `makeup-render-jobs.ts` and `foundation-render.ts`). */
import { serveRenderJobs } from "./foundation-render";
import { MAKEUP_RUNNERS } from "./makeup-render-jobs";

serveRenderJobs(MAKEUP_RUNNERS);
