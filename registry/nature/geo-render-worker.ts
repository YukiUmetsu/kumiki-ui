/** The module worker that runs GEO1's render jobs (see `geo-render-jobs.ts`). */
import { serveRenderJobs } from "../anatomy/foundation-render";
import { GEO_RUNNERS } from "./geo-render-jobs";

serveRenderJobs(GEO_RUNNERS);
