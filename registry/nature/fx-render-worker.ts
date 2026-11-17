/** The module worker that runs FX1's render jobs (see `fx-render-jobs.ts`). */
import { serveRenderJobs } from "../anatomy/foundation-render";
import { FX_RUNNERS } from "./fx-render-jobs";

serveRenderJobs(FX_RUNNERS);
