/** The module worker that runs SKY1's render jobs (see `sky-render-jobs.ts`). */
import { serveRenderJobs } from "../anatomy/foundation-render";
import { SKY_RUNNERS } from "./sky-render-jobs";

serveRenderJobs(SKY_RUNNERS);
