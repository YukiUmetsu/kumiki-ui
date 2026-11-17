/** The module worker that runs ARCH1's render jobs (see `arch-paint-jobs.ts`). */
import { serveRenderJobs } from "./foundation-render";
import { ARCH_RUNNERS } from "./arch-paint-jobs";

serveRenderJobs(ARCH_RUNNERS);
