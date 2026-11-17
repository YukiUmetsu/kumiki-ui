/** The module worker that runs INTERIOR1's render jobs (see `furn-paint-jobs.ts`). */
import { serveRenderJobs } from "./foundation-render";
import { FURN_RUNNERS } from "./furn-paint-jobs";

serveRenderJobs(FURN_RUNNERS);
