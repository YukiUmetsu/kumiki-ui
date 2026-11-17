/** The module worker that runs MATL1's render jobs (see `materials-render-jobs.ts`). */
import { serveRenderJobs } from "../anatomy/foundation-render";
import { MATERIALS_RUNNERS } from "./materials-render-jobs";

serveRenderJobs(MATERIALS_RUNNERS);
