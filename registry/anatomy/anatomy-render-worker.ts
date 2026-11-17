/** The module worker that runs ANAT1's render jobs (see `anatomy-render-jobs.ts` and `foundation-render.ts`). */
import { serveRenderJobs } from "./foundation-render";
import { ANATOMY_RUNNERS } from "./anatomy-render-jobs";

serveRenderJobs(ANATOMY_RUNNERS);
