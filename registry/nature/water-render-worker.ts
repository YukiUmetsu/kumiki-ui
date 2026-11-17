/** The module worker that runs WATER1's render jobs (see `water-render-jobs.ts`). */
import { serveRenderJobs } from "../anatomy/foundation-render";
import { WATER_RUNNERS } from "./water-render-jobs";

serveRenderJobs(WATER_RUNNERS);
